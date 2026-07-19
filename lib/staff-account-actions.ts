"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  audit,
  auditForUser,
  authRateLimited,
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  normalizeEmail,
  passwordError,
  requestAuditContext,
  verifyPassword,
} from "@/lib/auth";
import { staffHref } from "@/lib/account-routing";
import type { Locale } from "@/i18n/routing";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function localeFrom(formData: FormData): Locale {
  const locale = text(formData, "locale");
  return locale === "en" || locale === "ru" ? locale : "fi";
}

function adminReturn(formData: FormData) {
  const path = text(formData, "returnTo");
  return /^\/(?:en\/|ru\/)?admin\/henkilosto(?:\/|$)/.test(path)
    ? path
    : "/admin/henkilosto";
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/kirjaudu");
  return user;
}

export async function staffLoginAction(formData: FormData) {
  const locale = localeFrom(formData);
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const context = await requestAuditContext();
  const user = await prisma.user.findUnique({ where: { email } });
  const blocked = await authRateLimited(
    email,
    "staff_login",
    context.ipAddress,
  );
  const valid =
    !blocked &&
    user?.role === "STAFF" &&
    user.status === "ACTIVE" &&
    (await verifyPassword(password, user.passwordHash));

  if (!valid) {
    await audit({
      actor: email || "unknown",
      actorUserId: user?.id,
      actorRole: user?.role,
      action: "staff_login",
      outcome: blocked ? "DENIED" : "FAILURE",
      entity: "User",
      entityId: user?.id,
      ...context,
    });
    redirect(`${staffHref(locale, "login")}?error=invalid`);
  }

  await createSession(user.id);
  await audit({
    actor: user.email,
    actorUserId: user.id,
    actorRole: user.role,
    action: "staff_login",
    entity: "User",
    entityId: user.id,
    ...context,
  });
  redirect(
    user.mustChangePassword ? staffHref(locale, "password") : staffHref(locale),
  );
}

export async function staffLogoutAction(formData: FormData) {
  const locale = localeFrom(formData);
  const user = await currentUser();
  if (user?.role === "STAFF")
    await auditForUser(user, "staff_logout", "User", user.id);
  await destroySession();
  redirect(staffHref(locale, "login"));
}

export async function changeStaffPasswordAction(formData: FormData) {
  const locale = localeFrom(formData);
  const user = await currentUser();
  if (!user || user.role !== "STAFF") redirect(staffHref(locale, "login"));
  const currentPassword = text(formData, "currentPassword");
  const nextPassword = text(formData, "password");
  const confirm = text(formData, "confirmPassword");
  const stored = await prisma.user.findUnique({ where: { id: user.id } });
  if (
    !stored ||
    !(await verifyPassword(currentPassword, stored.passwordHash)) ||
    passwordError(nextPassword) ||
    nextPassword !== confirm ||
    currentPassword === nextPassword
  ) {
    await auditForUser(user, "staff_password_change", "User", user.id, {
      outcome: "FAILURE",
    });
    redirect(`${staffHref(locale, "password")}?error=invalid`);
  }

  const passwordHash = await hashPassword(nextPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await auditForUser(user, "staff_password_change", "User", user.id);
  await createSession(user.id);
  redirect(`${staffHref(locale)}?password=changed`);
}

export async function createStaffAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const returnTo = adminReturn(formData);
  const email = normalizeEmail(text(formData, "email"));
  const name = text(formData, "name");
  const practitionerId = text(formData, "practitionerId");
  const password = text(formData, "temporaryPassword");
  const locale = localeFrom(formData);
  if (
    !email.includes("@") ||
    !name ||
    !practitionerId ||
    passwordError(password)
  )
    redirect(`${returnTo}?error=validation`);
  const [existing, practitioner] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.practitioner.findUnique({
      where: { id: practitionerId },
      include: { staff: true },
    }),
  ]);
  if (existing || !practitioner || practitioner.staff)
    redirect(`${returnTo}?error=duplicate`);

  const created = await prisma.user.create({
    data: {
      email,
      name,
      locale,
      role: "STAFF",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
      passwordHash: await hashPassword(password),
      staff: { create: { practitionerId, daysOff: [] } },
    },
  });
  await auditForUser(admin, "staff_account_created", "User", created.id, {
    metadata: { practitionerId },
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function resetStaffPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const returnTo = adminReturn(formData);
  const id = text(formData, "id");
  const password = text(formData, "temporaryPassword");
  if (!id || passwordError(password)) redirect(`${returnTo}?error=validation`);
  const changed = await prisma.user.updateMany({
    where: { id, role: "STAFF" },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    },
  });
  if (!changed.count) redirect(`${returnTo}?error=not_found`);
  const revoked = await prisma.session.deleteMany({ where: { userId: id } });
  await auditForUser(admin, "staff_password_reset", "User", id, {
    metadata: { revokedSessions: revoked.count },
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function setStaffStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const returnTo = adminReturn(formData);
  const id = text(formData, "id");
  const status = text(formData, "status") === "ACTIVE" ? "ACTIVE" : "DISABLED";
  const changed = await prisma.user.updateMany({
    where: { id, role: "STAFF" },
    data: { status },
  });
  if (!changed.count) redirect(`${returnTo}?error=not_found`);
  const revoked =
    status === "DISABLED"
      ? await prisma.session.deleteMany({ where: { userId: id } })
      : { count: 0 };
  await auditForUser(
    admin,
    status === "ACTIVE"
      ? "staff_account_reactivated"
      : "staff_account_disabled",
    "User",
    id,
    { metadata: { revokedSessions: revoked.count } },
  );
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function revokeStaffSessionsAction(formData: FormData) {
  const admin = await requireAdmin();
  const returnTo = adminReturn(formData);
  const id = text(formData, "id");
  const target = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
  if (!target) redirect(`${returnTo}?error=not_found`);
  const revoked = await prisma.session.deleteMany({ where: { userId: id } });
  await auditForUser(admin, "staff_sessions_revoked", "User", id, {
    metadata: { revokedSessions: revoked.count },
  });
  redirect(`${returnTo}?saved=1`);
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  audit,
  auditForUser,
  authRateLimited,
  createAccountToken,
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  normalizeEmail,
  passwordError,
  requestAuditContext,
  validAccountToken,
  verifyPassword,
} from "@/lib/auth";
import { normalizeInternationalPhone } from "@/lib/phone";
import { accountHref } from "@/lib/account-routing";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import { sendEmail } from "@/lib/notifications";
import { renderAccountActionEmail } from "@/lib/email";
import type { Locale } from "@/i18n/routing";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function localeFrom(formData: FormData): Locale {
  const locale = text(formData, "locale");
  return locale === "en" || locale === "ru" ? locale : "fi";
}
function accountUrl(
  locale: Locale,
  segment?: Parameters<typeof accountHref>[1],
) {
  return absoluteLocalizedUrl(
    siteUrl(),
    accountHref(locale, segment).replace(/^\/(?:en|ru)(?=\/)/, ""),
    locale,
  );
}

export async function registerClientAction(formData: FormData) {
  const locale = localeFrom(formData);
  const email = normalizeEmail(text(formData, "email"));
  const fullName = text(formData, "fullName");
  const phone = normalizeInternationalPhone(text(formData, "phone"));
  const password = text(formData, "password");
  const confirm = text(formData, "confirmPassword");
  const consent = formData.get("consentGdpr") === "on";
  const claim = text(formData, "claim");
  const context = await requestAuditContext();
  if (await authRateLimited(email, "client_registration", context.ipAddress))
    redirect(`${accountHref(locale, "register")}?error=rate`);
  const claimToken = claim
    ? await validAccountToken(claim, "CLAIM_APPOINTMENT")
    : null;
  if (
    !email.includes("@") ||
    !fullName ||
    !phone ||
    passwordError(password) ||
    password !== confirm ||
    !consent ||
    (claimToken && claimToken.email !== email)
  ) {
    await audit({
      actor: email || "unknown",
      action: "client_registration",
      outcome: "FAILURE",
      entity: "User",
      ...context,
    });
    redirect(
      `${accountHref(locale, "register")}?error=validation${claim ? `&claim=${encodeURIComponent(claim)}` : ""}`,
    );
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await audit({
      actor: email,
      actorUserId: existing.id,
      actorRole: existing.role,
      action: "client_registration",
      outcome: "FAILURE",
      entity: "User",
      entityId: existing.id,
      ...context,
    });
    redirect(
      `${accountHref(locale, "login")}?notice=check_email${claim ? `&claim=${encodeURIComponent(claim)}` : ""}`,
    );
  }
  const user = await prisma.user.create({
    data: {
      email,
      name: fullName,
      locale,
      role: "CLIENT",
      status: "PENDING_VERIFICATION",
      passwordHash: await hashPassword(password),
      client: { create: { fullName, phone, email, consentGdpr: true } },
    },
  });
  const verify = await createAccountToken({
    userId: user.id,
    email,
    purpose: "VERIFY_EMAIL",
    ttlMs: 24 * 60 * 60 * 1000,
  });
  const verifyUrl = `${accountUrl(locale, "verify")}?token=${encodeURIComponent(verify)}${claim ? `&claim=${encodeURIComponent(claim)}` : ""}`;
  const verificationEmail = renderAccountActionEmail({
    locale,
    kind: "verification",
    href: verifyUrl,
    name: fullName,
  });
  await sendEmail({
    to: email,
    ...verificationEmail,
    idempotencyKey: `client-verify:${user.id}`,
  });
  await audit({
    actor: email,
    actorUserId: user.id,
    actorRole: "CLIENT",
    action: "client_registration",
    entity: "User",
    entityId: user.id,
    ...context,
  });
  redirect(`${accountHref(locale, "login")}?notice=check_email`);
}

export async function verifyClientEmailAction(formData: FormData) {
  const locale = localeFrom(formData);
  const raw = text(formData, "token");
  const claim = text(formData, "claim");
  const token = await validAccountToken(raw, "VERIFY_EMAIL");
  if (!token?.userId)
    redirect(`${accountHref(locale, "verify")}?error=invalid`);
  const user = await prisma.$transaction(async (tx) => {
    const consumed = await tx.accountToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (!consumed.count) return null;
    return tx.user.update({
      where: { id: token.userId! },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });
  });
  if (!user) redirect(`${accountHref(locale, "verify")}?error=invalid`);
  await audit({
    actor: user.email,
    actorUserId: user.id,
    actorRole: user.role,
    action: "client_email_verified",
    entity: "User",
    entityId: user.id,
  });
  await createSession(user.id);
  if (claim)
    redirect(
      `${accountHref(locale, "claim")}?token=${encodeURIComponent(claim)}`,
    );
  redirect(accountHref(locale));
}

export async function clientLoginAction(formData: FormData) {
  const locale = localeFrom(formData);
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const claim = text(formData, "claim");
  const context = await requestAuditContext();
  const user = await prisma.user.findUnique({ where: { email } });
  const blocked = await authRateLimited(
    email,
    "client_login",
    context.ipAddress,
  );
  const valid =
    !blocked &&
    user?.role === "CLIENT" &&
    user.status === "ACTIVE" &&
    Boolean(user.emailVerifiedAt) &&
    (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    await audit({
      actor: email || "unknown",
      actorUserId: user?.id,
      actorRole: user?.role,
      action: "client_login",
      outcome: blocked ? "DENIED" : "FAILURE",
      entity: "User",
      entityId: user?.id,
      ...context,
    });
    redirect(
      `${accountHref(locale, "login")}?error=invalid${claim ? `&claim=${encodeURIComponent(claim)}` : ""}`,
    );
  }
  await createSession(user.id);
  await audit({
    actor: user.email,
    actorUserId: user.id,
    actorRole: user.role,
    action: "client_login",
    entity: "User",
    entityId: user.id,
    ...context,
  });
  redirect(
    claim
      ? `${accountHref(locale, "claim")}?token=${encodeURIComponent(claim)}`
      : accountHref(locale),
  );
}

export async function clientLogoutAction(formData: FormData) {
  const locale = localeFrom(formData);
  const user = await currentUser();
  if (user?.role === "CLIENT")
    await auditForUser(user, "client_logout", "User", user.id);
  await destroySession();
  redirect(accountHref(locale, "login"));
}

export async function requestClientPasswordResetAction(formData: FormData) {
  const locale = localeFrom(formData);
  const email = normalizeEmail(text(formData, "email"));
  const context = await requestAuditContext();
  const user = await prisma.user.findFirst({
    where: { email, role: "CLIENT", status: "ACTIVE" },
  });
  if (
    user &&
    !(await authRateLimited(
      email,
      "client_password_reset_requested",
      context.ipAddress,
    ))
  ) {
    await prisma.accountToken.deleteMany({
      where: { userId: user.id, purpose: "RESET_PASSWORD", consumedAt: null },
    });
    const token = await createAccountToken({
      userId: user.id,
      email,
      purpose: "RESET_PASSWORD",
      ttlMs: 60 * 60 * 1000,
    });
    const url = `${accountUrl(locale, "reset")}?token=${encodeURIComponent(token)}`;
    const passwordResetEmail = renderAccountActionEmail({
      locale,
      kind: "password-reset",
      href: url,
      name: user.name,
    });
    await sendEmail({
      to: email,
      ...passwordResetEmail,
      idempotencyKey: `client-reset:${user.id}:${Date.now()}`,
    });
    await audit({
      actor: email,
      actorUserId: user.id,
      actorRole: user.role,
      action: "client_password_reset_requested",
      entity: "User",
      entityId: user.id,
      ...context,
    });
  }
  redirect(`${accountHref(locale, "forgot")}?sent=1`);
}

export async function resetClientPasswordAction(formData: FormData) {
  const locale = localeFrom(formData);
  const raw = text(formData, "token");
  const password = text(formData, "password");
  const confirm = text(formData, "confirmPassword");
  const token = await validAccountToken(raw, "RESET_PASSWORD");
  if (!token?.userId || passwordError(password) || password !== confirm)
    redirect(
      `${accountHref(locale, "reset")}?error=invalid&token=${encodeURIComponent(raw)}`,
    );
  const passwordHash = await hashPassword(password);
  const changed = await prisma.$transaction(async (tx) => {
    const consumed = await tx.accountToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (!consumed.count) return null;
    await tx.session.deleteMany({ where: { userId: token.userId! } });
    return tx.user.update({
      where: { id: token.userId! },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  });
  if (!changed) redirect(`${accountHref(locale, "reset")}?error=invalid`);
  await audit({
    actor: changed.email,
    actorUserId: changed.id,
    actorRole: changed.role,
    action: "client_password_reset",
    entity: "User",
    entityId: changed.id,
  });
  redirect(`${accountHref(locale, "login")}?notice=password_changed`);
}

export async function claimAppointmentAction(formData: FormData) {
  const locale = localeFrom(formData);
  const raw = text(formData, "token");
  const user = await currentUser();
  if (!user || user.role !== "CLIENT")
    redirect(
      `${accountHref(locale, "login")}?claim=${encodeURIComponent(raw)}`,
    );
  const token = await validAccountToken(raw, "CLAIM_APPOINTMENT");
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!token?.appointmentId || !client || token.email !== user.email)
    redirect(`${accountHref(locale, "claim")}?error=invalid`);
  const claimed = await prisma.$transaction(async (tx) => {
    const consumed = await tx.accountToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (!consumed.count) return null;
    return tx.appointment.update({
      where: { id: token.appointmentId! },
      data: { clientId: client.id },
    });
  });
  if (!claimed) redirect(`${accountHref(locale, "claim")}?error=invalid`);
  await auditForUser(user, "appointment_claimed", "Appointment", claimed.id);
  redirect(`${accountHref(locale)}?claimed=1`);
}

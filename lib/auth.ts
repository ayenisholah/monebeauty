import "server-only";

import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AccountTokenPurpose,
  AuditOutcome,
  Role,
  User,
} from "@prisma/client";
import { prisma } from "@/lib/db";

const scryptAsync = promisify(scrypt);
const LEGACY_SESSION_COOKIE = "mone_session";
const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-mone_session"
    : LEGACY_SESSION_COOKIE;
const SESSION_DAYS = 14;

export type AuthUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "role"
  | "status"
  | "mustChangePassword"
  | "emailVerifiedAt"
>;

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function passwordError(password: string): string | null {
  if (password.length < 12) return "password_too_short";
  if (password.length > 128) return "password_too_long";
  return null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored?: string | null) {
  if (!stored) return false;
  const [method, salt, value] = stored.split(":");
  if (method !== "scrypt" || !salt || !value) return false;
  const expected = Buffer.from(value, "hex");
  const derived = (await scryptAsync(
    password,
    salt,
    expected.length,
  )) as Buffer;
  return (
    expected.length === derived.length && timingSafeEqual(expected, derived)
  );
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId, tokenHash: tokenHash(token), expiresAt },
  });
  const jar = await cookies();
  if (SESSION_COOKIE !== LEGACY_SESSION_COOKIE) {
    // Clear cookies issued by older deployments. A stale cookie with the same
    // name but a different path can otherwise shadow a newly issued session.
    jar.set(LEGACY_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    jar.set(LEGACY_SESSION_COOKIE, "", { path: "/admin", maxAge: 0 });
  }
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeUserSessions(userId: string, exceptId?: string) {
  return prisma.session.deleteMany({
    where: { userId, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
  jar.set(SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  if (SESSION_COOKIE !== LEGACY_SESSION_COOKIE) {
    jar.set(LEGACY_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    jar.set(LEGACY_SESSION_COOKIE, "", { path: "/admin", maxAge: 0 });
  }
}

export async function currentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          mustChangePassword: true,
          emailVerifiedAt: true,
        },
      },
    },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  ) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    jar.set(SESSION_COOKIE, "", {
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });
  return session.user;
}

export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (roles && !roles.includes(user.role)) redirect("/admin/login");
  return user;
}

export async function requireApiUser(roles?: Role[]) {
  const user = await currentUser();
  if (
    !user ||
    (roles && !roles.includes(user.role)) ||
    (user.role === "STAFF" && user.mustChangePassword)
  )
    return null;
  return user;
}

export async function audit({
  actor,
  actorUserId,
  actorRole,
  action,
  outcome = "SUCCESS",
  entity,
  entityId,
  ipAddress,
  userAgent,
  metadata,
}: {
  actor: string;
  actorUserId?: string | null;
  actorRole?: Role | null;
  action: string;
  outcome?: AuditOutcome;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
}) {
  await prisma.auditLog.create({
    data: {
      actor,
      actorUserId,
      actorRole,
      action,
      outcome,
      entity,
      entityId,
      ipAddress,
      userAgent,
      metadata: metadata ?? undefined,
    },
  });
}

export async function requestAuditContext(request?: Request) {
  const source = request?.headers ?? (await headers());
  const forwarded = source.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress:
      (forwarded || source.get("x-real-ip") || "").slice(0, 64) || null,
    userAgent: source.get("user-agent")?.slice(0, 500) || null,
  };
}

export async function auditForUser(
  user: AuthUser,
  action: string,
  entity: string,
  entityId?: string | null,
  options?: {
    outcome?: AuditOutcome;
    request?: Request;
    metadata?: Record<string, string | number | boolean | null>;
  },
) {
  const context = await requestAuditContext(options?.request);
  return audit({
    actor: user.email,
    actorUserId: user.id,
    actorRole: user.role,
    action,
    outcome: options?.outcome,
    entity,
    entityId,
    metadata: options?.metadata,
    ...context,
  });
}

export async function authRateLimited(
  actor: string,
  action: string,
  ipAddress: string | null,
) {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const failures = await prisma.auditLog.count({
    where: {
      action,
      outcome: { in: ["FAILURE", "DENIED"] },
      at: { gte: since },
      OR: [{ actor }, ...(ipAddress ? [{ ipAddress }] : [])],
    },
  });
  return failures >= 5;
}

export async function createAccountToken({
  userId,
  email,
  purpose,
  appointmentId,
  ttlMs,
}: {
  userId?: string | null;
  email: string;
  purpose: AccountTokenPurpose;
  appointmentId?: string | null;
  ttlMs: number;
}) {
  const token = randomBytes(32).toString("base64url");
  await prisma.accountToken.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      email: normalizeEmail(email),
      purpose,
      appointmentId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}

export async function validAccountToken(
  token: string,
  purpose: AccountTokenPurpose,
) {
  if (!token) return null;
  return prisma.accountToken.findFirst({
    where: {
      tokenHash: tokenHash(token),
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

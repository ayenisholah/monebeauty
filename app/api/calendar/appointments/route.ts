import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiUser, createAccountToken, auditForUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { overlapsWhere, staffPractitionerId } from "@/lib/calendar-scheduling";
import {
  availabilityCovers,
  generateStaffSlots,
  parseWorkingHours,
} from "@/lib/staff-schedule";
import { normalizeInternationalPhone } from "@/lib/phone";
import { parseProcedures, resolveProcedure } from "@/lib/procedures";
import { notifyAppointmentConfirmation, sendEmail } from "@/lib/notifications";
import { accountHref } from "@/lib/account-routing";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";
import { lockAndFindReservationConflict } from "@/lib/calendar-blocks";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function localeFrom(value: unknown): Locale {
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}

export async function GET(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return bad("forbidden", 403);
  const ownPractitionerId = await staffPractitionerId(user);
  if (user.role === "STAFF" && !ownPractitionerId)
    return bad("staff_not_linked", 403);
  const locale = localeFrom(req.nextUrl.searchParams.get("locale"));
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);

  const [services, practitioners, rooms, devices, clients] = await Promise.all([
    prisma.service.findMany({
      where: {
        bookable: true,
        archivedAt: null,
        contents: { some: { locale, status: "PUBLISHED" } },
      },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      include: {
        contents: {
          where: { locale, status: "PUBLISHED" },
          take: 1,
          select: { h1: true, whatItIs: true },
        },
        practitioners: { where: { active: true }, select: { id: true } },
        rooms: { where: { active: true }, select: { id: true } },
        devices: { where: { active: true }, select: { id: true } },
      },
    }),
    prisma.practitioner.findMany({
      where:
        user.role === "STAFF"
          ? { active: true, id: ownPractitionerId! }
          : { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, workingHours: true },
    }),
    prisma.room.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.device.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    q.length >= 2
      ? prisma.client.findMany({
          where: {
            archivedAt: null,
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: { id: true, fullName: true, phone: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    services: services.map((service) => ({
      id: service.id,
      slug: service.slug,
      title: service.contents[0]?.h1 ?? service.slug,
      durationMin: service.durationMin,
      requiresDevice: service.requiresDevice,
      qualifiedPractitionerIds: Array.from(
        new Set(
          [
            service.primaryPractitionerId,
            ...service.practitioners.map((item) => item.id),
          ].filter((id): id is string => Boolean(id)),
        ),
      ),
      roomIds: service.rooms.map((item) => item.id),
      deviceIds: service.devices.map((item) => item.id),
      procedures: parseProcedures(service.contents[0]?.whatItIs ?? "").map(
        (procedure, index) => ({
          index: index + 1,
          title: procedure.title,
          price: procedure.price,
        }),
      ),
    })),
    practitioners: practitioners.map((practitioner) => ({
      ...practitioner,
      workingHours: parseWorkingHours(practitioner.workingHours),
    })),
    rooms,
    devices,
    clients,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return bad("forbidden", 403);
  const ownPractitionerId = await staffPractitionerId(user);
  if (user.role === "STAFF" && !ownPractitionerId)
    return bad("staff_not_linked", 403);
  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!payload) return bad("invalid_json");
  if (payload.consentGdpr !== true) return bad("consent_required");

  const locale = localeFrom(payload.locale);
  const start = new Date(String(payload.start ?? ""));
  if (Number.isNaN(start.getTime())) return bad("invalid_time");
  if (start.getTime() <= Date.now()) return bad("start_in_past");
  if (start.getUTCMinutes() % 15 !== 0 || start.getUTCSeconds() !== 0)
    return bad("invalid_time");

  const service = await prisma.service.findFirst({
    where: {
      id: String(payload.serviceId ?? ""),
      bookable: true,
      archivedAt: null,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    include: {
      contents: {
        where: { locale, status: "PUBLISHED" },
        take: 1,
        select: { whatItIs: true },
      },
      practitioners: { where: { active: true }, select: { id: true } },
      rooms: { where: { active: true }, select: { id: true } },
      devices: { where: { active: true }, select: { id: true } },
    },
  });
  if (!service) return bad("unknown_service");

  const practitionerId = String(payload.practitionerId ?? "");
  if (user.role === "STAFF" && practitionerId !== ownPractitionerId)
    return bad("forbidden_employee", 403);
  const qualified = new Set(
    [
      service.primaryPractitionerId,
      ...service.practitioners.map((item) => item.id),
    ].filter((id): id is string => Boolean(id)),
  );
  if (!qualified.has(practitionerId)) return bad("invalid_employee", 409);
  const roomId = String(payload.roomId ?? "");
  if (!service.rooms.some((room) => room.id === roomId))
    return bad("invalid_room", 409);
  const deviceId = String(payload.deviceId ?? "") || null;
  if (service.requiresDevice && !deviceId) return bad("device_required", 409);
  if (deviceId && !service.devices.some((device) => device.id === deviceId))
    return bad("invalid_device", 409);

  const procedureRequested =
    payload.procedureIndex !== undefined && payload.procedureIndex !== null;
  const procedure = procedureRequested
    ? resolveProcedure(
        service.contents[0]?.whatItIs ?? "",
        payload.procedureIndex,
      )
    : null;
  if (procedureRequested && !procedure) return bad("invalid_procedure");
  const end = new Date(start.getTime() + service.durationMin * 60_000);
  const date = new Date(`${start.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const availability = await prisma.availability.findUnique({
    where: { practitionerId_date: { practitionerId, date } },
    select: { slots: true },
  });
  const coverage =
    availability?.slots ?? generateStaffSlots(start.toISOString().slice(0, 10));
  if (!availabilityCovers(coverage, start, end))
    return bad("outside_availability", 409);

  const baseOverlap = overlapsWhere(start, end);
  const clash = await prisma.appointment.findFirst({
    where: {
      ...baseOverlap,
      OR: [{ practitionerId }, { roomId }, ...(deviceId ? [{ deviceId }] : [])],
    },
    select: { id: true },
  });
  if (clash) return bad("slot_taken", 409);

  const existingClientId = String(payload.clientId ?? "");
  const newClient = (payload.newClient ?? {}) as Record<string, unknown>;
  const fullName = String(newClient.fullName ?? "")
    .trim()
    .slice(0, 160);
  const email = String(newClient.email ?? "")
    .trim()
    .toLowerCase();
  const phone = normalizeInternationalPhone(String(newClient.phone ?? ""));
  if (!existingClientId && (!fullName || !EMAIL_RE.test(email) || !phone))
    return bad("client_invalid");
  const notes =
    String(payload.notes ?? "")
      .trim()
      .slice(0, 2000) || null;

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const reservationConflict = await lockAndFindReservationConflict(tx, { start, end, practitionerIds: [practitionerId], roomId, deviceId });
      if (reservationConflict) throw new Error("slot_taken");
      let client = existingClientId
        ? await tx.client.findFirst({
            where: { id: existingClientId, archivedAt: null },
          })
        : null;
      if (!client && existingClientId) throw new Error("client_not_found");
      if (!client) {
        client = await tx.client.findFirst({
          where: {
            archivedAt: null,
            OR: [{ email }, { phone: phone! }],
          },
        });
      }
      if (client) {
        client = await tx.client.update({
          where: { id: client.id },
          data: { consentGdpr: true },
        });
      } else {
        client = await tx.client.create({
          data: { fullName, email, phone: phone!, consentGdpr: true },
        });
      }
      await tx.consent.create({
        data: {
          clientId: client.id,
          type: "gdpr_booking_staff",
          granted: true,
        },
      });
      const created = await tx.appointment.create({
        data: {
          clientId: client.id,
          serviceId: service.id,
          practitionerId,
          roomId,
          deviceId,
          locale,
          start,
          end,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          channel: "staff",
          notes,
          procedureIndex: procedure?.index ?? null,
          procedureTitle: procedure?.procedure.title ?? null,
          procedurePrice: procedure?.procedure.price ?? null,
        },
        include: {
          client: {
            select: { fullName: true, email: true, phone: true, userId: true },
          },
          service: { select: { slug: true } },
          practitioner: { select: { name: true } },
        },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: created.id,
          kind: "CREATED",
          actor: user.email,
          nextStatus: "CONFIRMED",
          nextStart: start,
          nextEnd: end,
          changes: { channel: "staff", practitionerId, roomId, deviceId },
        },
      });
      return created;
    });

    await auditForUser(
      user,
      "appointment_created",
      "Appointment",
      appointment.id,
      {
        request: req,
      },
    );
    try {
      await notifyAppointmentConfirmation(appointment, locale, user.email);
    } catch {
      await auditForUser(
        user,
        "appointment_confirmation_unhandled_error",
        "Appointment",
        appointment.id,
        { outcome: "FAILURE", request: req },
      );
    }
    if (!appointment.client.userId) {
      try {
        const token = await createAccountToken({
          email: appointment.client.email,
          purpose: "CLAIM_APPOINTMENT",
          appointmentId: appointment.id,
          ttlMs: 7 * 24 * 60 * 60 * 1000,
        });
        const path = accountHref(locale, "claim").replace(
          /^\/(?:en|ru)(?=\/)/,
          "",
        );
        const url = `${absoluteLocalizedUrl(siteUrl(), path, locale)}?token=${encodeURIComponent(token)}`;
        await sendEmail({
          to: appointment.client.email,
          subject: "Mone Beauty · add appointment to your account",
          text: `Add this appointment to your secure client account:\n\n${url}`,
          idempotencyKey: `appointment-claim:${appointment.id}`,
        });
      } catch {
        await auditForUser(
          user,
          "appointment_claim_link_failed",
          "Appointment",
          appointment.id,
          { outcome: "FAILURE", request: req },
        );
      }
    }
    return NextResponse.json({
      id: appointment.id,
      status: appointment.status,
      start: appointment.start.toISOString(),
      end: appointment.end.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "client_not_found")
      return bad("client_not_found", 404);
    if (error instanceof Error && error.message === "slot_taken")
      return bad("slot_taken", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      return bad("slot_taken", 409);
    throw error;
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auditForUser, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calendarUpdatedChanges,
  overlapsWhere,
  staffPractitionerId,
  type CalendarConflict,
} from "@/lib/calendar-scheduling";
import { availabilityCovers, generateStaffSlots } from "@/lib/staff-schedule";
import {
  notifyAppointmentChange,
  notifyAppointmentConfirmation,
} from "@/lib/notifications";
import { resolveProcedure } from "@/lib/procedures";
import { routing, type Locale } from "@/i18n/routing";
import { lockAndFindReservationConflict } from "@/lib/calendar-blocks";

function conflict(error: CalendarConflict | string, status = 409) {
  return NextResponse.json({ error }, { status });
}

const include = {
  client: { select: { fullName: true, email: true, phone: true } },
  practitioner: { select: { name: true } },
  service: {
    include: {
      contents: { select: { locale: true, status: true, whatItIs: true } },
      practitioners: { where: { active: true }, select: { id: true } },
      rooms: { where: { active: true }, select: { id: true } },
      devices: { where: { active: true }, select: { id: true } },
    },
  },
} satisfies Prisma.AppointmentInclude;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return conflict("forbidden", 403);
  const { id } = await params;
  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!payload) return conflict("invalid_json", 400);
  const intent = String(payload.intent ?? "schedule");
  const expectedVersion = Number(payload.version);

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include,
  });
  if (!appointment) return conflict("not_found", 404);
  const ownPractitionerId = await staffPractitionerId(user);
  if (user.role === "STAFF" && (!ownPractitionerId || appointment.practitionerId !== ownPractitionerId))
    return conflict("forbidden_employee", 403);
  if (!Number.isSafeInteger(expectedVersion)) return conflict("stale");

  if (["confirm", "complete", "cancel"].includes(intent)) {
    return lifecycle({
      req,
      user,
      appointment,
      intent,
      expectedVersion,
      payload,
    });
  }
  if (!["schedule", "details"].includes(intent))
    return conflict("invalid_action", 400);
  if (!["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(appointment.status))
    return conflict("not_movable");

  const locale = routing.locales.includes(payload.locale as Locale)
    ? (payload.locale as Locale)
    : (appointment.locale as Locale);
  const serviceId =
    intent === "details"
      ? String(payload.serviceId ?? appointment.serviceId)
      : appointment.serviceId;
  const service =
    serviceId === appointment.serviceId
      ? appointment.service
      : await prisma.service.findFirst({
          where: {
            id: serviceId,
            bookable: true,
            archivedAt: null,
            contents: { some: { locale, status: "PUBLISHED" } },
          },
          include: {
            contents: {
              select: { locale: true, status: true, whatItIs: true },
            },
            practitioners: { where: { active: true }, select: { id: true } },
            rooms: { where: { active: true }, select: { id: true } },
            devices: { where: { active: true }, select: { id: true } },
          },
        });
  if (!service) return conflict("unknown_service", 400);
  const content = service.contents.find(
    (row) => row.locale === locale && row.status === "PUBLISHED",
  );
  if (!content) return conflict("unknown_service", 400);

  const start = new Date(
    String(payload.start ?? appointment.start.toISOString()),
  );
  if (Number.isNaN(start.getTime())) return conflict("invalid_time");
  if (start.getTime() <= Date.now()) return conflict("start_in_past");
  if (start.getUTCMinutes() % 15 !== 0 || start.getUTCSeconds() !== 0)
    return conflict("invalid_time");
  const duration = service.durationMin * 60_000;
  const end = new Date(start.getTime() + duration);
  const practitionerId = String(
    payload.practitionerId ?? appointment.practitionerId,
  );
  if (user.role === "STAFF" && practitionerId !== ownPractitionerId)
    return conflict("forbidden_employee", 403);
  const qualified = new Set(
    [
      service.primaryPractitionerId,
      ...service.practitioners.map((item) => item.id),
    ].filter((value): value is string => Boolean(value)),
  );
  if (!qualified.has(practitionerId)) return conflict("invalid_employee");

  const date = new Date(`${start.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const availability = await prisma.availability.findUnique({
    where: { practitionerId_date: { practitionerId, date } },
    select: { slots: true },
  });
  const coverage =
    availability?.slots ?? generateStaffSlots(start.toISOString().slice(0, 10));
  if (!availabilityCovers(coverage, start, end))
    return conflict("outside_availability");

  const roomId = String(payload.roomId ?? appointment.roomId ?? "") || null;
  if (!roomId || !service.rooms.some((item) => item.id === roomId))
    return conflict("invalid_room");
  const deviceId =
    String(payload.deviceId ?? appointment.deviceId ?? "") || null;
  if (service.requiresDevice && !deviceId) return conflict("device_required");
  if (deviceId && !service.devices.some((item) => item.id === deviceId))
    return conflict("invalid_device");

  const clientId =
    intent === "details"
      ? String(payload.clientId ?? appointment.clientId)
      : appointment.clientId;
  const client = await prisma.client.findFirst({
    where: { id: clientId, archivedAt: null },
    select: { id: true },
  });
  if (!client) return conflict("client_not_found", 404);
  const procedureRequested =
    intent === "details" &&
    payload.procedureIndex !== undefined &&
    payload.procedureIndex !== null &&
    payload.procedureIndex !== "";
  const procedure = procedureRequested
    ? resolveProcedure(content.whatItIs, payload.procedureIndex)
    : null;
  if (procedureRequested && !procedure)
    return conflict("invalid_procedure", 400);
  const procedureIndex =
    intent === "details"
      ? (procedure?.index ?? null)
      : appointment.procedureIndex;
  const procedureTitle =
    intent === "details"
      ? (procedure?.procedure.title ?? null)
      : appointment.procedureTitle;
  const procedurePrice =
    intent === "details"
      ? (procedure?.procedure.price ?? null)
      : appointment.procedurePrice;
  const notes =
    intent === "details"
      ? String(payload.notes ?? "")
          .trim()
          .slice(0, 2000) || null
      : appointment.notes;

  const baseOverlap = overlapsWhere(start, end, id);
  const [employeeOverlap, roomOverlap, deviceOverlap] = await Promise.all([
    prisma.appointment.findFirst({
      where: { ...baseOverlap, practitionerId },
      select: { id: true },
    }),
    prisma.appointment.findFirst({
      where: { ...baseOverlap, roomId },
      select: { id: true },
    }),
    deviceId
      ? prisma.appointment.findFirst({
          where: { ...baseOverlap, deviceId },
          select: { id: true },
        })
      : null,
  ]);
  if (employeeOverlap) return conflict("employee_overlap");
  if (roomOverlap) return conflict("room_overlap");
  if (deviceOverlap) return conflict("device_overlap");

  const previous = {
    start: appointment.start,
    end: appointment.end,
    practitionerId: appointment.practitionerId,
    roomId: appointment.roomId,
    deviceId: appointment.deviceId,
  };
  const next = { start, end, practitionerId, roomId, deviceId };
  const detailChanges = {
    previous: {
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      procedureIndex: appointment.procedureIndex,
      notes: appointment.notes,
      locale: appointment.locale,
    },
    next: { clientId, serviceId, procedureIndex, notes, locale },
  };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const reservationConflict = await lockAndFindReservationConflict(tx, { start, end, practitionerIds: [practitionerId], roomId, deviceId, excludeAppointmentId: id });
      if (reservationConflict) throw new Error("reservation_conflict");
      const changed = await tx.appointment.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...next,
          clientId,
          serviceId,
          procedureIndex,
          procedureTitle,
          procedurePrice,
          notes,
          locale,
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw new Error("stale");
      await tx.appointmentEvent.create({
        data: {
          appointmentId: id,
          kind: intent === "details" ? "DETAILS_UPDATED" : "CALENDAR_UPDATED",
          actor: user.email,
          previousStatus: appointment.status,
          nextStatus: appointment.status,
          previousStart: appointment.start,
          previousEnd: appointment.end,
          nextStart: start,
          nextEnd: end,
          changes:
            intent === "details"
              ? detailChanges
              : calendarUpdatedChanges({ previous, next }),
        },
      });
      return tx.appointment.findUniqueOrThrow({
        where: { id },
        include: {
          client: { select: { fullName: true, email: true, phone: true } },
          service: { select: { slug: true } },
        },
      });
    });
    await auditForUser(
      user,
      intent === "details"
        ? "appointment_details_updated"
        : "appointment_calendar_updated",
      "Appointment",
      id,
      { request: req },
    );
    const scheduleChanged =
      previous.start.getTime() !== start.getTime() ||
      previous.practitionerId !== practitionerId;
    const materialDetailsChanged =
      appointment.serviceId !== serviceId ||
      appointment.procedureIndex !== procedureIndex ||
      appointment.clientId !== clientId;
    if (scheduleChanged || materialDetailsChanged) {
      await notifyAppointmentChange(
        updated,
        "rescheduled",
        updated.locale as Locale,
        null,
        user.email,
        `v${updated.version}`,
      );
    }
    return NextResponse.json({
      id: updated.id,
      version: updated.version,
      status: updated.status,
      start: updated.start.toISOString(),
      end: updated.end.toISOString(),
      practitionerId: updated.practitionerId,
      roomId: updated.roomId,
      deviceId: updated.deviceId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "stale")
      return conflict("stale");
    if (error instanceof Error && error.message === "reservation_conflict")
      return conflict("employee_overlap");
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      return conflict("stale");
    throw error;
  }
}

async function lifecycle({
  req,
  user,
  appointment,
  intent,
  expectedVersion,
  payload,
}: {
  req: NextRequest;
  user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>>;
  appointment: Prisma.AppointmentGetPayload<{ include: typeof include }>;
  intent: string;
  expectedVersion: number;
  payload: Record<string, unknown>;
}) {
  const now = new Date();
  let nextStatus: "CONFIRMED" | "COMPLETED" | "CANCELLED";
  if (intent === "confirm") {
    if (!["BOOKED", "RESCHEDULED"].includes(appointment.status))
      return conflict("invalid_status");
    nextStatus = "CONFIRMED";
  } else if (intent === "complete") {
    if (appointment.status !== "CONFIRMED" || appointment.end > now)
      return conflict("invalid_status");
    nextStatus = "COMPLETED";
  } else {
    if (!["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(appointment.status))
      return conflict("invalid_status");
    nextStatus = "CANCELLED";
  }
  const reason = String(payload.reason ?? "")
    .trim()
    .slice(0, 500);
  if (nextStatus === "CANCELLED" && reason.length < 3)
    return conflict("reason_required", 400);

  const eventKind =
    nextStatus === "CONFIRMED"
      ? "CONFIRMED"
      : nextStatus === "COMPLETED"
        ? "COMPLETED"
        : "CANCELLED";
  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.appointment.updateMany({
        where: { id: appointment.id, version: expectedVersion },
        data: {
          status: nextStatus,
          version: { increment: 1 },
          ...(nextStatus === "CONFIRMED" ? { confirmedAt: now } : {}),
          ...(nextStatus === "COMPLETED" ? { completedAt: now } : {}),
          ...(nextStatus === "CANCELLED"
            ? { cancelledAt: now, cancellationReason: reason }
            : {}),
        },
      });
      if (!changed.count) throw new Error("stale");
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          kind: eventKind,
          actor: user.email,
          previousStatus: appointment.status,
          nextStatus,
          reason: reason || null,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "stale")
      return conflict("stale");
    throw error;
  }
  await auditForUser(
    user,
    `appointment_${nextStatus.toLowerCase()}`,
    "Appointment",
    appointment.id,
    { request: req },
  );
  const notificationAppointment = {
    ...appointment,
    status: nextStatus,
    version: expectedVersion + 1,
  };
  if (nextStatus === "CONFIRMED")
    await notifyAppointmentConfirmation(
      notificationAppointment,
      appointment.locale as Locale,
      user.email,
    );
  if (nextStatus === "CANCELLED")
    await notifyAppointmentChange(
      notificationAppointment,
      "cancellation",
      appointment.locale as Locale,
      reason,
      user.email,
      `v${expectedVersion + 1}`,
    );
  return NextResponse.json({
    id: appointment.id,
    version: expectedVersion + 1,
    status: nextStatus,
  });
}

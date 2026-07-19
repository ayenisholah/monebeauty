import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auditForUser, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calendarUpdatedChanges,
  overlapsWhere,
  type CalendarConflict,
} from "@/lib/calendar-scheduling";
import { availabilityCovers } from "@/lib/staff-schedule";
import { notifyAppointmentChange } from "@/lib/notifications";
import type { Locale } from "@/i18n/routing";

function conflict(error: CalendarConflict) {
  return NextResponse.json({ error }, { status: 409 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (user.role !== "ADMIN") {
    await auditForUser(user, "calendar_mutation_denied", "Appointment", null, {
      outcome: "DENIED",
      request: req,
    });
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!payload)
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      client: { select: { fullName: true, email: true, phone: true } },
      service: {
        include: {
          practitioners: { select: { id: true } },
          rooms: { where: { active: true }, select: { id: true } },
          devices: { where: { active: true }, select: { id: true } },
        },
      },
    },
  });
  if (!appointment)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(appointment.status))
    return conflict("not_movable");

  const start = new Date(String(payload.start ?? ""));
  if (Number.isNaN(start.getTime())) return conflict("invalid_time");
  const duration = appointment.end.getTime() - appointment.start.getTime();
  const end = new Date(start.getTime() + duration);
  const practitionerId = String(
    payload.practitionerId ?? appointment.practitionerId,
  );
  const qualified = new Set([
    appointment.service.primaryPractitionerId,
    ...appointment.service.practitioners.map((item) => item.id),
  ]);
  if (!qualified.has(practitionerId)) return conflict("invalid_employee");

  const date = new Date(`${start.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const availability = await prisma.availability.findUnique({
    where: { practitionerId_date: { practitionerId, date } },
    select: { slots: true },
  });
  if (availability && !availabilityCovers(availability.slots, start, end))
    return conflict("outside_availability");

  const roomId = String(payload.roomId ?? appointment.roomId ?? "") || null;
  const allowedRoomIds = new Set(
    appointment.service.rooms.map((item) => item.id),
  );
  if (!roomId || !allowedRoomIds.has(roomId)) return conflict("invalid_room");

  const deviceId =
    String(payload.deviceId ?? appointment.deviceId ?? "") || null;
  const allowedDeviceIds = new Set(
    appointment.service.devices.map((item) => item.id),
  );
  if (appointment.service.requiresDevice && !deviceId)
    return conflict("device_required");
  if (deviceId && !allowedDeviceIds.has(deviceId))
    return conflict("invalid_device");

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
  const expectedVersion = Number(payload.version);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.appointment.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...next,
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw new Error("stale");
      await tx.appointmentEvent.create({
        data: {
          appointmentId: id,
          kind: "CALENDAR_UPDATED",
          actor: user.email,
          previousStatus: appointment.status,
          nextStatus: appointment.status,
          previousStart: appointment.start,
          previousEnd: appointment.end,
          nextStart: start,
          nextEnd: end,
          changes: calendarUpdatedChanges({ previous, next }),
        },
      });
      await tx.auditLog.create({
        data: {
          actor: user.email,
          action: "appointment_calendar_updated",
          entity: "Appointment",
          entityId: id,
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

    const timeOrEmployeeChanged =
      previous.start.getTime() !== start.getTime() ||
      previous.practitionerId !== practitionerId;
    if (timeOrEmployeeChanged) {
      await notifyAppointmentChange(
        updated,
        "rescheduled",
        updated.locale as Locale,
        null,
        user.email,
      );
    }
    return NextResponse.json({
      id: updated.id,
      version: updated.version,
      start: updated.start.toISOString(),
      end: updated.end.toISOString(),
      practitionerId: updated.practitionerId,
      roomId: updated.roomId,
      deviceId: updated.deviceId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "stale")
      return conflict("stale");
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      return conflict("stale");
    throw error;
  }
}

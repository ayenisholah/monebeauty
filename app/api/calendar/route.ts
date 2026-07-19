import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeSlots } from "@/lib/staff-schedule";
import { staffPractitionerId } from "@/lib/calendar-scheduling";

export async function GET(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const from = new Date(String(params.get("from") ?? ""));
  const to = new Date(String(params.get("to") ?? ""));
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    to <= from ||
    to.getTime() - from.getTime() > 43 * 24 * 60 * 60 * 1000
  ) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const ownPractitionerId = await staffPractitionerId(user);
  if (user.role === "STAFF" && !ownPractitionerId)
    return NextResponse.json({ error: "staff_not_linked" }, { status: 403 });
  const practitionerWhere = user.role === "STAFF"
    ? { active: true, id: ownPractitionerId! }
    : { active: true };
  const [practitioners, rooms, devices, availabilities, appointments] =
    await Promise.all([
      prisma.practitioner.findMany({
        where: practitionerWhere,
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          role: true,
          calendarColor: true,
        },
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
      prisma.availability.findMany({
        where: {
          date: { gte: from, lt: to },
          practitioner: practitionerWhere,
        },
        select: { practitionerId: true, date: true, slots: true },
      }),
      prisma.appointment.findMany({
        where: {
          status: { not: "CANCELLED" },
          start: { lt: to },
          end: { gt: from },
          practitioner: practitionerWhere,
        },
        orderBy: { start: "asc" },
        include: {
          client: { select: { fullName: true } },
          service: {
            select: {
              slug: true,
              primaryPractitionerId: true,
              practitioners: { select: { id: true } },
              rooms: { where: { active: true }, select: { id: true } },
              devices: { where: { active: true }, select: { id: true } },
              requiresDevice: true,
            },
          },
          room: { select: { id: true, name: true } },
          device: { select: { id: true, name: true } },
        },
      }),
    ]);

  return NextResponse.json({
    practitioners,
    rooms,
    devices,
    ownPractitionerId,
    canManageAppointments: true,
    canEditAllAvailability: user.role === "ADMIN",
    canEditOwnAvailability: Boolean(ownPractitionerId),
    availabilities: availabilities.map((row) => ({
      practitionerId: row.practitionerId,
      date: row.date.toISOString().slice(0, 10),
      slots: normalizeSlots(row.slots),
    })),
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      version: appointment.version,
      practitionerId: appointment.practitionerId,
      start: appointment.start.toISOString(),
      end: appointment.end.toISOString(),
      status: appointment.status,
      clientName: appointment.client.fullName,
      procedure: appointment.procedureTitle ?? appointment.service.slug,
      room: appointment.room,
      device: appointment.device,
      roomId: appointment.roomId,
      deviceId: appointment.deviceId,
      qualifiedPractitionerIds: Array.from(
        new Set(
          [
            appointment.service.primaryPractitionerId,
            ...appointment.service.practitioners.map((item) => item.id),
          ].filter((id): id is string => Boolean(id)),
        ),
      ),
      allowedRoomIds: appointment.service.rooms.map((item) => item.id),
      allowedDeviceIds: appointment.service.devices.map((item) => item.id),
      requiresDevice: appointment.service.requiresDevice,
      editable: ["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(
        appointment.status,
      ),
    })),
  });
}

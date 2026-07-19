import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appointmentByReference, openSlots } from "@/lib/booking";
import { notifyAppointmentChange } from "@/lib/notifications";
import type { Locale } from "@/i18n/routing";

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function matchesContact(value: string, email: string, phone: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === email.toLowerCase() ||
    normalized.replace(/\s+/g, "") === phone.replace(/\s+/g, "")
  );
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const reference = String(payload.reference ?? "").trim();
  const contact = String(payload.contact ?? "").trim();
  const start = String(payload.start ?? "");
  if (!reference) return bad("reference_required");
  if (!contact) return bad("contact_required");
  if (!start || Number.isNaN(Date.parse(start))) return bad("invalid_start");

  const appointment = await appointmentByReference(reference);
  if (
    !appointment ||
    !matchesContact(contact, appointment.client.email, appointment.client.phone)
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (appointment.status === "CANCELLED") return bad("already_cancelled");

  const service = await prisma.service.findUnique({
    where: { id: appointment.serviceId },
    select: { slug: true },
  });
  if (!service) return bad("unknown_service");

  const available = await openSlots({
    dateStr: start.slice(0, 10),
    serviceKey: service.slug,
  });
  const matchingSlot = available.find((slot) => slot.start === start);
  if (!matchingSlot) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          start: new Date(matchingSlot.start),
          end: new Date(matchingSlot.end),
          practitionerId: matchingSlot.practitionerId,
          roomId: matchingSlot.roomId,
          deviceId: matchingSlot.deviceId,
          version: { increment: 1 },
          status: "BOOKED",
          confirmedAt: null,
          history: {
            rescheduledAt: new Date().toISOString(),
            previousStart: appointment.start.toISOString(),
            previousEnd: appointment.end.toISOString(),
          },
        },
        include: { client: true, service: true },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          kind: "RESCHEDULED",
          actor: appointment.client.email,
          previousStatus: appointment.status,
          nextStatus: "BOOKED",
          previousStart: appointment.start,
          previousEnd: appointment.end,
          nextStart: row.start,
          nextEnd: row.end,
        },
      });
      return row;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    throw error;
  }
  await notifyAppointmentChange(
    updated,
    "rescheduled",
    updated.locale as Locale,
    null,
    appointment.client.email,
  );

  return NextResponse.json({
    id: updated.id,
    start: updated.start.toISOString(),
    end: updated.end.toISOString(),
    status: updated.status,
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { appointmentByReference, openSlots } from "@/lib/booking";

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
    practitionerId: appointment.practitionerId,
  });
  const matchingSlot = available.find((slot) => slot.start === start);
  if (!matchingSlot) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      start: new Date(matchingSlot.start),
      end: new Date(matchingSlot.end),
      status: "RESCHEDULED",
      history: {
        rescheduledAt: new Date().toISOString(),
        previousStart: appointment.start.toISOString(),
        previousEnd: appointment.end.toISOString(),
      },
    },
    select: { id: true, start: true, end: true, status: true },
  });

  return NextResponse.json({
    id: updated.id,
    start: updated.start.toISOString(),
    end: updated.end.toISOString(),
    status: updated.status,
  });
}

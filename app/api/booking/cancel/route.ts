import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { appointmentByReference } from "@/lib/booking";
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
  const reason =
    String(payload.reason ?? "")
      .trim()
      .slice(0, 500) || null;
  if (!reference) return bad("reference_required");
  if (!contact) return bad("contact_required");

  const appointment = await appointmentByReference(reference);
  if (
    !appointment ||
    !matchesContact(contact, appointment.client.email, appointment.client.phone)
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (appointment.status === "CANCELLED") {
    return NextResponse.json({
      id: appointment.id,
      status: appointment.status,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        history: {
          cancelledAt: new Date().toISOString(),
          previousStatus: appointment.status,
        },
      },
      include: { client: true, service: true },
    });
    await tx.appointmentEvent.create({
      data: {
        appointmentId: appointment.id,
        kind: "CANCELLED",
        actor: appointment.client.email,
        previousStatus: appointment.status,
        nextStatus: "CANCELLED",
        reason,
      },
    });
    return row;
  });
  await notifyAppointmentChange(
    updated,
    "cancellation",
    updated.locale as Locale,
    reason,
    appointment.client.email,
  );

  return NextResponse.json({ id: updated.id, status: updated.status });
}

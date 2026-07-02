import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { appointmentByReference } from "@/lib/booking";

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
    return NextResponse.json({ id: appointment.id, status: appointment.status });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "CANCELLED",
      history: {
        cancelledAt: new Date().toISOString(),
        previousStatus: appointment.status,
      },
    },
    select: { id: true, status: true },
  });

  return NextResponse.json(updated);
}

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getBookingService } from "@/content/booking-services";
import { getDefaultPractitionerId, getServiceId } from "@/lib/booking";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** POST /api/booking — create an appointment (lean flow). */
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const service = String(payload.service ?? "");
  const start = String(payload.start ?? "");
  const fullName = String(payload.fullName ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const notes = payload.notes ? String(payload.notes).slice(0, 2000) : null;
  const consentGdpr = payload.consentGdpr === true;

  const svc = getBookingService(service);
  if (!svc || !svc.bookable) return bad("unknown_service");
  if (!start || Number.isNaN(Date.parse(start))) return bad("invalid_start");
  if (!fullName) return bad("name_required");
  if (!phone) return bad("phone_required");
  if (!EMAIL_RE.test(email)) return bad("email_required");
  if (!consentGdpr) return bad("consent_required");

  const startDate = new Date(start);
  if (startDate.getTime() <= Date.now()) return bad("start_in_past");
  const endDate = new Date(startDate.getTime() + svc.durationMin * 60000);

  try {
    const practitionerId = await getDefaultPractitionerId();
    const serviceId = await getServiceId(svc);

    // Double-book guard — any non-cancelled appointment overlapping this window.
    const clash = await prisma.appointment.findFirst({
      where: {
        practitionerId,
        status: { not: "CANCELLED" },
        start: { lt: endDate },
        end: { gt: startDate },
      },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }

    // Match an existing client by email, else create (email is indexed, not unique).
    const existing = await prisma.client.findFirst({ where: { email } });
    const client = existing
      ? await prisma.client.update({
          where: { id: existing.id },
          data: { fullName, phone, consentGdpr: true },
        })
      : await prisma.client.create({
          data: { fullName, phone, email, consentGdpr: true },
        });

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        practitionerId,
        serviceId,
        start: startDate,
        end: endDate,
        status: "BOOKED",
        channel: "web",
        notes,
      },
    });

    await prisma.consent.create({
      data: { clientId: client.id, type: "gdpr_booking", granted: true },
    });

    return NextResponse.json({
      id: appointment.id,
      start: appointment.start.toISOString(),
      serviceKey: svc.key,
    });
  } catch {
    // DB unavailable — signal the wizard to show its call/email fallback.
    return NextResponse.json(
      { error: "unavailable", degraded: true },
      { status: 503 },
    );
  }
}

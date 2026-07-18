import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServiceId, openPublicSlots } from "@/lib/booking";
import { notifyAppointmentReceipt } from "@/lib/notifications";
import { normalizeInternationalPhone } from "@/lib/phone";
import { routing, type Locale } from "@/i18n/routing";
import { resolveProcedure } from "@/lib/procedures";

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
  const phone = normalizeInternationalPhone(String(payload.phone ?? ""));
  const email = String(payload.email ?? "").trim();
  const notes = payload.notes ? String(payload.notes).slice(0, 2000) : null;
  const locale = routing.locales.includes(payload.locale as Locale)
    ? (payload.locale as Locale)
    : routing.defaultLocale;
  const consentGdpr = payload.consentGdpr === true;

  const svc = await prisma.service.findFirst({
    where: {
      slug: service,
      bookable: true,
      archivedAt: null,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    include: {
      contents: {
        where: { locale, status: "PUBLISHED" },
        select: { whatItIs: true },
        take: 1,
      },
    },
  });
  if (!svc) return bad("unknown_service");
  const procedureRequested =
    payload.procedureIndex !== undefined && payload.procedureIndex !== null;
  const procedure = procedureRequested
    ? resolveProcedure(svc.contents[0]?.whatItIs ?? "", payload.procedureIndex)
    : null;
  if (procedureRequested && !procedure) return bad("invalid_procedure");
  if (!start || Number.isNaN(Date.parse(start))) return bad("invalid_start");
  if (!fullName) return bad("name_required");
  if (!phone) return bad("phone_invalid");
  if (!EMAIL_RE.test(email)) return bad("email_required");
  if (!consentGdpr) return bad("consent_required");

  const startDate = new Date(start);
  if (startDate.getTime() <= Date.now()) return bad("start_in_past");
  const dateStr = start.slice(0, 10);

  try {
    const available = await openPublicSlots({
      dateStr,
      serviceKey: service,
      locale,
    });
    const matchingSlot = available.find((slot) => slot.start === start);
    if (!matchingSlot) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }

    const practitionerId = matchingSlot.practitionerId;
    const serviceId = await getServiceId(svc.slug);
    const endDate = new Date(matchingSlot.end);

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
        locale,
        start: startDate,
        end: endDate,
        status: "BOOKED",
        channel: "web",
        notes,
        procedureIndex: procedure?.index ?? null,
        procedureTitle: procedure?.procedure.title ?? null,
        procedurePrice: procedure?.procedure.price ?? null,
      },
      include: {
        client: { select: { fullName: true, email: true, phone: true } },
        practitioner: { select: { name: true, role: true } },
        service: { select: { slug: true } },
      },
    });

    await prisma.consent.create({
      data: { clientId: client.id, type: "gdpr_booking", granted: true },
    });

    try {
      await notifyAppointmentReceipt(appointment, locale);
    } catch {
      await prisma.auditLog.create({
        data: {
          actor: "system",
          action: "booking_confirmation_unhandled_error",
          entity: "Appointment",
          entityId: appointment.id,
        },
      });
    }

    return NextResponse.json({
      id: appointment.id,
      start: appointment.start.toISOString(),
      practitionerName: appointment.practitioner.name,
      serviceKey: svc.slug,
      procedure: procedure
        ? {
            index: procedure.index,
            title: procedure.procedure.title,
            price: procedure.procedure.price,
          }
        : null,
    });
  } catch {
    // DB unavailable — signal the wizard to show its call/email fallback.
    return NextResponse.json(
      { error: "unavailable", degraded: true },
      { status: 503 },
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getServiceId, openPublicSlotCandidates } from "@/lib/booking";
import { notifyAppointmentReceipt } from "@/lib/notifications";
import { normalizeInternationalPhone } from "@/lib/phone";
import { routing, type Locale } from "@/i18n/routing";
import { resolveProcedure } from "@/lib/procedures";
import { createAccountToken, currentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/notifications";
import { accountHref } from "@/lib/account-routing";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import { lockAndFindReservationConflict } from "@/lib/calendar-blocks";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** POST /api/booking — create an appointment (lean flow). */
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    return bad("invalid_json");
  }

  const service = String(payload.service ?? "");
  const start = String(payload.start ?? "");
  const fullName = String(payload.fullName ?? "").trim();
  const phone = normalizeInternationalPhone(String(payload.phone ?? ""));
  const submittedEmail = String(payload.email ?? "")
    .trim()
    .toLowerCase();
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
  const authUser = await currentUser();
  const accountClient =
    authUser?.role === "CLIENT"
      ? await prisma.client.findUnique({ where: { userId: authUser.id } })
      : null;
  const email = accountClient ? authUser!.email : submittedEmail;
  if (!EMAIL_RE.test(email)) return bad("email_required");
  if (!consentGdpr) return bad("consent_required");

  const startDate = new Date(start);
  if (startDate.getTime() <= Date.now()) return bad("start_in_past");
  const dateStr = start.slice(0, 10);

  try {
    const candidates = await openPublicSlotCandidates({
      dateStr,
      serviceKey: service,
      locale,
      start,
    });
    if (!candidates.length) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }

    const serviceId = await getServiceId(svc.slug);
    const appointment = await prisma.$transaction(
      async (tx) => {
        let matchingSlot: (typeof candidates)[number] | null = null;
        for (const candidate of candidates) {
          const clash = await lockAndFindReservationConflict(tx, {
            start: startDate,
            end: new Date(candidate.end),
            practitionerIds: [candidate.practitionerId],
            roomId: candidate.roomId,
            deviceId: candidate.deviceId,
          });
          if (!clash) {
            matchingSlot = candidate;
            break;
          }
        }
        if (!matchingSlot) throw new Error("slot_taken");
        const existing = accountClient
          ? accountClient
          : await tx.client.findFirst({ where: { email, userId: null } });
        const client = existing
          ? await tx.client.update({
              where: { id: existing.id },
              data: { fullName, phone, consentGdpr: true },
            })
          : await tx.client.create({
              data: { fullName, phone, email, consentGdpr: true },
            });
        const created = await tx.appointment.create({
          data: {
            clientId: client.id,
            practitionerId: matchingSlot.practitionerId,
            serviceId,
            roomId: matchingSlot.roomId,
            deviceId: matchingSlot.deviceId,
            locale,
            start: startDate,
            end: new Date(matchingSlot.end),
            status: "BOOKED",
            channel: "web",
            notes,
            procedureIndex: procedure?.index ?? null,
            procedureTitle: procedure?.procedure.title ?? null,
            procedurePrice: procedure?.procedure.price ?? null,
          },
          include: {
            client: { select: { fullName: true, email: true, phone: true } },
            service: { select: { slug: true } },
            practitioner: { select: { name: true } },
          },
        });
        await tx.consent.create({
          data: { clientId: client.id, type: "gdpr_booking", granted: true },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

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

    if (!accountClient) {
      try {
        const claim = await createAccountToken({
          email,
          purpose: "CLAIM_APPOINTMENT",
          appointmentId: appointment.id,
          ttlMs: 7 * 24 * 60 * 60 * 1000,
        });
        const path = accountHref(locale, "claim").replace(
          /^\/(?:en|ru)(?=\/)/,
          "",
        );
        const claimUrl = `${absoluteLocalizedUrl(siteUrl(), path, locale)}?token=${encodeURIComponent(claim)}`;
        await sendEmail({
          to: email,
          subject: "Mone Beauty · add appointment to your account",
          text: `Add this appointment to your secure client account:\n\n${claimUrl}`,
          idempotencyKey: `appointment-claim:${appointment.id}`,
        });
      } catch {
        await prisma.auditLog.create({
          data: {
            actor: "system",
            action: "appointment_claim_link_failed",
            outcome: "FAILURE",
            entity: "Appointment",
            entityId: appointment.id,
          },
        });
      }
    }

    return NextResponse.json({
      id: appointment.id,
      start: appointment.start.toISOString(),
      serviceKey: svc.slug,
      procedure: procedure
        ? {
            index: procedure.index,
            title: procedure.procedure.title,
            price: procedure.procedure.price,
          }
        : null,
    });
  } catch (error) {
    if (
      (error instanceof Error && error.message === "slot_taken") ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034")
    )
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    // DB unavailable — signal the wizard to show its call/email fallback.
    return NextResponse.json(
      { error: "unavailable", degraded: true },
      { status: 503 },
    );
  }
}

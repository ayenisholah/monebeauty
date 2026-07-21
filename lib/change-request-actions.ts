"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auditForUser, currentUser } from "@/lib/auth";
import { accountHref } from "@/lib/account-routing";
import { adminHref } from "@/lib/admin-routing";
import { openSlots } from "@/lib/booking";
import { lockAndFindReservationConflict } from "@/lib/calendar-blocks";
import { notifyAppointmentChange, sendEmail } from "@/lib/notifications";
import { CONTACT } from "@/content/site";
import type { Locale } from "@/i18n/routing";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function localeFrom(formData: FormData): Locale {
  const value = text(formData, "locale");
  return value === "en" || value === "ru" ? value : "fi";
}

const requestMail = {
  fi: {
    received: "muutospyyntö vastaanotettu",
    waiting:
      "Muutospyyntösi on vastaanotettu ja odottaa ylläpitäjän käsittelyä. Ajanvaraus säilyy ennallaan hyväksyntään asti.",
    update: "ajanvarauspyynnön päätös",
    rejected: "Ajanvarauksen muutospyyntöä ei hyväksytty.",
    reason: "Perustelu",
  },
  en: {
    received: "change request received",
    waiting:
      "Your change request has been received and is waiting for administrator review. Your appointment remains unchanged until approval.",
    update: "appointment request decision",
    rejected: "Your appointment change request was not approved.",
    reason: "Reason",
  },
  ru: {
    received: "запрос на изменение получен",
    waiting:
      "Ваш запрос получен и ожидает решения администратора. До одобрения запись остаётся без изменений.",
    update: "решение по запросу",
    rejected: "Запрос на изменение записи не был одобрен.",
    reason: "Причина",
  },
} as const;

export async function createAppointmentChangeRequestAction(formData: FormData) {
  const locale = localeFrom(formData);
  const user = await currentUser();
  if (!user || user.role !== "CLIENT") redirect(accountHref(locale, "login"));
  const client = await prisma.client.findUnique({ where: { userId: user.id } });
  const appointmentId = text(formData, "appointmentId");
  const type =
    text(formData, "type") === "RESCHEDULE" ? "RESCHEDULE" : "CANCEL";
  const reason = text(formData, "reason").slice(0, 500) || null;
  const requestedStartRaw = text(formData, "requestedStart");
  const appointment = client
    ? await prisma.appointment.findFirst({
        where: { id: appointmentId, clientId: client.id },
        include: { service: true, client: true },
      })
    : null;
  if (
    !appointment ||
    appointment.start <= new Date() ||
    appointment.status === "CANCELLED"
  )
    redirect(`${accountHref(locale)}?error=invalid_request`);
  let requestedStart: Date | null = null;
  if (type === "RESCHEDULE") {
    if (!requestedStartRaw || Number.isNaN(Date.parse(requestedStartRaw)))
      redirect(`${accountHref(locale)}?error=invalid_time`);
    const slots = await openSlots({
      dateStr: requestedStartRaw.slice(0, 10),
      serviceKey: appointment.service.slug,
    });
    if (!slots.some((slot) => slot.start === requestedStartRaw))
      redirect(`${accountHref(locale)}?error=slot_taken`);
    requestedStart = new Date(requestedStartRaw);
  }
  try {
    const request = await prisma.appointmentChangeRequest.create({
      data: {
        appointmentId,
        clientId: client!.id,
        type,
        requestedStart,
        reason,
      },
    });
    await auditForUser(
      user,
      "appointment_change_requested",
      "AppointmentChangeRequest",
      request.id,
      { metadata: { appointmentId, type } },
    );
    const reference = appointment.id.slice(-8).toUpperCase();
    const customerMail = requestMail[locale];
    await Promise.all([
      sendEmail({
        to: user.email,
        subject: `Mone Beauty · ${customerMail.received} ${reference}`,
        text: customerMail.waiting,
        idempotencyKey: `change-request-client:${request.id}`,
      }),
      sendEmail({
        to: CONTACT.email,
        subject: `Appointment ${type.toLowerCase()} request ${reference}`,
        text: `${appointment.client.fullName} submitted a ${type.toLowerCase()} request. Review it in the admin appointment queue.`,
        idempotencyKey: `change-request-admin:${request.id}`,
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      redirect(`${accountHref(locale)}?error=request_exists`);
    throw error;
  }
  redirect(`${accountHref(locale)}?requested=1`);
}

export async function reviewAppointmentChangeRequestAction(formData: FormData) {
  const locale = localeFrom(formData);
  const admin = await currentUser();
  if (!admin || admin.role !== "ADMIN") redirect(adminHref(locale, "login"));
  const id = text(formData, "id");
  const approve = text(formData, "decision") === "APPROVE";
  const decisionReason = text(formData, "decisionReason").slice(0, 500) || null;
  const request = await prisma.appointmentChangeRequest.findUnique({
    where: { id },
    include: { appointment: { include: { client: true, service: true } } },
  });
  if (!request || request.status !== "PENDING")
    redirect(`${adminHref(locale, "appointments")}?error=invalid_request`);
  let updatedAppointment = request.appointment;
  if (approve && request.type === "RESCHEDULE") {
    if (!request.requestedStart || request.requestedStart <= new Date())
      redirect(`${adminHref(locale, "appointments")}?error=slot_taken`);
    const start = request.requestedStart.toISOString();
    const slots = await openSlots({
      dateStr: start.slice(0, 10),
      serviceKey: request.appointment.service.slug,
    });
    const matching = slots.find((slot) => slot.start === start);
    if (!matching)
      redirect(`${adminHref(locale, "appointments")}?error=slot_taken`);
    updatedAppointment = await prisma.$transaction(async (tx) => {
      const reservationConflict = await lockAndFindReservationConflict(tx, { start: new Date(matching.start), end: new Date(matching.end), practitionerIds: [matching.practitionerId], roomId: matching.roomId, deviceId: matching.deviceId, excludeAppointmentId: request.appointmentId });
      if (reservationConflict) throw new Error("slot_taken");
      const changed = await tx.appointmentChangeRequest.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "APPROVED",
          decisionReason,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      if (!changed.count) throw new Error("stale");
      const appointment = await tx.appointment.update({
        where: { id: request.appointmentId },
        data: {
          start: new Date(matching.start),
          end: new Date(matching.end),
          practitionerId: matching.practitionerId,
          roomId: matching.roomId,
          deviceId: matching.deviceId,
          status: "BOOKED",
          confirmedAt: null,
          version: { increment: 1 },
        },
        include: { client: true, service: true },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          kind: "RESCHEDULED",
          actor: admin.email,
          previousStatus: request.appointment.status,
          nextStatus: "BOOKED",
          previousStart: request.appointment.start,
          previousEnd: request.appointment.end,
          nextStart: appointment.start,
          nextEnd: appointment.end,
          reason: decisionReason,
        },
      });
      return appointment;
    });
    await notifyAppointmentChange(
      updatedAppointment,
      "rescheduled",
      updatedAppointment.locale as Locale,
      decisionReason,
      admin.email,
    );
  } else if (approve) {
    updatedAppointment = await prisma.$transaction(async (tx) => {
      const changed = await tx.appointmentChangeRequest.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "APPROVED",
          decisionReason,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      if (!changed.count) throw new Error("stale");
      const appointment = await tx.appointment.update({
        where: { id: request.appointmentId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: decisionReason ?? request.reason,
        },
        include: { client: true, service: true },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          kind: "CANCELLED",
          actor: admin.email,
          previousStatus: request.appointment.status,
          nextStatus: "CANCELLED",
          reason: decisionReason ?? request.reason,
        },
      });
      return appointment;
    });
    await notifyAppointmentChange(
      updatedAppointment,
      "cancellation",
      updatedAppointment.locale as Locale,
      decisionReason,
      admin.email,
    );
  } else {
    await prisma.appointmentChangeRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        decisionReason,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    const customerMail = requestMail[request.appointment.locale as Locale];
    await sendEmail({
      to: request.appointment.client.email,
      subject: `Mone Beauty · ${customerMail.update}`,
      text: `${customerMail.rejected}${decisionReason ? ` ${customerMail.reason}: ${decisionReason}` : ""}`,
      idempotencyKey: `change-request-rejected:${id}`,
    });
  }
  await auditForUser(
    admin,
    approve ? "appointment_change_approved" : "appointment_change_rejected",
    "AppointmentChangeRequest",
    id,
    { metadata: { appointmentId: request.appointmentId, type: request.type } },
  );
  redirect(`${adminHref(locale, "appointments")}?saved=1`);
}

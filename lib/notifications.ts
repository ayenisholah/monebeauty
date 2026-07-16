import { prisma } from "@/lib/db";
import { BRAND, CONTACT } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import {
  renderCustomerAppointmentEmail,
  renderCustomerOrderEmail,
  renderStaffAppointmentEmail,
  renderStaffOrderEmail,
  type AppointmentEmailData,
  type OrderEmailData,
} from "@/lib/email";

export type NotifyResult = {
  channel: "email" | "sms";
  status: "sent" | "skipped" | "failed";
  detail?: string;
};

type AppointmentNotification = AppointmentEmailData;
type OrderNotification = OrderEmailData;

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function enabled() {
  return env("NOTIFICATIONS_ENABLED") !== "false";
}

function fromEmail() {
  return (
    env("NOTIFICATION_FROM_EMAIL") || `Mone Beauty Clinic <${CONTACT.email}>`
  );
}

function staffEmails() {
  return env("STAFF_NOTIFICATION_EMAILS")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function staffPhones() {
  return env("STAFF_NOTIFICATION_PHONES")
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);
}

function dateTime(date: Date, locale: Locale = "fi") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(date);
}

async function postJson(url: string, headers: HeadersInit, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text.slice(0, 180)}`);
  }
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<NotifyResult> {
  if (!enabled())
    return { channel: "email", status: "skipped", detail: "disabled" };

  const recipients = Array.isArray(to)
    ? to.filter(Boolean)
    : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { channel: "email", status: "skipped", detail: "no_recipient" };
  }

  const resendKey = env("RESEND_API_KEY") || env("EMAIL_API_KEY");
  const postmarkKey = env("POSTMARK_SERVER_TOKEN");

  try {
    if (resendKey) {
      await postJson(
        "https://api.resend.com/emails",
        { Authorization: `Bearer ${resendKey}` },
        {
          from: fromEmail(),
          to: recipients,
          subject,
          text,
          ...(html ? { html } : {}),
        },
      );
      return { channel: "email", status: "sent", detail: "resend" };
    }

    if (postmarkKey) {
      await postJson(
        "https://api.postmarkapp.com/email",
        { "X-Postmark-Server-Token": postmarkKey },
        {
          From: fromEmail(),
          To: recipients.join(","),
          Subject: subject,
          TextBody: text,
          ...(html ? { HtmlBody: html } : {}),
        },
      );
      return { channel: "email", status: "sent", detail: "postmark" };
    }

    return { channel: "email", status: "skipped", detail: "no_provider" };
  } catch (error) {
    return {
      channel: "email",
      status: "failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

export async function sendSms({
  to,
  text,
}: {
  to: string | string[];
  text: string;
}): Promise<NotifyResult> {
  if (!enabled())
    return { channel: "sms", status: "skipped", detail: "disabled" };

  const recipients = Array.isArray(to)
    ? to.filter(Boolean)
    : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { channel: "sms", status: "skipped", detail: "no_recipient" };
  }

  const webhook = env("SMS_WEBHOOK_URL");
  const token = env("SMS_API_KEY");
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN") || token;
  const from = env("TWILIO_FROM") || env("SMS_FROM");
  const sinchProjectId = env("SINCH_PROJECT_ID");
  const sinchAppId = env("SINCH_APP_ID");
  const sinchAccessKeyId = env("SINCH_ACCESS_KEY_ID");
  const sinchAccessKeySecret = env("SINCH_ACCESS_KEY_SECRET");
  const sinchRegion = env("SINCH_REGION").toLowerCase();
  const sinchSender = env("SINCH_SMS_SENDER") || env("SMS_FROM");

  try {
    if (
      sinchProjectId &&
      sinchAppId &&
      sinchAccessKeyId &&
      sinchAccessKeySecret
    ) {
      if (!sinchSender) {
        return {
          channel: "sms",
          status: "failed",
          detail: "sinch_missing_sender",
        };
      }

      if (sinchRegion !== "eu" && sinchRegion !== "us") {
        return {
          channel: "sms",
          status: "failed",
          detail: "sinch_invalid_region",
        };
      }

      const auth = Buffer.from(
        `${sinchAccessKeyId}:${sinchAccessKeySecret}`,
      ).toString("base64");
      const url = `https://${sinchRegion}.conversation.api.sinch.com/v1/projects/${encodeURIComponent(sinchProjectId)}/messages:send`;

      for (const recipient of recipients) {
        await postJson(
          url,
          { Authorization: `Basic ${auth}` },
          {
            app_id: sinchAppId,
            recipient: {
              identified_by: {
                channel_identities: [{ channel: "SMS", identity: recipient }],
              },
            },
            message: { text_message: { text } },
            channel_properties: { SMS_SENDER: sinchSender },
          },
        );
      }
      return { channel: "sms", status: "sent", detail: "sinch_conversation" };
    }

    if (accountSid && authToken && from) {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      for (const recipient of recipients) {
        const body = new URLSearchParams({
          From: from,
          To: recipient,
          Body: text,
        });
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          },
        );
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      }
      return { channel: "sms", status: "sent", detail: "twilio" };
    }

    if (webhook) {
      await postJson(
        webhook,
        token ? { Authorization: `Bearer ${token}` } : {},
        {
          to: recipients,
          text,
        },
      );
      return { channel: "sms", status: "sent", detail: "webhook" };
    }

    return { channel: "sms", status: "skipped", detail: "no_provider" };
  } catch (error) {
    return {
      channel: "sms",
      status: "failed",
      detail:
        error instanceof Error ? error.message.slice(0, 180) : "unknown_error",
    };
  }
}

async function logNotification(
  action: string,
  entity: "Appointment" | "Order",
  entityId: string,
  results: NotifyResult[],
) {
  await Promise.all(
    results.map((result) =>
      prisma.auditLog.create({
        data: {
          actor: "system",
          action: `${action}_${result.channel}_${result.status}`,
          entity,
          entityId,
        },
      }),
    ),
  );
}

async function appointmentServiceTitle(slug: string, locale: Locale) {
  const content = await prisma.treatmentContent.findFirst({
    where: { locale, status: "PUBLISHED", service: { slug } },
    select: { h1: true },
  });
  return content?.h1 ?? slug;
}

function appointmentSms(
  appointment: AppointmentNotification,
  locale: Locale,
  kind: "confirmation" | "reminder_24h" | "reminder_2h",
  service: string,
) {
  const prefix =
    kind === "confirmation"
      ? "Booking received"
      : kind === "reminder_24h"
        ? "Reminder tomorrow"
        : "Reminder soon";
  const treatment = appointment.procedureTitle ?? service;
  return `${BRAND.shortName}: ${prefix}. ${treatment}, ${dateTime(appointment.start, locale)}. Ref ${appointment.id.slice(-8).toUpperCase()}. ${CONTACT.phone}`;
}

export async function notifyAppointmentConfirmation(
  appointment: AppointmentNotification,
  locale: Locale = "fi",
) {
  const [service, staffService] = await Promise.all([
    appointmentServiceTitle(appointment.service.slug, locale),
    appointmentServiceTitle(appointment.service.slug, "fi"),
  ]);
  const localizedAppointment = {
    ...appointment,
    service: {
      ...appointment.service,
      title: service,
      staffTitle: staffService,
    },
  };
  const customerMessage = renderCustomerAppointmentEmail(
    localizedAppointment,
    locale,
    "confirmation",
  );
  const staffMessage = renderStaffAppointmentEmail(localizedAppointment);
  const results = await Promise.all([
    sendSms({
      to: appointment.client.phone,
      text: appointmentSms(appointment, locale, "confirmation", service),
    }),
    sendEmail({ to: appointment.client.email, ...customerMessage }),
    sendEmail({
      to: staffEmails(),
      ...staffMessage,
    }),
    sendSms({
      to: staffPhones(),
      text: `New ${BRAND.shortName} booking: ${appointment.client.fullName}, ${appointment.procedureTitle ?? staffService}, ${dateTime(appointment.start, locale)}, ref ${appointment.id.slice(-8).toUpperCase()}.`,
    }),
  ]);

  await logNotification(
    "booking_confirmation",
    "Appointment",
    appointment.id,
    results,
  );
}

export async function notifyAppointmentReminder(
  appointment: AppointmentNotification,
  kind: "reminder_24h" | "reminder_2h",
  locale: Locale = "fi",
) {
  const service = await appointmentServiceTitle(
    appointment.service.slug,
    locale,
  );
  const localizedAppointment = {
    ...appointment,
    service: { ...appointment.service, title: service },
  };
  const message = renderCustomerAppointmentEmail(
    localizedAppointment,
    locale,
    kind,
  );
  const results = await Promise.all([
    sendSms({
      to: appointment.client.phone,
      text: appointmentSms(appointment, locale, kind, service),
    }),
    sendEmail({
      to: appointment.client.email,
      ...message,
    }),
  ]);

  await logNotification(
    `booking_${kind}`,
    "Appointment",
    appointment.id,
    results,
  );
}

export async function notifyOrderConfirmation(
  order: OrderNotification,
  locale: Locale = "fi",
) {
  const customerMessage = renderCustomerOrderEmail(order, locale);
  const staffMessage = renderStaffOrderEmail(order);

  const results = await Promise.all([
    sendEmail({
      to: order.email,
      ...customerMessage,
    }),
    sendEmail({
      to: staffEmails(),
      ...staffMessage,
    }),
  ]);

  await logNotification("order_confirmation", "Order", order.id, results);
}

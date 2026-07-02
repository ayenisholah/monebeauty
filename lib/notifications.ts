import { prisma } from "@/lib/db";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import { BRAND, CONTACT } from "@/content/site";
import { bookingServiceTitle } from "@/content/booking-services";
import type { Locale } from "@/i18n/routing";

type NotifyResult = {
  channel: "email" | "sms";
  status: "sent" | "skipped" | "failed";
  detail?: string;
};

type AppointmentNotification = {
  id: string;
  start: Date;
  end: Date;
  client: { fullName: string; email: string; phone: string };
  practitioner: { name: string; role: string };
  service: { slug: string };
};

type OrderNotification = {
  id: string;
  email: string;
  phone: string | null;
  total: unknown;
  currency: string;
  items: Array<{ name: string; qty: number; unitPrice: unknown }>;
};

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function enabled() {
  return env("NOTIFICATIONS_ENABLED") !== "false";
}

function fromEmail() {
  return env("NOTIFICATION_FROM_EMAIL") || `Mone Beauty Clinic <${CONTACT.email}>`;
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

function money(value: unknown, currency = "EUR") {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency,
  }).format(Number(value));
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

function bookingUrl(locale: Locale) {
  return `${siteUrl()}${absoluteLocalizedUrl("", "/booking", locale)}`;
}

function orderUrl(orderId: string, locale: Locale) {
  return `${siteUrl()}${absoluteLocalizedUrl("", `/order/${orderId}`, locale)}`;
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

async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<NotifyResult> {
  if (!enabled()) return { channel: "email", status: "skipped", detail: "disabled" };

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
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
        { from: fromEmail(), to: recipients, subject, text },
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

async function sendSms({
  to,
  text,
}: {
  to: string | string[];
  text: string;
}): Promise<NotifyResult> {
  if (!enabled()) return { channel: "sms", status: "skipped", detail: "disabled" };

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { channel: "sms", status: "skipped", detail: "no_recipient" };
  }

  const webhook = env("SMS_WEBHOOK_URL");
  const token = env("SMS_API_KEY");
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN") || token;
  const from = env("TWILIO_FROM") || env("SMS_FROM");

  try {
    if (accountSid && authToken && from) {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      for (const recipient of recipients) {
        const body = new URLSearchParams({ From: from, To: recipient, Body: text });
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
      await postJson(webhook, token ? { Authorization: `Bearer ${token}` } : {}, {
        to: recipients,
        text,
      });
      return { channel: "sms", status: "sent", detail: "webhook" };
    }

    return { channel: "sms", status: "skipped", detail: "no_provider" };
  } catch (error) {
    return {
      channel: "sms",
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 180) : "unknown_error",
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

function appointmentText(
  appointment: AppointmentNotification,
  locale: Locale,
  kind: "confirmation" | "reminder_24h" | "reminder_2h",
) {
  const service =
    bookingServiceTitle(appointment.service.slug, locale) ?? appointment.service.slug;
  const when = dateTime(appointment.start, locale);
  const reference = appointment.id.slice(-8).toUpperCase();
  const intro =
    kind === "confirmation"
      ? "Your appointment request has been received."
      : kind === "reminder_24h"
        ? "Reminder: your appointment is tomorrow."
        : "Reminder: your appointment is soon.";

  return [
    `${BRAND.name}`,
    "",
    `Hello ${appointment.client.fullName},`,
    intro,
    "",
    `Service: ${service}`,
    `Specialist: ${appointment.practitioner.name}`,
    `Time: ${when}`,
    `Reference: ${reference}`,
    "",
    `Address: ${CONTACT.address.street}, ${CONTACT.address.postalCode} ${CONTACT.address.city}`,
    `Phone: ${CONTACT.phone}`,
    "",
    "If you need to change or cancel your appointment, contact the clinic directly.",
  ].join("\n");
}

function appointmentSms(
  appointment: AppointmentNotification,
  locale: Locale,
  kind: "confirmation" | "reminder_24h" | "reminder_2h",
) {
  const service =
    bookingServiceTitle(appointment.service.slug, locale) ?? appointment.service.slug;
  const prefix =
    kind === "confirmation"
      ? "Booking received"
      : kind === "reminder_24h"
        ? "Reminder tomorrow"
        : "Reminder soon";
  return `${BRAND.shortName}: ${prefix}. ${service}, ${dateTime(appointment.start, locale)}. Ref ${appointment.id.slice(-8).toUpperCase()}. ${CONTACT.phone}`;
}

export async function notifyAppointmentConfirmation(
  appointment: AppointmentNotification,
  locale: Locale = "fi",
) {
  const subject = `${BRAND.name}: booking ${appointment.id.slice(-8).toUpperCase()}`;
  const text = `${appointmentText(appointment, locale, "confirmation")}\n\nBook another appointment: ${bookingUrl(locale)}`;
  const results = await Promise.all([
    sendSms({
      to: appointment.client.phone,
      text: appointmentSms(appointment, locale, "confirmation"),
    }),
    sendEmail({ to: appointment.client.email, subject, text }),
    sendEmail({
      to: staffEmails(),
      subject: `New booking: ${appointment.id.slice(-8).toUpperCase()}`,
      text: `${text}\n\nClient phone: ${appointment.client.phone}\nClient email: ${appointment.client.email}`,
    }),
    sendSms({
      to: staffPhones(),
      text: `New ${BRAND.shortName} booking: ${appointment.client.fullName}, ${dateTime(appointment.start, locale)}, ref ${appointment.id.slice(-8).toUpperCase()}.`,
    }),
  ]);

  await logNotification("booking_confirmation", "Appointment", appointment.id, results);
}

export async function notifyAppointmentReminder(
  appointment: AppointmentNotification,
  kind: "reminder_24h" | "reminder_2h",
  locale: Locale = "fi",
) {
  const subject =
    kind === "reminder_24h"
      ? `${BRAND.name}: appointment reminder for tomorrow`
      : `${BRAND.name}: appointment reminder`;
  const results = await Promise.all([
    sendSms({ to: appointment.client.phone, text: appointmentSms(appointment, locale, kind) }),
    sendEmail({
      to: appointment.client.email,
      subject,
      text: appointmentText(appointment, locale, kind),
    }),
  ]);

  await logNotification(`booking_${kind}`, "Appointment", appointment.id, results);
}

export async function notifyOrderConfirmation(
  order: OrderNotification,
  locale: Locale = "fi",
) {
  const reference = order.id.slice(-8).toUpperCase();
  const lines = order.items.map(
    (item) =>
      `${item.qty} x ${item.name} - ${money(Number(item.unitPrice) * item.qty, order.currency)}`,
  );
  const text = [
    `${BRAND.name}`,
    "",
    "Your order request has been received.",
    "",
    `Reference: ${reference}`,
    ...lines,
    `Total: ${money(order.total, order.currency)}`,
    "",
    `Order page: ${orderUrl(order.id, locale)}`,
    `Questions: ${CONTACT.email} / ${CONTACT.phone}`,
  ].join("\n");

  const results = await Promise.all([
    sendEmail({
      to: order.email,
      subject: `${BRAND.name}: order ${reference}`,
      text,
    }),
    sendEmail({
      to: staffEmails(),
      subject: `New order: ${reference}`,
      text: `${text}\n\nCustomer phone: ${order.phone ?? "-"}`,
    }),
  ]);

  await logNotification("order_confirmation", "Order", order.id, results);
}

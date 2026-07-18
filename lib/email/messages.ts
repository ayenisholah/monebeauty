import { BRAND, CONTACT } from "@/content/site";
import { bookingServiceTitle } from "@/content/booking-services";
import type { Locale } from "@/i18n/routing";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import { PUBLIC_PATHS, orderPath } from "@/lib/public-routes";
import {
  escapeHtml,
  plainTextFooter,
  renderCta,
  renderDetailsTable,
  renderEmailShell,
  renderNotice,
  renderOrderItemsTable,
  type EmailMessage,
  type EmailOrderItem,
} from "./template";

export type AppointmentEmailKind =
  "confirmation" | "reminder_24h" | "reminder_2h";

export type AppointmentEmailData = {
  id: string;
  start: Date;
  end: Date;
  client: { fullName: string; email: string; phone: string };
  service: { slug: string; title?: string; staffTitle?: string };
  procedureIndex?: number | null;
  procedureTitle?: string | null;
  procedurePrice?: string | null;
};

export type OrderEmailData = {
  id: string;
  email: string;
  phone: string | null;
  total: unknown;
  currency: string;
  client?: { fullName: string; email?: string; phone?: string } | null;
  items: Array<{ name: string; qty: number; unitPrice: unknown }>;
};

type Copy = {
  greeting: (name: string) => string;
  appointment: Record<
    AppointmentEmailKind,
    { subject: string; preheader: string; heading: string; intro: string }
  >;
  order: {
    subject: string;
    preheader: string;
    heading: string;
    intro: string;
    notice: string;
  };
  labels: {
    service: string;
    procedure: string;
    time: string;
    reference: string;
    item: string;
    unitPrice: string;
    lineTotal: string;
    total: string;
  };
  appointmentNotice: string;
  bookAnother: string;
  viewOrder: string;
  questions: string;
};

export const EMAIL_COPY: Record<Locale, Copy> = {
  fi: {
    greeting: (name) => `Hei ${name},`,
    appointment: {
      confirmation: {
        subject: "ajanvarauspyyntö",
        preheader: "Ajanvarauspyyntösi on vastaanotettu.",
        heading: "Ajanvarauspyyntö vastaanotettu",
        intro: "Kiitos. Olemme vastaanottaneet ajanvarauspyyntösi.",
      },
      reminder_24h: {
        subject: "muistutus huomisesta ajasta",
        preheader: "Muistutus: aikasi on huomenna.",
        heading: "Muistutus huomisesta ajasta",
        intro: "Tämä on muistutus: aikasi Mone Beauty Clinicillä on huomenna.",
      },
      reminder_2h: {
        subject: "ajanvarausmuistutus",
        preheader: "Muistutus: aikasi alkaa pian.",
        heading: "Ajanvarausmuistutus",
        intro: "Tämä on muistutus: aikasi Mone Beauty Clinicillä alkaa pian.",
      },
    },
    order: {
      subject: "tilauspyyntö",
      preheader: "Tilauspyyntösi on vastaanotettu.",
      heading: "Tilauspyyntö vastaanotettu",
      intro: "Kiitos. Olemme vastaanottaneet tilauspyyntösi.",
      notice:
        "Tämä ei ole vielä tilausvahvistus, eikä maksua ole veloitettu. Klinikka ottaa tarvittaessa yhteyttä jatkosta.",
    },
    labels: {
      service: "Palvelu",
      procedure: "Toimenpide",
      time: "Aika",
      reference: "Viite",
      item: "Tuote",
      unitPrice: "Kappalehinta",
      lineTotal: "Yhteensä",
      total: "Kokonaissumma",
    },
    appointmentNotice:
      "Jos haluat muuttaa tai perua ajan, ota yhteyttä klinikkaan suoraan.",
    bookAnother: "Varaa toinen aika",
    viewOrder: "Näytä tilauspyyntö",
    questions: "Kysyttävää?",
  },
  en: {
    greeting: (name) => `Hello ${name},`,
    appointment: {
      confirmation: {
        subject: "appointment request",
        preheader: "Your appointment request has been received.",
        heading: "Appointment request received",
        intro: "Thank you. We have received your appointment request.",
      },
      reminder_24h: {
        subject: "appointment reminder for tomorrow",
        preheader: "Reminder: your appointment is tomorrow.",
        heading: "Your appointment is tomorrow",
        intro:
          "This is a reminder that your appointment at Mone Beauty Clinic is tomorrow.",
      },
      reminder_2h: {
        subject: "appointment reminder",
        preheader: "Reminder: your appointment starts soon.",
        heading: "Your appointment starts soon",
        intro:
          "This is a reminder that your appointment at Mone Beauty Clinic starts soon.",
      },
    },
    order: {
      subject: "order request",
      preheader: "Your order request has been received.",
      heading: "Order request received",
      intro: "Thank you. We have received your order request.",
      notice:
        "This is not yet an order confirmation and no payment has been captured. The clinic will contact you if any next steps are needed.",
    },
    labels: {
      service: "Service",
      procedure: "Procedure",
      time: "Time",
      reference: "Reference",
      item: "Item",
      unitPrice: "Unit price",
      lineTotal: "Total",
      total: "Order total",
    },
    appointmentNotice:
      "If you need to change or cancel your appointment, contact the clinic directly.",
    bookAnother: "Book another appointment",
    viewOrder: "View order request",
    questions: "Questions?",
  },
  ru: {
    greeting: (name) => `Здравствуйте, ${name}!`,
    appointment: {
      confirmation: {
        subject: "запрос на запись",
        preheader: "Ваш запрос на запись получен.",
        heading: "Запрос на запись получен",
        intro: "Спасибо. Мы получили ваш запрос на запись.",
      },
      reminder_24h: {
        subject: "напоминание о завтрашнем визите",
        preheader: "Напоминание: ваш визит состоится завтра.",
        heading: "Ваш визит состоится завтра",
        intro:
          "Напоминаем, что ваш визит в Mone Beauty Clinic состоится завтра.",
      },
      reminder_2h: {
        subject: "напоминание о визите",
        preheader: "Напоминание: ваш визит скоро начнётся.",
        heading: "Ваш визит скоро начнётся",
        intro: "Напоминаем, что ваш визит в Mone Beauty Clinic скоро начнётся.",
      },
    },
    order: {
      subject: "запрос на заказ",
      preheader: "Ваш запрос на заказ получен.",
      heading: "Запрос на заказ получен",
      intro: "Спасибо. Мы получили ваш запрос на заказ.",
      notice:
        "Это ещё не подтверждение заказа; оплата не списана. При необходимости клиника свяжется с вами для уточнения дальнейших действий.",
    },
    labels: {
      service: "Услуга",
      procedure: "Процедура",
      time: "Время",
      reference: "Номер",
      item: "Товар",
      unitPrice: "Цена за единицу",
      lineTotal: "Сумма",
      total: "Итого",
    },
    appointmentNotice:
      "Если вам нужно перенести или отменить визит, свяжитесь с клиникой напрямую.",
    bookAnother: "Записаться ещё раз",
    viewOrder: "Открыть запрос на заказ",
    questions: "Есть вопросы?",
  },
};

const LOCALE_TAG: Record<Locale, string> = {
  fi: "fi-FI",
  en: "en-GB",
  ru: "ru-RU",
};

export function emailReference(id: string): string {
  return id.slice(-8).toUpperCase();
}

export function formatEmailDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(date);
}

export function formatEmailMoney(
  value: unknown,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "currency",
    currency,
  }).format(Number(value));
}

function localizedUrl(path: string, locale: Locale): string {
  return `${siteUrl()}${absoluteLocalizedUrl("", path, locale)}`;
}

function paragraph(value: string, muted = false): string {
  return `<p style="margin:0 0 22px;color:${muted ? "#6B6056" : "#3A322B"};font-size:15px;line-height:1.7;">${escapeHtml(value)}</p>`;
}

function serviceName(appointment: AppointmentEmailData, locale: Locale) {
  return (
    appointment.service.title ??
    bookingServiceTitle(appointment.service.slug, locale) ??
    appointment.service.slug
  );
}

function procedureName(appointment: AppointmentEmailData) {
  return [appointment.procedureTitle, appointment.procedurePrice]
    .filter(Boolean)
    .join(" · ");
}

export function renderCustomerAppointmentEmail(
  appointment: AppointmentEmailData,
  locale: Locale,
  kind: AppointmentEmailKind,
): EmailMessage {
  const copy = EMAIL_COPY[locale];
  const messageCopy = copy.appointment[kind];
  const reference = emailReference(appointment.id);
  const details = [
    { label: copy.labels.service, value: serviceName(appointment, locale) },
    ...(appointment.procedureTitle
      ? [{ label: copy.labels.procedure, value: procedureName(appointment) }]
      : []),
    {
      label: copy.labels.time,
      value: formatEmailDateTime(appointment.start, locale),
    },
    { label: copy.labels.reference, value: reference },
  ];
  const cta =
    kind === "confirmation"
      ? renderCta(copy.bookAnother, localizedUrl(PUBLIC_PATHS.booking, locale))
      : "";
  const body = [
    paragraph(copy.greeting(appointment.client.fullName)),
    paragraph(messageCopy.intro, true),
    renderDetailsTable(details),
    renderNotice(copy.appointmentNotice),
    cta,
  ].join("");
  const text = [
    copy.greeting(appointment.client.fullName),
    messageCopy.intro,
    "",
    ...details.map(({ label, value }) => `${label}: ${value}`),
    "",
    copy.appointmentNotice,
    ...(kind === "confirmation"
      ? [
          "",
          `${copy.bookAnother}: ${localizedUrl(PUBLIC_PATHS.booking, locale)}`,
        ]
      : []),
    "",
    plainTextFooter(locale),
  ].join("\n");

  return {
    subject: `${BRAND.name}: ${messageCopy.subject} ${reference}`,
    text,
    html: renderEmailShell({
      locale,
      preheader: messageCopy.preheader,
      heading: messageCopy.heading,
      body,
    }),
  };
}

function orderItems(order: OrderEmailData, locale: Locale): EmailOrderItem[] {
  return order.items.map((item) => ({
    name: item.name,
    quantity: item.qty,
    unitPrice: formatEmailMoney(item.unitPrice, order.currency, locale),
    lineTotal: formatEmailMoney(
      Number(item.unitPrice) * item.qty,
      order.currency,
      locale,
    ),
  }));
}

export function renderCustomerOrderEmail(
  order: OrderEmailData,
  locale: Locale,
): EmailMessage {
  const copy = EMAIL_COPY[locale];
  const reference = emailReference(order.id);
  const items = orderItems(order, locale);
  const total = formatEmailMoney(order.total, order.currency, locale);
  const orderPage = localizedUrl(orderPath(order.id), locale);
  const greeting = order.client?.fullName
    ? paragraph(copy.greeting(order.client.fullName))
    : "";
  const body = [
    greeting,
    paragraph(copy.order.intro, true),
    renderDetailsTable([{ label: copy.labels.reference, value: reference }]),
    '<div style="height:22px;line-height:22px;">&nbsp;</div>',
    renderOrderItemsTable({
      items,
      labels: {
        item: copy.labels.item,
        unitPrice: copy.labels.unitPrice,
        total: copy.labels.lineTotal,
      },
    }),
    `<p style="margin:18px 0 0;color:#3A322B;font-size:17px;font-weight:600;line-height:1.4;text-align:right;">${escapeHtml(copy.labels.total)}: ${escapeHtml(total)}</p>`,
    renderNotice(copy.order.notice),
    renderCta(copy.viewOrder, orderPage),
    paragraph(`${copy.questions} ${CONTACT.email} · ${CONTACT.phone}`, true),
  ].join("");
  const itemLines = items.map(
    (item) =>
      `${item.quantity} × ${item.name} — ${item.unitPrice} — ${item.lineTotal}`,
  );
  const text = [
    ...(order.client?.fullName ? [copy.greeting(order.client.fullName)] : []),
    copy.order.intro,
    `${copy.labels.reference}: ${reference}`,
    "",
    ...itemLines,
    `${copy.labels.total}: ${total}`,
    "",
    copy.order.notice,
    `${copy.viewOrder}: ${orderPage}`,
    `${copy.questions} ${CONTACT.email} / ${CONTACT.phone}`,
    "",
    plainTextFooter(locale),
  ].join("\n");

  return {
    subject: `${BRAND.name}: ${copy.order.subject} ${reference}`,
    text,
    html: renderEmailShell({
      locale,
      preheader: copy.order.preheader,
      heading: copy.order.heading,
      body,
    }),
  };
}

const STAFF_COPY = {
  newBooking: "Uusi ajanvaraus",
  newOrder: "Uusi tilauspyyntö",
  bookingIntro: "Uusi ajanvarauspyyntö on vastaanotettu verkkosivustolta.",
  orderIntro: "Uusi tilauspyyntö on vastaanotettu verkkosivustolta.",
  customer: "Asiakas",
  phone: "Puhelin",
  email: "Sähköposti",
} as const;

export function renderStaffAppointmentEmail(
  appointment: AppointmentEmailData,
): EmailMessage {
  const locale: Locale = "fi";
  const copy = EMAIL_COPY.fi;
  const reference = emailReference(appointment.id);
  const details = [
    { label: STAFF_COPY.customer, value: appointment.client.fullName },
    { label: STAFF_COPY.phone, value: appointment.client.phone },
    { label: STAFF_COPY.email, value: appointment.client.email },
    {
      label: copy.labels.service,
      value:
        appointment.service.staffTitle ??
        bookingServiceTitle(appointment.service.slug, locale) ??
        appointment.service.slug,
    },
    ...(appointment.procedureTitle
      ? [{ label: copy.labels.procedure, value: procedureName(appointment) }]
      : []),
    {
      label: copy.labels.time,
      value: formatEmailDateTime(appointment.start, locale),
    },
    { label: copy.labels.reference, value: reference },
  ];
  const text = [
    STAFF_COPY.bookingIntro,
    "",
    ...details.map(({ label, value }) => `${label}: ${value}`),
    "",
    plainTextFooter(locale),
  ].join("\n");
  return {
    subject: `${STAFF_COPY.newBooking}: ${reference}`,
    text,
    html: renderEmailShell({
      locale,
      preheader: `${STAFF_COPY.newBooking}: ${reference}`,
      heading: STAFF_COPY.newBooking,
      body: `${paragraph(STAFF_COPY.bookingIntro, true)}${renderDetailsTable(details)}`,
    }),
  };
}

export function renderStaffOrderEmail(order: OrderEmailData): EmailMessage {
  const locale: Locale = "fi";
  const copy = EMAIL_COPY.fi;
  const reference = emailReference(order.id);
  const items = orderItems(order, locale);
  const total = formatEmailMoney(order.total, order.currency, locale);
  const customerName = order.client?.fullName ?? "-";
  const details = [
    { label: STAFF_COPY.customer, value: customerName },
    { label: STAFF_COPY.phone, value: order.phone ?? "-" },
    { label: STAFF_COPY.email, value: order.email },
    { label: copy.labels.reference, value: reference },
  ];
  const body = [
    paragraph(STAFF_COPY.orderIntro, true),
    renderDetailsTable(details),
    '<div style="height:22px;line-height:22px;">&nbsp;</div>',
    renderOrderItemsTable({
      items,
      labels: {
        item: copy.labels.item,
        unitPrice: copy.labels.unitPrice,
        total: copy.labels.lineTotal,
      },
    }),
    `<p style="margin:18px 0 0;color:#3A322B;font-size:17px;font-weight:600;line-height:1.4;text-align:right;">${escapeHtml(copy.labels.total)}: ${escapeHtml(total)}</p>`,
  ].join("");
  const text = [
    STAFF_COPY.orderIntro,
    "",
    ...details.map(({ label, value }) => `${label}: ${value}`),
    "",
    ...items.map(
      (item) =>
        `${item.quantity} × ${item.name} — ${item.unitPrice} — ${item.lineTotal}`,
    ),
    `${copy.labels.total}: ${total}`,
    "",
    plainTextFooter(locale),
  ].join("\n");

  return {
    subject: `${STAFF_COPY.newOrder}: ${reference}`,
    text,
    html: renderEmailShell({
      locale,
      preheader: `${STAFF_COPY.newOrder}: ${reference}`,
      heading: STAFF_COPY.newOrder,
      body,
    }),
  };
}

export function renderDeliveryTestEmail(sentAt: Date): EmailMessage {
  const locale: Locale = "fi";
  const heading = "Sähköpostin toimitustesti";
  const intro = `Tämä on Mone Beauty Clinicin valtuutettu sähköpostin toimitustesti (${formatEmailDateTime(sentAt, locale)}). Toimenpiteitä ei tarvita.`;
  return {
    subject: "Mone Beauty Clinic – sähköpostin toimitustesti",
    text: `${intro}\n\n${plainTextFooter(locale)}`,
    html: renderEmailShell({
      locale,
      preheader: "Mone Beauty Clinicin sähköpostin toimitustesti.",
      heading,
      body: paragraph(intro, true),
    }),
  };
}

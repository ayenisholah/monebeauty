import { BRAND, CONTACT } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { orderPath, PUBLIC_PATHS } from "@/lib/public-routes";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import type { AppointmentEmailData, OrderEmailData } from "./messages";
import {
  emailReference,
  formatEmailDateTime,
  formatEmailMoney,
} from "./messages";
import {
  escapeHtml,
  plainTextFooter,
  renderCta,
  renderDetailsTable,
  renderEmailShell,
  renderNotice,
  renderOrderItemsTable,
  type EmailMessage,
} from "./template";

const COPY = {
  fi: {
    greeting: (name: string) => `Hei ${name},`,
    appointment: {
      confirmation: [
        "Ajanvaraus vahvistettu",
        "Ajanvarauksesi on vahvistettu.",
      ],
      rescheduled: [
        "Uusi aika vastaanotettu",
        "Uusi ajanvarausaikasi on vastaanotettu ja odottaa klinikan vahvistusta.",
      ],
      cancellation: ["Ajanvaraus peruttu", "Ajanvarauksesi on peruttu."],
    },
    order: {
      confirmation: ["Tilaus vahvistettu", "Tilauksesi on vahvistettu."],
      cancellation: ["Tilaus peruttu", "Tilauksesi on peruttu."],
    },
    labels: {
      reference: "Viite",
      service: "Palvelu",
      time: "Aika",
      reason: "Syy",
      item: "Tuote",
      unit: "Kappalehinta",
      total: "Yhteensä",
      orderTotal: "Kokonaissumma",
    },
    notice:
      "Maksua ei ole veloitettu verkkosivustolla. Klinikka ottaa yhteyttä, jos jatkotoimia tarvitaan.",
    view: "Näytä tiedot",
    questions: "Kysyttävää?",
  },
  en: {
    greeting: (name: string) => `Hello ${name},`,
    appointment: {
      confirmation: [
        "Appointment confirmed",
        "Your appointment has been confirmed.",
      ],
      rescheduled: [
        "New time received",
        "Your new appointment time has been received and is awaiting clinic confirmation.",
      ],
      cancellation: [
        "Appointment cancelled",
        "Your appointment has been cancelled.",
      ],
    },
    order: {
      confirmation: ["Order confirmed", "Your order has been confirmed."],
      cancellation: ["Order cancelled", "Your order has been cancelled."],
    },
    labels: {
      reference: "Reference",
      service: "Service",
      time: "Time",
      reason: "Reason",
      item: "Item",
      unit: "Unit price",
      total: "Total",
      orderTotal: "Order total",
    },
    notice:
      "No payment has been captured through the website. The clinic will contact you if any next steps are needed.",
    view: "View details",
    questions: "Questions?",
  },
  ru: {
    greeting: (name: string) => `Здравствуйте, ${name}!`,
    appointment: {
      confirmation: ["Запись подтверждена", "Ваша запись подтверждена."],
      rescheduled: [
        "Новое время получено",
        "Новое время записи получено и ожидает подтверждения клиники.",
      ],
      cancellation: ["Запись отменена", "Ваша запись отменена."],
    },
    order: {
      confirmation: ["Заказ подтверждён", "Ваш заказ подтверждён."],
      cancellation: ["Заказ отменён", "Ваш заказ отменён."],
    },
    labels: {
      reference: "Номер",
      service: "Услуга",
      time: "Время",
      reason: "Причина",
      item: "Товар",
      unit: "Цена",
      total: "Сумма",
      orderTotal: "Итого",
    },
    notice:
      "Оплата через сайт не списывалась. Клиника свяжется с вами, если потребуются дальнейшие действия.",
    view: "Открыть детали",
    questions: "Есть вопросы?",
  },
} satisfies Record<Locale, unknown>;

function url(path: string, locale: Locale) {
  return `${siteUrl()}${absoluteLocalizedUrl("", path, locale)}`;
}

function paragraph(text: string, muted = false) {
  return `<p style="margin:0 0 22px;color:${muted ? "#6B6056" : "#3A322B"};font-size:15px;line-height:1.7;">${escapeHtml(text)}</p>`;
}

function orderItems(order: OrderEmailData, locale: Locale) {
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

export function renderOrderLifecycleEmail(
  order: OrderEmailData,
  locale: Locale,
  kind: "confirmation" | "cancellation",
  reason?: string | null,
): EmailMessage {
  const copy = COPY[locale];
  const [heading, intro] = copy.order[kind];
  const reference = emailReference(order.id);
  const items = orderItems(order, locale);
  const total = formatEmailMoney(order.total, order.currency, locale);
  const details = [
    { label: copy.labels.reference, value: reference },
    ...(reason ? [{ label: copy.labels.reason, value: reason }] : []),
  ];
  const body = [
    ...(order.client?.fullName
      ? [paragraph(copy.greeting(order.client.fullName))]
      : []),
    paragraph(intro, true),
    renderDetailsTable(details),
    '<div style="height:22px;line-height:22px;">&nbsp;</div>',
    renderOrderItemsTable({
      items,
      labels: {
        item: copy.labels.item,
        unitPrice: copy.labels.unit,
        total: copy.labels.total,
      },
    }),
    `<p style="margin:18px 0 0;color:#3A322B;font-size:17px;font-weight:600;line-height:1.4;text-align:right;">${escapeHtml(copy.labels.orderTotal)}: ${escapeHtml(total)}</p>`,
    ...(kind === "confirmation" ? [renderNotice(copy.notice)] : []),
    renderCta(copy.view, url(orderPath(order.id), locale)),
    paragraph(`${copy.questions} ${CONTACT.email} · ${CONTACT.phone}`, true),
  ].join("");
  const text = [
    ...(order.client?.fullName ? [copy.greeting(order.client.fullName)] : []),
    intro,
    ...details.map(({ label, value }) => `${label}: ${value}`),
    "",
    ...items.map(
      (item) => `${item.quantity} × ${item.name} — ${item.lineTotal}`,
    ),
    `${copy.labels.orderTotal}: ${total}`,
    ...(kind === "confirmation" ? ["", copy.notice] : []),
    "",
    `${copy.view}: ${url(orderPath(order.id), locale)}`,
    plainTextFooter(locale),
  ].join("\n");
  return {
    subject: `${BRAND.name}: ${heading} ${reference}`,
    text,
    html: renderEmailShell({ locale, preheader: intro, heading, body }),
  };
}

export function renderAppointmentLifecycleEmail(
  appointment: AppointmentEmailData,
  locale: Locale,
  kind: "confirmation" | "rescheduled" | "cancellation",
  reason?: string | null,
): EmailMessage {
  const copy = COPY[locale];
  const [heading, intro] = copy.appointment[kind];
  const reference = emailReference(appointment.id);
  const service =
    appointment.procedureTitle ??
    appointment.service.title ??
    appointment.service.slug;
  const details = [
    { label: copy.labels.service, value: service },
    {
      label: copy.labels.time,
      value: formatEmailDateTime(appointment.start, locale),
    },
    { label: copy.labels.reference, value: reference },
    ...(reason ? [{ label: copy.labels.reason, value: reason }] : []),
  ];
  const body = [
    paragraph(copy.greeting(appointment.client.fullName)),
    paragraph(intro, true),
    renderDetailsTable(details),
    renderCta(copy.view, url(PUBLIC_PATHS.booking, locale)),
    paragraph(`${copy.questions} ${CONTACT.email} · ${CONTACT.phone}`, true),
  ].join("");
  const text = [
    copy.greeting(appointment.client.fullName),
    intro,
    "",
    ...details.map(({ label, value }) => `${label}: ${value}`),
    "",
    `${copy.view}: ${url(PUBLIC_PATHS.booking, locale)}`,
    plainTextFooter(locale),
  ].join("\n");
  return {
    subject: `${BRAND.name}: ${heading} ${reference}`,
    text,
    html: renderEmailShell({ locale, preheader: intro, heading, body }),
  };
}

export function renderCustomEmail({
  locale,
  subject,
  bodyText,
  reference,
}: {
  locale: Locale;
  subject: string;
  bodyText: string;
  reference: string;
}): EmailMessage {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((value) => paragraph(value.replace(/\n/g, " ")))
    .join("");
  const text = `${bodyText}\n\n${COPY[locale].labels.reference}: ${reference}\n\n${plainTextFooter(locale)}`;
  return {
    subject,
    text,
    html: renderEmailShell({
      locale,
      preheader: bodyText.slice(0, 140),
      heading: subject,
      body: `${paragraphs}${renderDetailsTable([{ label: COPY[locale].labels.reference, value: reference }])}`,
    }),
  };
}

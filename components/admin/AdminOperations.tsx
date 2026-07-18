import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AppointmentStatus, OrderStatus, Prisma } from "@prisma/client";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/db";
import { adminHref } from "@/lib/admin-routing";
import { openSlots } from "@/lib/booking";
import {
  retryCommunicationAction,
  updateAppointmentAction,
  updateOrderAction,
} from "@/lib/admin-actions";
import { CommunicationComposer } from "./CommunicationComposer";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { DatePicker, clinicTodayYmd } from "@/components/ui/CalendarPicker";
import { TimePicker } from "@/components/ui/TimePicker";

type SearchParams = Record<string, string | string[] | undefined>;
const orderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PAID",
  "FULFILLED",
  "CANCELLED",
];
const appointmentStatuses: AppointmentStatus[] = [
  "BOOKED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
];
const panel =
  "rounded-[var(--radius)] border border-line-card bg-card p-[clamp(18px,3vw,28px)]";
const input =
  "min-h-[44px] rounded-[4px] border border-line-btn bg-page px-[12px] font-sans text-[15px] text-ink";
const primary =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-ink px-[17px] font-sans text-[12px] font-medium tracking-[.08em] text-white uppercase";
const secondary =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-line-btn px-[17px] font-sans text-[12px] font-medium tracking-[.08em] text-ink uppercase";
const danger =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-red-300 px-[17px] font-sans text-[12px] font-medium tracking-[.08em] text-red-800 uppercase";

function scalar(params: SearchParams, key: string) {
  const raw = params[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function pageNumber(params: SearchParams) {
  return Math.max(1, Number.parseInt(scalar(params, "page"), 10) || 1);
}

function dateRange(from: string, to: string) {
  const range: { gte?: Date; lt?: Date } = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const start = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) range.gte = start;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const end = new Date(`${to}T00:00:00.000Z`);
    if (!Number.isNaN(end.getTime())) {
      end.setUTCDate(end.getUTCDate() + 1);
      range.lt = end;
    }
  }
  return Object.keys(range).length ? range : undefined;
}

function reference(id: string) {
  return id.slice(-8).toUpperCase();
}

function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Helsinki",
  }).format(value);
}

function formatTime(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(value);
}

function money(value: unknown, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    Number(value),
  );
}

function queryHref(
  base: string,
  params: Record<string, string | number | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== "") query.set(key, String(value));
  const suffix = query.toString();
  return suffix ? `${base}?${suffix}` : base;
}

function PageTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h1 className="font-display text-[clamp(38px,5vw,56px)] leading-[1.05] font-medium text-ink">
        {title}
      </h1>
      <p className="mt-[8px] max-w-[720px] font-sans text-[15px] leading-[1.6] text-body">
        {description}
      </p>
    </header>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const active =
    status === "PENDING" || status === "BOOKED" || status === "RESCHEDULED";
  const cancelled = status === "CANCELLED";
  return (
    <span
      className={`inline-flex rounded-full px-[10px] py-[5px] font-sans text-[12px] ${cancelled ? "bg-red-50 text-red-800" : active ? "bg-btn-fill text-ink" : "bg-[#edf3e9] text-[#3e6339]"}`}
    >
      {label}
    </span>
  );
}

function Pagination({
  base,
  page,
  pages,
  params,
}: {
  base: string;
  page: number;
  pages: number;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  return (
    <nav
      className="mt-[18px] flex items-center justify-between font-sans text-[13px]"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link
          className={secondary}
          href={queryHref(base, { ...params, page: page - 1 })}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link
          className={secondary}
          href={queryHref(base, { ...params, page: page + 1 })}
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export async function OrdersAdmin({
  locale,
  id,
  searchParams,
}: {
  locale: Locale;
  id?: string;
  searchParams: SearchParams;
}) {
  const t = await getTranslations({ locale, namespace: "AdminOperations" });
  const base = adminHref(locale, "orders");
  if (id) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        messages: {
          include: { attempts: { orderBy: { attemptedAt: "desc" } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!order) notFound();
    return (
      <div>
        <Link
          href={base}
          className="font-sans text-[13px] text-muted underline"
        >
          ← {t("back")}
        </Link>
        <div className="mt-[14px] flex flex-wrap items-end justify-between gap-[16px]">
          <PageTitle
            title={`${t("orders")} ${reference(order.id)}`}
            description={`${order.client?.fullName ?? order.email} · ${formatDate(order.createdAt, locale)}`}
          />
          <StatusBadge
            status={order.status}
            label={t(`statusLabels.${order.status}`)}
          />
        </div>
        <div className="mt-[22px] grid gap-[18px] xl:grid-cols-[1.25fr_.75fr]">
          <section className={panel}>
            <dl className="grid gap-[14px] font-sans text-[14px] sm:grid-cols-2">
              <Detail
                label={t("contact")}
                value={`${order.email}${order.phone ? ` · ${order.phone}` : ""}`}
              />
              <Detail label={t("locale")} value={order.locale.toUpperCase()} />
              <Detail
                label={t("submitted")}
                value={formatDate(order.createdAt, locale)}
              />
              <Detail
                label={t("total")}
                value={money(order.total, order.currency, locale)}
              />
              {order.notes ? (
                <Detail label={t("notes")} value={order.notes} wide />
              ) : null}
              {order.cancellationReason ? (
                <Detail
                  label={t("reason")}
                  value={order.cancellationReason}
                  wide
                />
              ) : null}
            </dl>
            <div className="mt-[22px] overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse font-sans text-[14px]">
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-t border-line-hair">
                      <td className="py-[12px] pr-[14px]">
                        {item.qty} × {item.name}
                      </td>
                      <td className="py-[12px] text-right">
                        {money(
                          Number(item.unitPrice) * item.qty,
                          order.currency,
                          locale,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className={`${panel} h-fit`}>
            <h2 className="font-display text-[26px] font-medium">
              {t("status")}
            </h2>
            <div className="mt-[14px] flex flex-wrap gap-[8px]">
              {order.status === "PENDING" ? (
                <ActionForm
                  action={updateOrderAction}
                  id={order.id}
                  returnTo={`${base}/${order.id}`}
                  intent="confirm"
                  label={t("confirm")}
                />
              ) : null}
              {order.status === "CONFIRMED" || order.status === "PAID" ? (
                <ActionForm
                  action={updateOrderAction}
                  id={order.id}
                  returnTo={`${base}/${order.id}`}
                  intent="fulfill"
                  label={t("fulfill")}
                />
              ) : null}
            </div>
            {["PENDING", "CONFIRMED", "PAID"].includes(order.status) ? (
              <form
                action={updateOrderAction}
                className="mt-[18px] grid gap-[9px] border-t border-line-hair pt-[16px]"
              >
                <input type="hidden" name="id" value={order.id} />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`${base}/${order.id}`}
                />
                <input type="hidden" name="intent" value="cancel" />
                <label className="font-sans text-[13px] text-muted">
                  {t("reason")}
                  <textarea
                    required
                    minLength={3}
                    maxLength={500}
                    name="reason"
                    rows={3}
                    className={`${input} mt-[6px] w-full py-[9px]`}
                  />
                </label>
                <button className={danger}>{t("cancel")}</button>
              </form>
            ) : null}
          </section>
        </div>
        <div className="mt-[18px]">
          <CommunicationHistory
            messages={order.messages}
            locale={locale}
            returnTo={`${base}/${order.id}`}
            t={t}
          />
        </div>
        <div className="mt-[18px]">
          <CommunicationComposer
            entity="Order"
            id={order.id}
            returnTo={`${base}/${order.id}`}
            email={order.email}
            phone={order.phone}
            labels={composerLabels(t)}
          />
        </div>
      </div>
    );
  }

  const q = scalar(searchParams, "q");
  const rawStatus = scalar(searchParams, "status");
  const from = scalar(searchParams, "from");
  const to = scalar(searchParams, "to");
  const status = orderStatuses.includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : undefined;
  const statusFilter = rawStatus === "ALL" ? undefined : status;
  const page = pageNumber(searchParams);
  const where: Prisma.OrderWhereInput = {
    ...(statusFilter
      ? { status: statusFilter }
      : rawStatus === "ALL"
        ? {}
        : { status: { in: ["PENDING", "CONFIRMED", "PAID"] } }),
    ...(dateRange(from, to) ? { createdAt: dateRange(from, to) } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { client: { fullName: { contains: q, mode: "insensitive" } } },
            { items: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [orders, count] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        client: true,
        items: true,
        messages: {
          include: { attempts: { orderBy: { attemptedAt: "desc" }, take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 25,
      take: 25,
    }),
    prisma.order.count({ where }),
  ]);
  return (
    <div>
      <PageTitle title={t("orders")} description={t("orderDescription")} />
      <FilterForm
        base={base}
        q={q}
        status={rawStatus === "ALL" ? "ALL" : (status ?? "")}
        statuses={orderStatuses}
        from={from}
        to={to}
        t={t}
      />
      <div className="mt-[18px] grid gap-[10px]">
        {orders.length ? (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`${base}/${order.id}`}
              className="grid gap-[10px] rounded-[8px] border border-line-card bg-card p-[16px] transition-colors hover:bg-btn-fill md:grid-cols-[130px_1fr_150px_140px] md:items-center"
            >
              <strong className="font-mono text-[12px] tracking-[.05em]">
                {reference(order.id)}
              </strong>
              <span className="min-w-0 font-sans text-[14px]">
                <strong className="block text-ink">
                  {order.client?.fullName ?? order.email}
                </strong>
                <small className="block truncate text-[12px] text-muted">
                  {order.items
                    .map((item) => `${item.qty}× ${item.name}`)
                    .join(", ")}
                </small>
              </span>
              <span className="font-sans text-[14px]">
                {money(order.total, order.currency, locale)}
              </span>
              <StatusBadge
                status={order.status}
                label={t(`statusLabels.${order.status}`)}
              />
            </Link>
          ))
        ) : (
          <p className={`${panel} font-sans text-[14px] text-muted`}>
            {t("empty")}
          </p>
        )}
      </div>
      <Pagination
        base={base}
        page={page}
        pages={Math.ceil(count / 25)}
        params={{ q, status: rawStatus === "ALL" ? "ALL" : status, from, to }}
      />
    </div>
  );
}

export async function AppointmentsAdmin({
  locale,
  id,
  searchParams,
}: {
  locale: Locale;
  id?: string;
  searchParams: SearchParams;
}) {
  const t = await getTranslations({ locale, namespace: "AdminOperations" });
  const base = adminHref(locale, "appointments");
  if (id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        service: {
          include: {
            contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
          },
        },
        events: { orderBy: { at: "desc" } },
        messages: {
          include: { attempts: { orderBy: { attemptedAt: "desc" } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!appointment) notFound();
    const selectedDate =
      scalar(searchParams, "date") ||
      appointment.start.toISOString().slice(0, 10);
    const slots = ["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(
      appointment.status,
    )
      ? await openSlots({
          dateStr: selectedDate,
          serviceKey: appointment.service.slug,
        })
      : [];
    const service =
      appointment.procedureTitle ??
      appointment.service.contents[0]?.h1 ??
      appointment.service.slug;
    return (
      <div>
        <Link
          href={base}
          className="font-sans text-[13px] text-muted underline"
        >
          ← {t("back")}
        </Link>
        <div className="mt-[14px] flex flex-wrap items-end justify-between gap-[16px]">
          <PageTitle
            title={`${t("appointments")} ${reference(appointment.id)}`}
            description={`${appointment.client.fullName} · ${formatDate(appointment.start, locale)}`}
          />
          <StatusBadge
            status={appointment.status}
            label={t(`statusLabels.${appointment.status}`)}
          />
        </div>
        <div className="mt-[22px] grid gap-[18px] xl:grid-cols-[1.25fr_.75fr]">
          <section className={panel}>
            <dl className="grid gap-[14px] font-sans text-[14px] sm:grid-cols-2">
              <Detail
                label={t("contact")}
                value={`${appointment.client.email} · ${appointment.client.phone}`}
              />
              <Detail
                label={t("locale")}
                value={appointment.locale.toUpperCase()}
              />
              <Detail label={t("service")} value={service} />
              <Detail
                label={t("time")}
                value={formatDate(appointment.start, locale)}
              />
              {appointment.notes ? (
                <Detail label={t("notes")} value={appointment.notes} wide />
              ) : null}
              {appointment.cancellationReason ? (
                <Detail
                  label={t("reason")}
                  value={appointment.cancellationReason}
                  wide
                />
              ) : null}
            </dl>
            {appointment.events.length ? (
              <div className="mt-[22px] border-t border-line-hair pt-[18px]">
                <h2 className="font-display text-[24px] font-medium">
                  {t("history")}
                </h2>
                <div className="mt-[10px] grid gap-[8px] font-sans text-[13px]">
                  {appointment.events.map((event) => (
                    <div
                      key={event.id}
                      className="grid gap-[4px] rounded-[5px] bg-page p-[11px] sm:grid-cols-[150px_1fr]"
                    >
                      <span className="text-muted">
                        {formatDate(event.at, locale)}
                      </span>
                      <span>
                        {event.kind} · {event.actor}
                        {event.reason ? ` · ${event.reason}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          <section className={`${panel} h-fit`}>
            <h2 className="font-display text-[26px] font-medium">
              {t("status")}
            </h2>
            <div className="mt-[14px] flex flex-wrap gap-[8px]">
              {["BOOKED", "RESCHEDULED"].includes(appointment.status) ? (
                <ActionForm
                  action={updateAppointmentAction}
                  id={appointment.id}
                  returnTo={`${base}/${appointment.id}`}
                  intent="confirm"
                  label={t("confirm")}
                />
              ) : null}
              {appointment.status === "CONFIRMED" &&
              appointment.end <= new Date() ? (
                <ActionForm
                  action={updateAppointmentAction}
                  id={appointment.id}
                  returnTo={`${base}/${appointment.id}`}
                  intent="complete"
                  label={t("complete")}
                />
              ) : null}
            </div>
            {["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(
              appointment.status,
            ) ? (
              <>
                <form className="mt-[18px] grid gap-[9px] border-t border-line-hair pt-[16px]">
                  <label className="font-sans text-[13px] text-muted">
                    {t("chooseDate")}
                    <DatePicker
                      name="date"
                      defaultValue={selectedDate}
                      min={clinicTodayYmd()}
                      disableClosedDays
                      ariaLabel={t("chooseDate")}
                      placeholder={t("chooseDate")}
                      className="mt-[6px] w-full"
                    />
                  </label>
                  <button className={secondary}>{t("apply")}</button>
                </form>
                <form
                  action={updateAppointmentAction}
                  className="mt-[12px] grid gap-[9px]"
                >
                  <input type="hidden" name="id" value={appointment.id} />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`${base}/${appointment.id}`}
                  />
                  <input type="hidden" name="intent" value="reschedule" />
                  <label className="font-sans text-[13px] text-muted">
                    {t("chooseTime")}
                    <TimePicker
                      name="start"
                      inline
                      ariaLabel={t("chooseTime")}
                      options={slots.map((slot) => ({
                        value: slot.start,
                        label: formatTime(new Date(slot.start), locale),
                      }))}
                      className="mt-[6px]"
                    />
                  </label>
                  <button className={secondary}>{t("reschedule")}</button>
                </form>
                <form
                  action={updateAppointmentAction}
                  className="mt-[18px] grid gap-[9px] border-t border-line-hair pt-[16px]"
                >
                  <input type="hidden" name="id" value={appointment.id} />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`${base}/${appointment.id}`}
                  />
                  <input type="hidden" name="intent" value="cancel" />
                  <label className="font-sans text-[13px] text-muted">
                    {t("reason")}
                    <textarea
                      required
                      minLength={3}
                      maxLength={500}
                      name="reason"
                      rows={3}
                      className={`${input} mt-[6px] w-full py-[9px]`}
                    />
                  </label>
                  <button className={danger}>{t("cancel")}</button>
                </form>
              </>
            ) : null}
          </section>
        </div>
        <div className="mt-[18px]">
          <CommunicationHistory
            messages={appointment.messages}
            locale={locale}
            returnTo={`${base}/${appointment.id}`}
            t={t}
          />
        </div>
        <div className="mt-[18px]">
          <CommunicationComposer
            entity="Appointment"
            id={appointment.id}
            returnTo={`${base}/${appointment.id}`}
            email={appointment.client.email}
            phone={appointment.client.phone}
            labels={composerLabels(t)}
          />
        </div>
      </div>
    );
  }

  const q = scalar(searchParams, "q");
  const rawStatus = scalar(searchParams, "status");
  const from = scalar(searchParams, "from");
  const to = scalar(searchParams, "to");
  const status = appointmentStatuses.includes(rawStatus as AppointmentStatus)
    ? (rawStatus as AppointmentStatus)
    : undefined;
  const page = pageNumber(searchParams);
  const where: Prisma.AppointmentWhereInput = {
    ...(status
      ? { status }
      : rawStatus === "ALL"
        ? {}
        : { status: { in: ["BOOKED", "CONFIRMED", "RESCHEDULED"] } }),
    ...(dateRange(from, to) ? { start: dateRange(from, to) } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { procedureTitle: { contains: q, mode: "insensitive" } },
            {
              client: {
                OR: [
                  { fullName: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q } },
                ],
              },
            },
            { service: { slug: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [appointments, count] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        client: true,
        service: {
          include: {
            contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
          },
        },
      },
      orderBy: { start: "asc" },
      skip: (page - 1) * 25,
      take: 25,
    }),
    prisma.appointment.count({ where }),
  ]);
  return (
    <div>
      <PageTitle
        title={t("appointments")}
        description={t("appointmentDescription")}
      />
      <FilterForm
        base={base}
        q={q}
        status={rawStatus === "ALL" ? "ALL" : (status ?? "")}
        statuses={appointmentStatuses}
        from={from}
        to={to}
        t={t}
      />
      <div className="mt-[18px] grid gap-[10px]">
        {appointments.length ? (
          appointments.map((appointment) => {
            const service =
              appointment.procedureTitle ??
              appointment.service.contents[0]?.h1 ??
              appointment.service.slug;
            return (
              <Link
                key={appointment.id}
                href={`${base}/${appointment.id}`}
                className="grid gap-[10px] rounded-[8px] border border-line-card bg-card p-[16px] transition-colors hover:bg-btn-fill md:grid-cols-[150px_1fr_150px] md:items-center"
              >
                <span className="font-sans text-[13px]">
                  {formatDate(appointment.start, locale)}
                </span>
                <span className="min-w-0 font-sans text-[14px]">
                  <strong className="block">
                    {appointment.client.fullName}
                  </strong>
                  <small className="block truncate text-[12px] text-muted">
                    {service}
                  </small>
                </span>
                <StatusBadge
                  status={appointment.status}
                  label={t(`statusLabels.${appointment.status}`)}
                />
              </Link>
            );
          })
        ) : (
          <p className={`${panel} font-sans text-[14px] text-muted`}>
            {t("empty")}
          </p>
        )}
      </div>
      <Pagination
        base={base}
        page={page}
        pages={Math.ceil(count / 25)}
        params={{
          q,
          status: rawStatus === "ALL" ? "ALL" : status,
          from,
          to,
        }}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[12px] tracking-[.08em] text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-[4px] whitespace-pre-wrap text-ink">{value}</dd>
    </div>
  );
}

function ActionForm({
  action,
  id,
  returnTo,
  intent,
  label,
}: {
  action: (data: FormData) => void | Promise<void>;
  id: string;
  returnTo: string;
  intent: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="intent" value={intent} />
      <button className={primary}>{label}</button>
    </form>
  );
}

function FilterForm({
  q,
  status,
  statuses,
  from = "",
  to = "",
  t,
}: {
  base: string;
  q: string;
  status: string;
  statuses: readonly string[];
  from?: string;
  to?: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <form className="mt-[20px] grid gap-[8px] md:grid-cols-[minmax(220px,2fr)_minmax(160px,1fr)_minmax(170px,1fr)_minmax(170px,1fr)_auto] md:items-end">
      <input
        name="q"
        defaultValue={q}
        placeholder={t("search")}
        className={`${input} min-w-[240px] flex-1`}
      />
      <ThemedSelect
        name="status"
        defaultValue={status}
        options={[
          { value: "", label: t("active") },
          { value: "ALL", label: t("all") },
          ...statuses.map((item) => ({
            value: item,
            label: t(`statusLabels.${item}`),
          })),
        ]}
      />
      <label className="font-sans text-[13px] text-muted">
        {t("from")}
        <DatePicker
          name="from"
          defaultValue={from}
          clearable
          ariaLabel={t("from")}
          placeholder={t("from")}
          className="mt-[6px]"
        />
      </label>
      <label className="font-sans text-[13px] text-muted">
        {t("until")}
        <DatePicker
          name="to"
          defaultValue={to}
          clearable
          ariaLabel={t("until")}
          placeholder={t("until")}
          className="mt-[6px]"
        />
      </label>
      <button className={secondary}>{t("apply")}</button>
    </form>
  );
}

function CommunicationHistory({
  messages,
  locale,
  returnTo,
  t,
}: {
  messages: Array<{
    id: string;
    channel: string;
    kind: string;
    recipient: string;
    subject: string | null;
    body: string;
    actor: string;
    createdAt: Date;
    attempts: Array<{
      id: string;
      status: string;
      provider: string | null;
      attemptedAt: Date;
    }>;
  }>;
  locale: Locale;
  returnTo: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <section className={panel}>
      <h2 className="font-display text-[26px] font-medium">
        {t("communications")}
      </h2>
      <div className="mt-[14px] grid gap-[10px]">
        {messages.length ? (
          messages.map((message) => {
            const latest = message.attempts[0];
            const accepted = message.attempts.some(
              (attempt) => attempt.status === "ACCEPTED",
            );
            return (
              <article
                key={message.id}
                className="rounded-[6px] border border-line-hair bg-page p-[13px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-[8px] font-sans text-[12px]">
                  <strong>
                    {message.channel} · {message.kind}
                  </strong>
                  <span className="text-muted">
                    {formatDate(message.createdAt, locale)} · {message.actor}
                  </span>
                </div>
                <div className="mt-[6px] font-sans text-[13px] text-body">
                  {message.subject ? (
                    <strong className="mb-[3px] block text-ink">
                      {message.subject}
                    </strong>
                  ) : null}
                  <p className="line-clamp-3 whitespace-pre-wrap">
                    {message.body}
                  </p>
                </div>
                <div className="mt-[8px] flex flex-wrap items-center gap-[8px] font-sans text-[12px] text-muted">
                  <span>{message.recipient}</span>
                  <span>·</span>
                  <span>
                    {latest
                      ? `${t(latest.status.toLowerCase())}${latest.provider ? ` · ${latest.provider}` : ""}`
                      : t("skipped")}
                  </span>
                  <span>
                    · {message.attempts.length} {t("attempts")}
                  </span>
                  {!accepted ? (
                    <form action={retryCommunicationAction}>
                      <input
                        type="hidden"
                        name="messageId"
                        value={message.id}
                      />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button className="underline">{t("retry")}</button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <p className="font-sans text-[14px] text-muted">
            {t("noCommunications")}
          </p>
        )}
      </div>
    </section>
  );
}

function composerLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    title: t("custom"),
    email: t("email"),
    sms: t("sms"),
    to: t("to"),
    subject: t("subject"),
    message: t("message"),
    send: t("send"),
    segments: t("segments"),
    transactional: t("transactional"),
  };
}

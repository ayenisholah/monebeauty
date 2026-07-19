import { redirect } from "next/navigation";
import {
  CalendarCheck,
  EnvelopeSimple,
  HouseLine,
  MapPin,
  Package,
  Phone,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react/ssr";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { accountHref } from "@/lib/account-routing";
import { localizedPath } from "@/lib/seo";
import { PUBLIC_PATHS } from "@/lib/public-routes";
import {
  clientLogoutAction,
  deleteClientAddressAction,
  makeDefaultClientAddressAction,
  saveClientAddressAction,
  updateClientProfileAction,
} from "@/lib/client-account-actions";
import { ChangeRequestForm } from "@/components/account/ChangeRequestForm";
import { Container } from "@/components/ui/Container";
import { CONTACT } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import type { SavedAddress } from "@prisma/client";

const PAGE_SIZE = 10;
type View = "overview" | "appointments" | "orders" | "addresses" | "profile";

const COPY = {
  en: {
    title: "My account", welcome: "Welcome", overview: "Overview", appointments: "Appointments",
    orders: "Orders", addresses: "Saved addresses", profile: "Profile", signOut: "Sign out",
    verified: "Verified email", phone: "Phone", next: "Next appointment", latest: "Latest order",
    noUpcoming: "No upcoming appointments.", noOrders: "No website orders yet.", book: "Book online",
    upcoming: "Upcoming appointments", previous: "Previous appointments", practitioner: "Specialist",
    duration: "Duration", minutes: "min", reference: "Reference", clinic: "Clinic",
    paidAtClinic: "Appointments are paid at the clinic.", policy: "Cancellation policy",
    policyText: "Cancellation or rescheduling less than 24 hours before the appointment may incur 50% of the service cost. A no-show may incur 100%.",
    items: "Items", total: "Total", fulfilment: "Fulfilment", payment: "Payment", orderAddress: "Delivery address used",
    emptyAddress: "No saved addresses.", default: "Default", makeDefault: "Make default", edit: "Edit", remove: "Delete",
    addAddress: "Add address", editAddress: "Edit address", label: "Label", recipient: "Recipient",
    line1: "Address", line2: "Address line 2", postalCode: "Postal code", city: "City", save: "Save",
    profileIntro: "Your verified email is used to protect appointments and orders.", name: "Full name",
    noticeSaved: "Changes saved.", noticeDeleted: "Address deleted.", noticeInvalid: "Please check the entered details.",
    noticeLimit: "You can save up to 10 addresses.", pending: "A change request is awaiting review",
    previousPage: "Previous", nextPage: "Next", countAppointments: "Upcoming", countOrders: "Orders",
  },
  fi: {
    title: "Oma tili", welcome: "Tervetuloa", overview: "Yhteenveto", appointments: "Ajanvaraukset",
    orders: "Tilaukset", addresses: "Tallennetut osoitteet", profile: "Profiili", signOut: "Kirjaudu ulos",
    verified: "Vahvistettu sähköposti", phone: "Puhelin", next: "Seuraava aika", latest: "Viimeisin tilaus",
    noUpcoming: "Ei tulevia ajanvarauksia.", noOrders: "Ei vielä verkkotilauksia.", book: "Varaa aika",
    upcoming: "Tulevat ajanvaraukset", previous: "Aiemmat ajanvaraukset", practitioner: "Asiantuntija",
    duration: "Kesto", minutes: "min", reference: "Viite", clinic: "Klinikka",
    paidAtClinic: "Ajanvaraukset maksetaan klinikalla.", policy: "Peruutusehdot",
    policyText: "Alle 24 tuntia ennen aikaa tehtävästä peruutuksesta tai siirrosta voidaan veloittaa 50 % palvelun hinnasta. Saapumatta jättämisestä voidaan veloittaa 100 %.",
    items: "Tuotteet", total: "Yhteensä", fulfilment: "Toimitus", payment: "Maksu", orderAddress: "Tilauksessa käytetty osoite",
    emptyAddress: "Ei tallennettuja osoitteita.", default: "Oletus", makeDefault: "Aseta oletukseksi", edit: "Muokkaa", remove: "Poista",
    addAddress: "Lisää osoite", editAddress: "Muokkaa osoitetta", label: "Nimi", recipient: "Vastaanottaja",
    line1: "Osoite", line2: "Osoiterivi 2", postalCode: "Postinumero", city: "Kaupunki", save: "Tallenna",
    profileIntro: "Vahvistettua sähköpostia käytetään ajanvarausten ja tilausten suojaamiseen.", name: "Koko nimi",
    noticeSaved: "Muutokset tallennettu.", noticeDeleted: "Osoite poistettu.", noticeInvalid: "Tarkista antamasi tiedot.",
    noticeLimit: "Voit tallentaa enintään 10 osoitetta.", pending: "Muutospyyntö odottaa käsittelyä",
    previousPage: "Edellinen", nextPage: "Seuraava", countAppointments: "Tulevat", countOrders: "Tilaukset",
  },
  ru: {
    title: "Личный кабинет", welcome: "Здравствуйте", overview: "Обзор", appointments: "Записи",
    orders: "Заказы", addresses: "Сохранённые адреса", profile: "Профиль", signOut: "Выйти",
    verified: "Подтверждённый email", phone: "Телефон", next: "Следующая запись", latest: "Последний заказ",
    noUpcoming: "Нет предстоящих записей.", noOrders: "Интернет-заказов пока нет.", book: "Записаться",
    upcoming: "Предстоящие записи", previous: "Прошлые записи", practitioner: "Специалист",
    duration: "Длительность", minutes: "мин", reference: "Номер", clinic: "Клиника",
    paidAtClinic: "Процедуры оплачиваются в клинике.", policy: "Условия отмены",
    policyText: "При отмене или переносе менее чем за 24 часа может взиматься 50% стоимости услуги. При неявке может взиматься 100%.",
    items: "Товары", total: "Итого", fulfilment: "Получение", payment: "Оплата", orderAddress: "Адрес этого заказа",
    emptyAddress: "Нет сохранённых адресов.", default: "По умолчанию", makeDefault: "Сделать основным", edit: "Изменить", remove: "Удалить",
    addAddress: "Добавить адрес", editAddress: "Изменить адрес", label: "Название", recipient: "Получатель",
    line1: "Адрес", line2: "Дополнительная строка", postalCode: "Индекс", city: "Город", save: "Сохранить",
    profileIntro: "Подтверждённый email защищает ваши записи и заказы.", name: "Полное имя",
    noticeSaved: "Изменения сохранены.", noticeDeleted: "Адрес удалён.", noticeInvalid: "Проверьте введённые данные.",
    noticeLimit: "Можно сохранить до 10 адресов.", pending: "Запрос на изменение ожидает рассмотрения",
    previousPage: "Назад", nextPage: "Далее", countAppointments: "Предстоящие", countOrders: "Заказы",
  },
} as const;

const STATUS_LABELS: Record<Locale, Record<string, string>> = {
  en: { BOOKED: "Booked", CONFIRMED: "Confirmed", RESCHEDULED: "Rescheduled", COMPLETED: "Completed", CANCELLED: "Cancelled", PENDING: "Pending", PAID: "Paid", UNPAID: "Unpaid", PROCESSING: "Processing", FULFILLED: "Fulfilled", REFUNDED: "Refunded", PARTIALLY_REFUNDED: "Partly refunded", FAILED: "Failed" },
  fi: { BOOKED: "Varattu", CONFIRMED: "Vahvistettu", RESCHEDULED: "Siirretty", COMPLETED: "Valmis", CANCELLED: "Peruttu", PENDING: "Odottaa", PAID: "Maksettu", UNPAID: "Maksamatta", PROCESSING: "Käsitellään", FULFILLED: "Toimitettu", REFUNDED: "Hyvitetty", PARTIALLY_REFUNDED: "Osittain hyvitetty", FAILED: "Epäonnistui" },
  ru: { BOOKED: "Забронировано", CONFIRMED: "Подтверждено", RESCHEDULED: "Перенесено", COMPLETED: "Завершено", CANCELLED: "Отменено", PENDING: "Ожидает", PAID: "Оплачено", UNPAID: "Не оплачено", PROCESSING: "Обрабатывается", FULFILLED: "Выполнено", REFUNDED: "Возвращено", PARTIALLY_REFUNDED: "Частичный возврат", FAILED: "Ошибка" },
};

type DashboardCopy = (typeof COPY)[Locale];
type AppointmentSummaryData = {
  id: string;
  start: Date;
  end: Date;
  status: string;
  procedureTitle: string | null;
  service: { slug: string; contents: Array<{ h1: string }> };
  practitioner: { name: string };
};
type OrderSummaryData = { id: string; createdAt: Date; status: string; total: unknown };

function pageHref(locale: Locale, view: View, page?: number, edit?: string) {
  const query = new URLSearchParams({ view });
  if (page && page > 1) query.set("page", String(page));
  if (edit) query.set("edit", edit);
  return `${accountHref(locale)}?${query}`;
}

export default async function AccountPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale: raw } = await params;
  const locale = (raw === "en" || raw === "ru" ? raw : "fi") as Locale;
  const user = await currentUser();
  if (!user || user.role !== "CLIENT") redirect(accountHref(locale, "login"));
  const query = await searchParams;
  const view = (["overview", "appointments", "orders", "addresses", "profile"].includes(query.view ?? "") ? query.view : "overview") as View;
  const page = Math.max(1, Number(query.page) || 1);
  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      appointments: {
        orderBy: { start: "desc" },
        include: {
          service: { include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1, select: { h1: true } } } },
          practitioner: { select: { name: true } },
          changeRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      savedAddresses: { orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] },
    },
  });
  if (!client) redirect(accountHref(locale, "login"));
  const t = COPY[locale];
  const now = new Date();
  const upcoming = client.appointments.filter((a) => a.start >= now && a.status !== "CANCELLED").sort((a, b) => a.start.getTime() - b.start.getTime());
  const previous = client.appointments.filter((a) => a.start < now || a.status === "CANCELLED");
  const allAppointments = [...upcoming, ...previous];
  const shownAppointments = allAppointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const shownOrders = client.orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Helsinki" });
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const editing = query.edit ? client.savedAddresses.find((a) => a.id === query.edit) : undefined;
  const notice = query.notice === "saved" ? t.noticeSaved : query.notice === "deleted" ? t.noticeDeleted : query.notice === "limit" ? t.noticeLimit : query.notice === "invalid" ? t.noticeInvalid : null;

  return (
    <section className="bg-page py-[clamp(36px,6vw,82px)]">
      <Container>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-sans text-xs tracking-[.16em] text-muted uppercase">{t.welcome}, {client.fullName}</p>
            <h1 className="mt-2 font-display text-[clamp(40px,6vw,62px)] font-medium text-ink">{t.title}</h1>
            <p className="mt-2 flex items-center gap-2 font-sans text-sm text-body"><EnvelopeSimple size={17} weight="thin" /> {user.email}</p>
          </div>
          <form action={clientLogoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className="inline-flex min-h-11 items-center gap-2 rounded border border-line-btn bg-card px-4 font-sans text-sm hover:bg-btn-fill"><SignOut size={17} />{t.signOut}</button>
          </form>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[230px_1fr]">
          <nav className="h-fit rounded-[8px] border border-line-card bg-card p-2 shadow-card" aria-label={t.title}>
            {([
              ["overview", t.overview, HouseLine], ["appointments", t.appointments, CalendarCheck], ["orders", t.orders, Package],
              ["addresses", t.addresses, MapPin], ["profile", t.profile, UserCircle],
            ] as const).map(([key, label, Icon]) => (
              <a key={key} href={pageHref(locale, key)} className={`flex min-h-11 items-center gap-3 rounded px-3 font-sans text-sm ${view === key ? "bg-btn-fill text-ink" : "text-body hover:bg-page"}`}>
                <Icon size={19} weight="thin" />{label}
              </a>
            ))}
          </nav>

          <main className="min-w-0">
            {notice ? <p role="status" className="mb-4 rounded border border-line-btn bg-btn-fill px-4 py-3 font-sans text-sm">{notice}</p> : null}
            {view === "overview" ? (
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Stat icon={EnvelopeSimple} label={t.verified} value={user.email} />
                  <Stat icon={Phone} label={t.phone} value={client.phone} />
                  <Stat icon={CalendarCheck} label={t.countAppointments} value={String(upcoming.length)} />
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <section className={panel}><h2 className={heading}>{t.next}</h2>{upcoming[0] ? <AppointmentSummary appointment={upcoming[0]} locale={locale} dateTime={dateTime} t={t} /> : <Empty text={t.noUpcoming} />}</section>
                  <section className={panel}><h2 className={heading}>{t.latest}</h2>{client.orders[0] ? <OrderSummary order={client.orders[0]} locale={locale} money={money} t={t} /> : <Empty text={t.noOrders} />}</section>
                </div>
                <a href={localizedPath(PUBLIC_PATHS.booking, locale)} className="inline-flex min-h-11 w-fit items-center rounded bg-accent px-5 font-sans text-xs font-medium tracking-[.12em] text-page uppercase">{t.book}</a>
              </div>
            ) : null}

            {view === "appointments" ? (
              <section><h2 className={heading}>{t.appointments}</h2><div className="mt-4 grid gap-4">
                {shownAppointments.length ? shownAppointments.map((appointment) => {
                  const pending = appointment.changeRequests[0]?.status === "PENDING";
                  const allow = appointment.start > now && appointment.status !== "CANCELLED";
                  return <article key={appointment.id} className={panel}>
                    <AppointmentSummary appointment={appointment} locale={locale} dateTime={dateTime} t={t} />
                    <div className="mt-4 grid gap-2 border-t border-line-hair pt-4 font-sans text-sm text-body sm:grid-cols-2">
                      <p><strong>{t.clinic}:</strong> {CONTACT.address.street}, {CONTACT.address.postalCode} {CONTACT.address.city}</p>
                      <p>{t.paidAtClinic}</p>
                    </div>
                    {pending ? <p className="mt-4 rounded bg-btn-fill px-3 py-2 font-sans text-sm">{t.pending}</p> : allow ? <ChangeRequestForm appointmentId={appointment.id} serviceSlug={appointment.service.slug} locale={locale} /> : null}
                  </article>;
                }) : <Empty text={t.noUpcoming} />}
              </div><Pager locale={locale} view={view} page={page} count={allAppointments.length} t={t} /></section>
            ) : null}

            {view === "orders" ? (
              <section><h2 className={heading}>{t.orders}</h2><div className="mt-4 grid gap-4">
                {shownOrders.length ? shownOrders.map((order) => <article key={order.id} className={panel}>
                  <OrderSummary order={order} locale={locale} money={money} t={t} />
                  <div className="mt-4 grid gap-2 border-t border-line-hair pt-4 font-sans text-sm text-body">
                    <p><strong>{t.items}:</strong> {order.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}</p>
                    <p><strong>{t.fulfilment}:</strong> {order.fulfillmentMethod ?? "—"} · <strong>{t.payment}:</strong> {order.paymentStatus}</p>
                    {order.shippingAddress ? <p><strong>{t.orderAddress}:</strong> {formatAddressSnapshot(order.shippingAddress)}</p> : null}
                  </div>
                </article>) : <Empty text={t.noOrders} />}
              </div><Pager locale={locale} view={view} page={page} count={client.orders.length} t={t} /></section>
            ) : null}

            {view === "addresses" ? (
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <section><h2 className={heading}>{t.addresses}</h2><div className="mt-4 grid gap-3">
                  {client.savedAddresses.length ? client.savedAddresses.map((address) => <article key={address.id} className={panel}>
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-2xl font-medium">{address.label}</h3><p className="mt-2 font-sans text-sm leading-6 text-body">{address.recipientName}<br />{address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />{address.postalCode} {address.city}<br />{address.phone}</p></div>{address.isDefault ? <span className="rounded-full bg-btn-fill px-3 py-1 font-sans text-xs">{t.default}</span> : null}</div>
                    <div className="mt-4 flex flex-wrap gap-2"><a href={pageHref(locale, "addresses", undefined, address.id)} className={smallButton}>{t.edit}</a>{!address.isDefault ? <form action={makeDefaultClientAddressAction}><Hidden locale={locale} id={address.id} /><button className={smallButton}>{t.makeDefault}</button></form> : null}<form action={deleteClientAddressAction}><Hidden locale={locale} id={address.id} /><button className={smallButton}>{t.remove}</button></form></div>
                  </article>) : <Empty text={t.emptyAddress} />}
                </div></section>
                <AddressForm locale={locale} address={editing} t={t} />
              </div>
            ) : null}

            {view === "profile" ? (
              <section className={`${panel} max-w-[720px]`}><h2 className={heading}>{t.profile}</h2><p className="mt-2 font-sans text-sm text-muted">{t.profileIntro}</p>
                <form action={updateClientProfileAction} className="mt-6 grid gap-4"><input type="hidden" name="locale" value={locale} /><Field label={t.name}><input name="fullName" required defaultValue={client.fullName} className={input} /></Field><Field label={t.verified}><input value={user.email} readOnly className={`${input} opacity-70`} /></Field><Field label={t.phone}><input name="phone" required type="tel" defaultValue={client.phone} className={input} /></Field><button className={primaryButton}>{t.save}</button></form>
              </section>
            ) : null}
          </main>
        </div>
      </Container>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof EnvelopeSimple; label: string; value: string }) { return <div className={panel}><Icon size={22} weight="thin" className="text-accent" /><p className="mt-3 font-sans text-xs tracking-[.08em] text-muted uppercase">{label}</p><p className="mt-1 break-words font-sans text-base text-ink">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="mt-4 font-sans text-sm text-muted">{text}</p>; }
function AppointmentSummary({ appointment, locale, dateTime, t }: { appointment: AppointmentSummaryData; locale: Locale; dateTime: Intl.DateTimeFormat; t: DashboardCopy }) { const title = appointment.procedureTitle ?? appointment.service.contents[0]?.h1 ?? appointment.service.slug; return <div><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-display text-[27px] font-medium text-ink">{title}</h3><span className="rounded-full bg-btn-fill px-3 py-1 font-sans text-[11px] uppercase">{STATUS_LABELS[locale][appointment.status] ?? appointment.status}</span></div><p className="mt-2 font-sans text-sm text-body">{dateTime.format(appointment.start)}–{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Helsinki" }).format(appointment.end)}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-sans text-xs text-muted"><span>{t.practitioner}: {appointment.practitioner.name}</span><span>{t.duration}: {Math.round((appointment.end.getTime() - appointment.start.getTime()) / 60000)} {t.minutes}</span><span>{t.reference}: {appointment.id.slice(-8).toUpperCase()}</span></div></div>; }
function OrderSummary({ order, locale, money, t }: { order: OrderSummaryData; locale: Locale; money: Intl.NumberFormat; t: DashboardCopy }) { return <div><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-[27px] font-medium">#{order.id.slice(-8).toUpperCase()}</h3><p className="mt-1 font-sans text-sm text-muted">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(order.createdAt)}</p></div><span className="rounded-full bg-btn-fill px-3 py-1 font-sans text-[11px] uppercase">{STATUS_LABELS[locale][order.status] ?? order.status}</span></div><p className="mt-3 font-sans text-sm"><strong>{t.total}:</strong> {money.format(Number(order.total))}</p></div>; }
function formatAddressSnapshot(value: unknown) { if (!value || typeof value !== "object") return "—"; const a = value as Record<string, unknown>; return [a.name ?? a.recipientName, a.line1 ?? a.address_line_1, a.line2 ?? a.address_line_2, [a.postalCode ?? a.postal_code, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join(", "); }
function Pager({ locale, view, page, count, t }: { locale: Locale; view: View; page: number; count: number; t: DashboardCopy }) { if (count <= PAGE_SIZE) return null; return <div className="mt-5 flex gap-2">{page > 1 ? <a className={smallButton} href={pageHref(locale, view, page - 1)}>{t.previousPage}</a> : null}{page * PAGE_SIZE < count ? <a className={smallButton} href={pageHref(locale, view, page + 1)}>{t.nextPage}</a> : null}</div>; }
function Hidden({ locale, id }: { locale: Locale; id: string }) { return <><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={id} /></>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block font-sans text-xs tracking-[.08em] text-muted uppercase">{label}</span>{children}</label>; }
function AddressForm({ locale, address, t }: { locale: Locale; address?: SavedAddress; t: DashboardCopy }) { return <section className={panel}><h2 className={heading}>{address ? t.editAddress : t.addAddress}</h2><form action={saveClientAddressAction} className="mt-5 grid gap-3"><Hidden locale={locale} id={address?.id ?? ""} /><Field label={t.label}><input name="label" required defaultValue={address?.label ?? ""} className={input} /></Field><Field label={t.recipient}><input name="recipientName" required defaultValue={address?.recipientName ?? ""} className={input} /></Field><Field label={t.phone}><input name="phone" required type="tel" defaultValue={address?.phone ?? ""} className={input} /></Field><Field label={t.line1}><input name="line1" required defaultValue={address?.line1 ?? ""} className={input} /></Field><Field label={t.line2}><input name="line2" defaultValue={address?.line2 ?? ""} className={input} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label={t.postalCode}><input name="postalCode" required pattern="[0-9]{5}" defaultValue={address?.postalCode ?? ""} className={input} /></Field><Field label={t.city}><input name="city" required defaultValue={address?.city ?? ""} className={input} /></Field></div><label className="flex items-center gap-2 font-sans text-sm"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? false} />{t.default}</label><button className={primaryButton}>{t.save}</button></form></section>; }

const panel = "rounded-[8px] border border-line-card bg-card p-[clamp(18px,3vw,26px)] shadow-card";
const heading = "font-display text-[clamp(28px,4vw,38px)] font-medium text-ink";
const input = "min-h-11 w-full rounded border border-line-btn bg-page px-3 font-sans text-sm outline-none focus:border-accent";
const smallButton = "inline-flex min-h-10 items-center rounded border border-line-btn bg-card px-3 font-sans text-xs hover:bg-btn-fill";
const primaryButton = "min-h-11 w-fit rounded bg-accent px-5 font-sans text-xs font-medium tracking-[.1em] text-page uppercase";

import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Locale as DbLocale, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { groupBy } from "@/lib/collections";
import { currentUser } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import {
  ADMIN_SEGMENTS,
  LEGACY_ADMIN_SEGMENTS,
  adminBase,
  adminHref,
  type AdminModule,
} from "@/lib/admin-routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";
import { localizedPath } from "@/lib/seo";
import {
  adminLoginAction,
  anonymizeClientAction,
  removeArticleAction,
  removeContentPageAction,
  removePricingAction,
  removeProductAction,
  removeServiceAction,
  removeTechnologyAction,
  saveArticleAction,
  saveClientAction,
  saveContentPageAction,
  savePricingAction,
  saveProductAction,
  saveServiceAction,
  saveTechnologyAction,
  updateChatAction,
} from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { MediaField } from "@/components/admin/MediaField";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { SharedCalendar } from "@/components/calendar/SharedCalendar";
import { CalendarSetup } from "@/components/calendar/CalendarSetup";
import {
  AppointmentsAdmin,
  OrdersAdmin,
} from "@/components/admin/AdminOperations";
import mediaAssets from "@/content/generated/assets.json";
import { bootstrapProcedureMedia } from "@/content/procedure-media";
import { parseProcedures } from "@/lib/procedures";
import {
  getRecentBusinessActivity,
  type BusinessActivityAction,
  type BusinessActivityCategory,
} from "@/lib/admin-activity";

const locales: DbLocale[] = ["fi", "en", "ru"];
const assets = Array.from(
  new Set([
    ...(mediaAssets as string[])
      .filter((path) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(path))
      .map((path) => `/media/${path}`),
    "/media/home/arosha.jpg",
    "/media/home/brows.jpg",
    "/media/home/facial.jpg",
  ]),
);

type SearchParams = Record<string, string | string[] | undefined>;
type Copy = ReturnType<typeof makeCopy>;
type ServiceRow = Prisma.ServiceGetPayload<{
  include: { contents: true; procedureMedia: true };
}>;
type TechnologyRow = Prisma.TechnologyGetPayload<{
  include: { contents: true };
}>;
type ProductRow = Prisma.ProductGetPayload<{ include: { contents: true } }>;
type PricingRow = Prisma.PricingItemGetPayload<{ include: { contents: true } }>;
type ArticleRow = Prisma.ArticleGetPayload<{ include: { contents: true } }>;

function makeCopy(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    appName: t("appName"),
    menu: t("menu"),
    close: t("close"),
    logout: t("logout"),
    locale: t("locale"),
    login: {
      eyebrow: t("login.eyebrow"),
      title: t("login.title"),
      email: t("login.email"),
      password: t("login.password"),
      submit: t("login.submit"),
      invalid: t("login.invalid"),
    },
    dashboard: {
      title: t("dashboard.title"),
      subtitle: t("dashboard.subtitle"),
      warnings: t("dashboard.warnings"),
      noWarnings: t("dashboard.noWarnings"),
      recent: t("dashboard.recent"),
      emptyActivity: t("dashboard.emptyActivity"),
      activityCategory: (category: BusinessActivityCategory) =>
        t(`dashboard.activity.categories.${category}`),
      activityAction: (action: BusinessActivityAction) =>
        t(`dashboard.activity.actions.${action}`),
      activityStatus: (status: string) =>
        t(`dashboard.activity.statuses.${status}`),
      quick: t("dashboard.quick"),
      needsAction: (count: number) => t("dashboard.needsAction", { count }),
    },
    nav: {
      dashboard: t("nav.dashboard"),
      clients: t("nav.clients"),
      calendar: t("nav.calendar"),
      appointments: t("nav.appointments"),
      orders: t("nav.orders"),
      services: t("nav.services"),
      technologies: t("nav.technologies"),
      content: t("nav.content"),
      products: t("nav.products"),
      pricing: t("nav.pricing"),
      blog: t("nav.blog"),
      chat: t("nav.chat"),
    },
    modules: {
      clients: t("modules.clients"),
      calendar: t("modules.calendar"),
      appointments: t("modules.appointments"),
      orders: t("modules.orders"),
      services: t("modules.services"),
      technologies: t("modules.technologies"),
      content: t("modules.content"),
      products: t("modules.products"),
      pricing: t("modules.pricing"),
      blog: t("modules.blog"),
      chat: t("modules.chat"),
    },
    common: {
      new: t("common.new"),
      save: t("common.save"),
      delete: t("common.delete"),
      archive: t("common.archive"),
      restore: t("common.restore"),
      edit: t("common.edit"),
      search: t("common.search"),
      empty: t("common.empty"),
      actions: t("common.actions"),
      status: t("common.status"),
      draft: t("common.draft"),
      published: t("common.published"),
      archived: t("common.archived"),
      global: t("common.global"),
      locales: t("common.locales"),
      slug: t("common.slug"),
      publicPath: t("common.publicPath"),
      order: t("common.order"),
      images: t("common.images"),
      price: t("common.price"),
      category: t("common.category"),
      title: t("common.title"),
      body: t("common.body"),
      summary: t("common.summary"),
      seoTitle: t("common.seoTitle"),
      seoDescription: t("common.seoDescription"),
      imageAlt: t("common.imageAlt"),
      label: t("common.label"),
      unit: t("common.unit"),
      preview: t("common.preview"),
      back: t("common.back"),
      confirmDelete: t("common.confirmDelete"),
      required: t("common.required"),
      updated: t("common.updated"),
      notProvided: t("common.notProvided"),
    },
  };
}

function queryString(params: SearchParams) {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    for (const value of Array.isArray(raw) ? raw : raw ? [raw] : [])
      query.append(key, value);
  }
  const string = query.toString();
  return string ? `?${string}` : "";
}

function moduleFromSegment(segment?: string): AdminModule | undefined {
  return (Object.entries(ADMIN_SEGMENTS).find(
    ([, value]) => value === segment,
  )?.[0] ?? (segment === undefined ? "dashboard" : undefined)) as
    AdminModule | undefined;
}

export async function AdminRouter({
  locale,
  segments,
  searchParams,
}: {
  locale: Locale;
  segments: string[];
  searchParams: SearchParams;
}) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = makeCopy(t);
  const mediaMessages = t.raw("media");
  const [first, ...rest] = segments;
  const legacy = first ? LEGACY_ADMIN_SEGMENTS[first] : undefined;
  if (legacy) {
    const translatedRest = rest.map(
      (segment) => LEGACY_ADMIN_SEGMENTS[segment] ?? segment,
    );
    permanentRedirect(
      `${adminBase(locale)}/${[legacy, ...translatedRest].join("/")}${queryString(searchParams)}`,
    );
  }

  if (first === ADMIN_SEGMENTS.login)
    return <Login locale={locale} copy={copy} searchParams={searchParams} />;
  if (first === "ulos") notFound();

  const user = await currentUser();
  if (!user) redirect(adminHref(locale, "login"));
  if (user.role !== "ADMIN")
    redirect(localizedPath(PUBLIC_PATHS.staff, locale));

  const adminModule = moduleFromSegment(first);
  if (!adminModule || adminModule === "login") notFound();
  const content = await renderModule({
    adminModule,
    id: rest[0],
    locale,
    copy,
    searchParams,
  });

  const feedback = searchParams.error
    ? copy.common.required
    : searchParams.saved
      ? copy.common.updated
      : null;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ Admin: { media: mediaMessages } }}
    >
      <AdminShell
        locale={locale}
        labels={{
          appName: copy.appName,
          menu: copy.menu,
          close: copy.close,
          logout: copy.logout,
          locale: copy.locale,
          nav: copy.nav,
        }}
        user={user}
        wide={adminModule === "calendar"}
      >
        {feedback ? (
          <p
            role="status"
            className="mb-[18px] rounded-[5px] border border-line-btn bg-btn-fill px-[14px] py-[11px] font-sans text-[14px] text-ink"
          >
            {feedback}
          </p>
        ) : null}
        {content}
      </AdminShell>
    </NextIntlClientProvider>
  );
}

async function Login({
  locale,
  copy,
  searchParams,
}: {
  locale: Locale;
  copy: Copy;
  searchParams: SearchParams;
}) {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect(adminBase(locale));
  return (
    <main className="flex min-h-screen items-center justify-center px-[20px] py-[48px]">
      <form
        action={adminLoginAction}
        className="w-full max-w-[420px] rounded-[var(--radius)] border border-line-card bg-card p-[clamp(22px,4vw,36px)] shadow-card"
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="font-sans text-[12px] tracking-[.16em] text-muted uppercase">
          {copy.login.eyebrow}
        </div>
        <h1 className="mt-[10px] font-display text-[clamp(34px,5vw,48px)] leading-[1.05] font-medium">
          {copy.login.title}
        </h1>
        {searchParams.error ? (
          <p
            role="alert"
            className="mt-[18px] rounded-[4px] border border-line-btn bg-btn-fill px-[12px] py-[10px] font-sans text-[14px]"
          >
            {copy.login.invalid}
          </p>
        ) : null}
        <Field label={copy.login.email}>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className={inputCls}
          />
        </Field>
        <Field label={copy.login.password}>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputCls}
          />
        </Field>
        <button className={`${primaryButton} mt-[24px] w-full`}>
          {copy.login.submit}
        </button>
      </form>
    </main>
  );
}

async function renderModule({
  adminModule,
  id,
  locale,
  copy,
  searchParams,
}: {
  adminModule: AdminModule;
  id?: string;
  locale: Locale;
  copy: Copy;
  searchParams: SearchParams;
}) {
  if (adminModule === "dashboard")
    return <Dashboard locale={locale} copy={copy} />;
  if (adminModule === "clients")
    return (
      <Clients
        locale={locale}
        id={id}
        copy={copy}
        searchParams={searchParams}
      />
    );
  if (adminModule === "calendar") {
    const calendarHref = adminHref(locale, "calendar");
    if (id === "asetukset")
      return <CalendarSetup locale={locale} calendarHref={calendarHref} />;
    if (id) notFound();
    return (
      <SharedCalendar locale={locale} setupHref={`${calendarHref}/asetukset`} />
    );
  }
  if (adminModule === "appointments")
    return (
      <AppointmentsAdmin locale={locale} id={id} searchParams={searchParams} />
    );
  if (adminModule === "orders")
    return <OrdersAdmin locale={locale} id={id} searchParams={searchParams} />;
  if (adminModule === "services")
    return <Services locale={locale} id={id} copy={copy} />;
  if (adminModule === "technologies")
    return <Technologies locale={locale} id={id} copy={copy} />;
  if (adminModule === "content")
    return <ContentPages locale={locale} id={id} copy={copy} />;
  if (adminModule === "products")
    return <Products locale={locale} id={id} copy={copy} />;
  if (adminModule === "pricing")
    return <Pricing locale={locale} id={id} copy={copy} />;
  if (adminModule === "blog")
    return <Articles locale={locale} id={id} copy={copy} />;
  if (adminModule === "chat")
    return (
      <Chats locale={locale} id={id} copy={copy} searchParams={searchParams} />
    );
  notFound();
}

async function Dashboard({ locale, copy }: { locale: Locale; copy: Copy }) {
  const [
    clients,
    appointments,
    orders,
    appointmentsNeedingAction,
    ordersNeedingAction,
    services,
    technologies,
    products,
    articles,
    handoffs,
    serviceRows,
    technologyRows,
    productRows,
    recentActivity,
  ] = await Promise.all([
    prisma.client.count({ where: { archivedAt: null } }),
    prisma.appointment.count(),
    prisma.order.count(),
    prisma.appointment.count({
      where: { status: { in: ["BOOKED", "RESCHEDULED"] } },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.service.count({ where: { archivedAt: null } }),
    prisma.technology.count({ where: { archivedAt: null } }),
    prisma.product.count({ where: { archivedAt: null } }),
    prisma.article.count({ where: { archivedAt: null } }),
    prisma.chatSession.count({
      where: { handoffRequested: true, status: "OPEN", archivedAt: null },
    }),
    prisma.service.findMany({
      where: { archivedAt: null },
      select: {
        slug: true,
        contents: { select: { locale: true, status: true } },
      },
    }),
    prisma.technology.findMany({
      where: { archivedAt: null },
      select: {
        slug: true,
        contents: { select: { locale: true, status: true } },
      },
    }),
    prisma.product.findMany({
      where: { archivedAt: null },
      select: {
        slug: true,
        contents: { select: { locale: true, status: true } },
      },
    }),
    getRecentBusinessActivity(locale),
  ]);
  const counts = {
    clients,
    appointments,
    orders,
    services,
    technologies,
    products,
    articles,
    handoffs,
  };
  const cards: Array<{
    key: keyof typeof counts;
    module: Exclude<AdminModule, "login" | "dashboard"> | "dashboard";
    needsAction?: number;
  }> = [
    { key: "clients", module: "clients" },
    {
      key: "appointments",
      module: "appointments",
      needsAction: appointmentsNeedingAction,
    },
    { key: "orders", module: "orders", needsAction: ordersNeedingAction },
    { key: "services", module: "services" },
    { key: "technologies", module: "technologies" },
    { key: "products", module: "products" },
    { key: "articles", module: "blog" },
    { key: "handoffs", module: "chat" },
  ];
  const warnings = [
    ...publicationWarnings("Service", serviceRows),
    ...publicationWarnings("Technology", technologyRows),
    ...publicationWarnings("Product", productRows),
  ];
  return (
    <div>
      <PageHeader
        title={copy.dashboard.title}
        description={copy.dashboard.subtitle}
      />
      <div className="mt-[24px] grid grid-cols-2 gap-[12px] lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={adminHref(locale, card.module)}
            className={cardCls}
          >
            <span className="font-sans text-meta tracking-[.1em] text-muted uppercase">
              {
                copy.nav[
                  card.module === "dashboard" ? "dashboard" : card.module
                ]
              }
            </span>
            <strong className="mt-[10px] block font-display text-[36px] font-medium">
              {counts[card.key]}
            </strong>
            {card.needsAction ? (
              <span className="mt-[5px] block font-sans text-[12px] text-muted">
                {copy.dashboard.needsAction(card.needsAction)}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="mt-[24px] grid gap-[20px] xl:grid-cols-2">
        <section className={panelCls}>
          <h2 className={sectionTitle}>{copy.dashboard.warnings}</h2>
          {warnings.length ? (
            <ul className="mt-[14px] grid gap-[8px] font-sans text-[14px] text-body">
              {warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-[4px] bg-btn-fill px-[12px] py-[9px]"
                >
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-[12px] font-sans text-[14px] text-muted">
              {copy.dashboard.noWarnings}
            </p>
          )}
        </section>
        <section className={panelCls}>
          <h2 className={sectionTitle}>{copy.dashboard.quick}</h2>
          <div className="mt-[14px] flex flex-wrap gap-[8px]">
            {(
              [
                "services",
                "technologies",
                "content",
                "products",
                "pricing",
                "blog",
              ] as AdminModule[]
            ).map((module) => (
              <Link
                key={module}
                href={adminHref(locale, module, "uusi")}
                className={secondaryButton}
              >
                {copy.common.new} {copy.nav[module as keyof typeof copy.nav]}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className={`${panelCls} mt-[20px]`}>
        <h2 className={sectionTitle}>{copy.dashboard.recent}</h2>
        {recentActivity.length ? (
          <ul className="divide-line border-line mt-[12px] divide-y border-y">
            {recentActivity.map((entry) => {
              const content = (
                <div className="grid gap-[8px] px-[8px] py-[14px] sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:gap-[16px]">
                  <span className="font-sans text-[12px] tracking-[.08em] text-muted uppercase">
                    {copy.dashboard.activityCategory(entry.category)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-[14px] font-medium text-body">
                      {copy.dashboard.activityAction(entry.action)}
                      {entry.subject ? ` · ${entry.subject}` : ""}
                    </span>
                    {entry.detail ? (
                      <span className="mt-[3px] block truncate font-sans text-[13px] text-muted">
                        {entry.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-[10px] sm:justify-end">
                    {entry.status ? (
                      <span className="rounded-full bg-btn-fill px-[9px] py-[4px] font-sans text-[11px] tracking-[.06em] text-body uppercase">
                        {copy.dashboard.activityStatus(entry.status)}
                      </span>
                    ) : null}
                    <time className="font-sans text-[12px] whitespace-nowrap text-muted">
                      {formatDate(entry.at, locale)}
                    </time>
                  </span>
                </div>
              );
              return (
                <li key={entry.id}>
                  {entry.href ? (
                    <Link
                      href={entry.href}
                      className="block transition-colors hover:bg-btn-fill focus-visible:bg-btn-fill focus-visible:outline-none"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-[12px] font-sans text-[14px] text-muted">
            {copy.dashboard.emptyActivity}
          </p>
        )}
      </section>
    </div>
  );
}

function publicationWarnings(
  entity: string,
  rows: Array<{
    slug: string;
    contents: Array<{ locale: DbLocale; status: string }>;
  }>,
) {
  return rows.flatMap((row) => {
    const published = new Set(
      row.contents
        .filter((content) => content.status === "PUBLISHED")
        .map((content) => content.locale),
    );
    const missing = locales.filter((locale) => !published.has(locale));
    return missing.length
      ? [`${entity} · ${row.slug}: ${missing.join(", ")}`]
      : [];
  });
}

async function Clients({
  locale,
  id,
  copy,
  searchParams,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
  searchParams: SearchParams;
}) {
  const base = adminHref(locale, "clients");
  if (id) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { start: "desc" },
        },
        orders: { include: { items: true }, orderBy: { createdAt: "desc" } },
        chatSessions: { orderBy: { updatedAt: "desc" } },
      },
    });
    if (!client) notFound();
    return (
      <div>
        <Back href={base} label={copy.common.back} />
        <PageHeader
          title={client.fullName}
          description={`${client.email} · ${client.phone}`}
        />
        <form action={saveClientAction} className={`${panelCls} mt-[22px]`}>
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="returnTo" value={`${base}/${client.id}`} />
          <div className="grid gap-[14px] md:grid-cols-3">
            <Field label="Name">
              <input
                name="fullName"
                required
                defaultValue={client.fullName}
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                defaultValue={client.email}
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                name="phone"
                required
                defaultValue={client.phone}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="mt-[14px] grid gap-[14px] lg:grid-cols-2">
            <Field label="Notes">
              <textarea
                name="notes"
                rows={5}
                defaultValue={client.notes ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Contraindications">
              <textarea
                name="contraindications"
                rows={5}
                defaultValue={client.contraindications ?? ""}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="mt-[14px] flex flex-wrap items-center gap-[16px]">
            <Check
              name="consentMarketing"
              label="Marketing consent"
              checked={client.consentMarketing}
            />
            <Check
              name="archived"
              label={copy.common.archived}
              checked={Boolean(client.archivedAt)}
            />
            <button className={primaryButton}>{copy.common.save}</button>
            <a
              href={`/api/admin/clients/${client.id}/export`}
              className={secondaryButton}
            >
              GDPR export
            </a>
          </div>
        </form>
        <form action={anonymizeClientAction} className="mt-[12px]">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="returnTo" value={`${base}/${client.id}`} />
          <button className={dangerButton}>GDPR anonymize</button>
        </form>
        <History title="Appointments" empty={copy.common.empty}>
          {client.appointments.map((item) => (
            <Link
              href={adminHref(locale, "appointments", item.id)}
              key={item.id}
              className={appointmentHistoryRow}
            >
              <span>{formatDate(item.start, locale)}</span>
              <strong>
                {item.procedureTitle ?? item.service.slug}
                {item.procedurePrice ? ` · ${item.procedurePrice}` : ""}
              </strong>
              <span>{item.status}</span>
            </Link>
          ))}
        </History>
        <History title="Orders" empty={copy.common.empty}>
          {client.orders.map((item) => (
            <Link
              href={adminHref(locale, "orders", item.id)}
              key={item.id}
              className={historyRow}
            >
              <span>{formatDate(item.createdAt, locale)}</span>
              <strong>{item.items.map((line) => line.name).join(", ")}</strong>
              <span>
                {Number(item.total).toFixed(2)} {item.currency}
              </span>
              <span>{item.status}</span>
            </Link>
          ))}
        </History>
      </div>
    );
  }
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <PageHeader title={copy.modules.clients} />
      <form className="mt-[18px] flex gap-[8px]">
        <input
          name="q"
          defaultValue={q}
          placeholder={copy.common.search}
          className={`${inputCls} max-w-[420px]`}
        />
        <button className={secondaryButton}>{copy.common.search}</button>
      </form>
      <RecordList empty={copy.common.empty}>
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`${base}/${client.id}`}
            className={recordRow}
          >
            <span className="min-w-0">
              <strong className="block text-compact leading-[1.35]">
                {client.fullName}
              </strong>
              <small className="mt-[5px] flex flex-wrap gap-x-[12px] gap-y-[3px] text-label leading-[1.45] text-muted">
                <span className="break-all">{client.email}</span>
                <span className="whitespace-nowrap">{client.phone}</span>
              </small>
            </span>
            <Status archived={Boolean(client.archivedAt)} copy={copy} />
          </Link>
        ))}
      </RecordList>
    </div>
  );
}

async function Services({
  locale,
  id,
  copy,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
}) {
  const base = adminHref(locale, "services");
  if (id) {
    const row =
      id === "uusi"
        ? null
        : await prisma.service.findUnique({
            where: { id },
            include: { contents: true, procedureMedia: true },
          });
    if (id !== "uusi" && !row) notFound();
    return (
      <EntityForm
        title={row?.slug ?? `${copy.common.new} ${copy.modules.services}`}
        base={base}
        save={saveServiceAction}
        remove={row ? removeServiceAction : undefined}
        id={row?.id}
        copy={copy}
      >
        <ServiceEditor row={row} copy={copy} />
      </EntityForm>
    );
  }
  const rows = await prisma.service.findMany({
    include: { contents: true },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });
  return (
    <Collection title={copy.modules.services} base={base} copy={copy}>
      {rows.map((row) => (
        <EntityLink
          key={row.id}
          href={`${base}/${row.id}`}
          title={localizedName(row.contents, locale, "h1") || row.slug}
          subtitle={row.publicPath || row.slug}
          archived={Boolean(row.archivedAt)}
          copy={copy}
        />
      ))}
    </Collection>
  );
}

function ServiceEditor({ row, copy }: { row: ServiceRow | null; copy: Copy }) {
  const byLocale = new Map(row?.contents.map((item) => [item.locale, item]));
  const mediaDefinitions = row ? bootstrapProcedureMedia(row.slug) : [];
  const savedMedia = new Map(
    row?.procedureMedia.map((item) => [item.key, item]),
  );
  const referenceLocale = byLocale.has("en")
    ? "en"
    : byLocale.has("fi")
      ? "fi"
      : "ru";
  const currentProcedures = parseProcedures(
    byLocale.get(referenceLocale)?.whatItIs ?? "",
  );
  const unmatchedProcedures = currentProcedures.filter(
    (procedure) =>
      !mediaDefinitions.some((definition) =>
        definition.identities[referenceLocale].some(
          (identity) =>
            identity.group === procedure.group &&
            identity.title === procedure.title,
        ),
      ),
  );
  return (
    <>
      <EditorSection title={copy.common.global}>
        <div className={globalGrid}>
          <Field label={copy.common.slug}>
            <input
              name="slug"
              required
              defaultValue={row?.slug ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.publicPath}>
            <input
              name="publicPath"
              required
              defaultValue={row?.publicPath ?? ""}
              placeholder="/palvelut/..."
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.category}>
            <ThemedSelect
              name="category"
              defaultValue={row?.category ?? "FACE"}
              options={[
                "FACE",
                "BODY",
                "HAIR",
                "INJECTABLE",
                "DEVICE",
                "LASER",
                "CONSULTATION",
              ].map((item) => ({ value: item, label: item }))}
            />
          </Field>
          <Field label="Duration (min)">
            <input
              name="durationMin"
              type="number"
              min="5"
              defaultValue={row?.durationMin ?? 60}
              className={inputCls}
            />
          </Field>
          <Field label="Price from">
            <input
              name="priceFrom"
              type="number"
              step="0.01"
              defaultValue={row?.priceFrom ? Number(row.priceFrom) : ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.order}>
            <input
              name="order"
              type="number"
              defaultValue={row?.order ?? 0}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-[14px]">
          <MediaField
            name="images"
            label={copy.common.images}
            defaultValue={row?.images.join("\n")}
            assets={assets}
          />
        </div>
        <div className="mt-[12px] flex gap-[18px]">
          <Check
            name="bookable"
            label="Bookable"
            checked={row?.bookable ?? true}
          />
          <Check
            name="archived"
            label={copy.common.archived}
            checked={Boolean(row?.archivedAt)}
          />
        </div>
      </EditorSection>
      {mediaDefinitions.length > 0 ? (
        <EditorSection title="Treatment card images">
          <p className="mb-[16px] text-compact leading-[1.6] text-muted">
            Each image is bound to a stable treatment identity and shared by all
            locales. Service gallery images above remain the hero source.
          </p>
          {unmatchedProcedures.length > 0 ? (
            <p className="mb-[16px] rounded-[6px] border border-line-card-hover bg-alt p-[12px] text-compact leading-[1.55] text-ink">
              {unmatchedProcedures.length} treatment
              {unmatchedProcedures.length === 1 ? " is" : "s are"} not matched
              to the media registry. Save approved content first, then refresh
              the registry before publishing the new cards.
            </p>
          ) : null}
          <div className="grid gap-[14px] lg:grid-cols-2">
            {mediaDefinitions.map((definition, index) => (
              <div
                key={definition.key}
                className="rounded-[8px] border border-line-card bg-page p-[14px]"
              >
                <input
                  type="hidden"
                  name="procedureMediaKey"
                  value={definition.key}
                />
                <MediaField
                  name={`procedureImage_${definition.key}`}
                  label={`${String(index + 1).padStart(2, "0")} · ${definition.identities.en.map((item) => item.title).join(" / ")}`}
                  defaultValue={
                    savedMedia.get(definition.key)?.image ?? definition.image
                  }
                  assets={assets}
                />
              </div>
            ))}
          </div>
        </EditorSection>
      ) : null}
      <LocaleEditors title={copy.common.locales}>
        {locales.map((locale) => {
          const item = byLocale.get(locale);
          return (
            <LocaleCard
              key={locale}
              locale={locale}
              status={item?.status}
              copy={copy}
            >
              <Field label={copy.common.title}>
                <input
                  name={`h1_${locale}`}
                  defaultValue={item?.h1 ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.summary}>
                <textarea
                  name={`shortDesc_${locale}`}
                  rows={3}
                  defaultValue={item?.shortDesc ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.body}>
                <textarea
                  name={`body_${locale}`}
                  rows={8}
                  defaultValue={item?.whatItIs ?? ""}
                  className={inputCls}
                />
              </Field>
              <SeoFields locale={locale} data={item} copy={copy} />
            </LocaleCard>
          );
        })}
      </LocaleEditors>
    </>
  );
}

async function Technologies({
  locale,
  id,
  copy,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
}) {
  const base = adminHref(locale, "technologies");
  if (id) {
    const [row, services] = await Promise.all([
      id === "uusi"
        ? null
        : prisma.technology.findUnique({
            where: { id },
            include: { contents: true },
          }),
      prisma.service.findMany({
        where: { archivedAt: null },
        orderBy: { slug: "asc" },
        select: { id: true, slug: true },
      }),
    ]);
    if (id !== "uusi" && !row) notFound();
    return (
      <EntityForm
        title={row?.slug ?? `${copy.common.new} ${copy.modules.technologies}`}
        base={base}
        save={saveTechnologyAction}
        remove={row ? removeTechnologyAction : undefined}
        id={row?.id}
        copy={copy}
      >
        <TechnologyEditor row={row} services={services} copy={copy} />
      </EntityForm>
    );
  }
  const rows = await prisma.technology.findMany({
    include: { contents: true },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });
  return (
    <Collection title={copy.modules.technologies} base={base} copy={copy}>
      {rows.map((row) => (
        <EntityLink
          key={row.id}
          href={`${base}/${row.id}`}
          title={localizedName(row.contents, locale, "name") || row.slug}
          subtitle={row.publicPath}
          archived={Boolean(row.archivedAt)}
          copy={copy}
        />
      ))}
    </Collection>
  );
}

function TechnologyEditor({
  row,
  services,
  copy,
}: {
  row: TechnologyRow | null;
  services: { id: string; slug: string }[];
  copy: Copy;
}) {
  const byLocale = new Map(row?.contents.map((item) => [item.locale, item]));
  return (
    <>
      <EditorSection title={copy.common.global}>
        <div className={globalGrid}>
          <Field label={copy.common.slug}>
            <input
              name="slug"
              required
              defaultValue={row?.slug ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.publicPath}>
            <input
              name="publicPath"
              required
              defaultValue={row?.publicPath ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Booking service">
            <ThemedSelect
              name="relatedServiceId"
              defaultValue={row?.relatedServiceId ?? ""}
              options={[
                { value: "", label: "—" },
                ...services.map((service) => ({
                  value: service.id,
                  label: service.slug,
                })),
              ]}
            />
          </Field>
          <Field label={copy.common.order}>
            <input
              name="order"
              type="number"
              defaultValue={row?.order ?? 0}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-[14px]">
          <MediaField
            name="images"
            label={copy.common.images}
            defaultValue={row?.images.join("\n")}
            assets={assets}
          />
        </div>
        <div className="mt-[12px]">
          <Check
            name="archived"
            label={copy.common.archived}
            checked={Boolean(row?.archivedAt)}
          />
        </div>
      </EditorSection>
      <LocaleEditors title={copy.common.locales}>
        {locales.map((locale) => {
          const item = byLocale.get(locale);
          return (
            <LocaleCard
              key={locale}
              locale={locale}
              status={item?.status}
              copy={copy}
            >
              <Field label={copy.common.title}>
                <input
                  name={`name_${locale}`}
                  defaultValue={item?.name ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="Specification">
                <input
                  name={`specification_${locale}`}
                  defaultValue={item?.specification ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.summary}>
                <textarea
                  name={`summary_${locale}`}
                  rows={3}
                  defaultValue={item?.summary ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.body}>
                <textarea
                  name={`body_${locale}`}
                  rows={8}
                  defaultValue={item?.body ?? ""}
                  className={inputCls}
                />
              </Field>
              <SeoFields locale={locale} data={item} copy={copy} />
            </LocaleCard>
          );
        })}
      </LocaleEditors>
    </>
  );
}

async function ContentPages({
  locale,
  id,
  copy,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
}) {
  const base = adminHref(locale, "content");
  if (id) {
    const slug = id === "uusi" ? "" : id;
    const rows = slug
      ? await prisma.contentPage.findMany({ where: { slug } })
      : [];
    if (slug && !rows.length) notFound();
    const byLocale = new Map(rows.map((row) => [row.locale, row]));
    return (
      <EntityForm
        title={slug || `${copy.common.new} ${copy.modules.content}`}
        base={base}
        save={saveContentPageAction}
        remove={slug ? removeContentPageAction : undefined}
        id={undefined}
        removeIdName="slug"
        removeIdValue={slug}
        copy={copy}
      >
        <input type="hidden" name="originalSlug" value={slug} />
        <EditorSection title={copy.common.global}>
          <Field label={copy.common.slug}>
            <input
              name="slug"
              required
              defaultValue={slug}
              className={inputCls}
            />
          </Field>
        </EditorSection>
        <LocaleEditors title={copy.common.locales}>
          {locales.map((itemLocale) => {
            const row = byLocale.get(itemLocale);
            return (
              <LocaleCard
                key={itemLocale}
                locale={itemLocale}
                status={row?.status}
                copy={copy}
              >
                <Field label={copy.common.title}>
                  <input
                    name={`title_${itemLocale}`}
                    defaultValue={row?.title ?? ""}
                    className={inputCls}
                  />
                </Field>
                <Field label="Hero">
                  <input
                    name={`hero_${itemLocale}`}
                    defaultValue={row?.hero ?? ""}
                    className={inputCls}
                  />
                </Field>
                <Field label={copy.common.body}>
                  <textarea
                    name={`body_${itemLocale}`}
                    rows={12}
                    defaultValue={row?.body ?? ""}
                    className={inputCls}
                  />
                </Field>
                <SeoFields locale={itemLocale} data={row} copy={copy} noAlt />
              </LocaleCard>
            );
          })}
        </LocaleEditors>
      </EntityForm>
    );
  }
  const rows = await prisma.contentPage.findMany({
    orderBy: [{ slug: "asc" }, { locale: "asc" }],
  });
  const groups = groupBy(rows, (row) => row.slug);
  return (
    <Collection title={copy.modules.content} base={base} copy={copy}>
      {[...groups].map(([slug, localized]) => (
        <EntityLink
          key={slug}
          href={`${base}/${slug}`}
          title={localized.find((row) => row.locale === locale)?.title || slug}
          subtitle={`${slug} · ${publishedLocales(localized)}`}
          copy={copy}
        />
      ))}
    </Collection>
  );
}

async function Products({
  locale,
  id,
  copy,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
}) {
  const base = adminHref(locale, "products");
  if (id) {
    const row =
      id === "uusi"
        ? null
        : await prisma.product.findUnique({
            where: { id },
            include: { contents: true },
          });
    if (id !== "uusi" && !row) notFound();
    return (
      <EntityForm
        title={row?.slug ?? `${copy.common.new} ${copy.modules.products}`}
        base={base}
        save={saveProductAction}
        remove={row ? removeProductAction : undefined}
        id={row?.id}
        copy={copy}
      >
        <ProductEditor row={row} copy={copy} />
      </EntityForm>
    );
  }
  const rows = await prisma.product.findMany({
    include: { contents: true },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });
  return (
    <Collection title={copy.modules.products} base={base} copy={copy}>
      {rows.map((row) => (
        <EntityLink
          key={row.id}
          href={`${base}/${row.id}`}
          title={localizedName(row.contents, locale, "name") || row.slug}
          subtitle={`${Number(row.price).toFixed(2)} ${row.currency}`}
          archived={Boolean(row.archivedAt)}
          copy={copy}
        />
      ))}
    </Collection>
  );
}

function ProductEditor({ row, copy }: { row: ProductRow | null; copy: Copy }) {
  const byLocale = new Map(row?.contents.map((item) => [item.locale, item]));
  return (
    <>
      <EditorSection title={copy.common.global}>
        <div className={globalGrid}>
          <Field label={copy.common.slug}>
            <input
              name="slug"
              required
              defaultValue={row?.slug ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.category}>
            <ThemedSelect
              name="category"
              defaultValue={row?.category ?? "AROSHA_BODY"}
              options={[
                { value: "AROSHA_BODY", label: "AROSHA_BODY" },
                { value: "DIXIDOX_TRICHO", label: "DIXIDOX_TRICHO" },
              ]}
            />
          </Field>
          <Field label={copy.common.price}>
            <input
              name="price"
              required
              type="number"
              min="0"
              step="0.01"
              defaultValue={row ? Number(row.price) : 0}
              className={inputCls}
            />
          </Field>
          <Field label="Currency">
            <input
              name="currency"
              defaultValue={row?.currency ?? "EUR"}
              className={inputCls}
            />
          </Field>
          <Field label="Size">
            <input
              name="size"
              defaultValue={row?.size ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.order}>
            <input
              name="order"
              type="number"
              defaultValue={row?.order ?? 0}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-[14px]">
          <MediaField
            name="images"
            label={copy.common.images}
            defaultValue={row?.images.join("\n")}
            assets={assets}
          />
        </div>
        <div className="mt-[12px]">
          <Check
            name="archived"
            label={copy.common.archived}
            checked={Boolean(row?.archivedAt)}
          />
        </div>
      </EditorSection>
      <LocaleEditors title={copy.common.locales}>
        {locales.map((locale) => {
          const item = byLocale.get(locale);
          return (
            <LocaleCard
              key={locale}
              locale={locale}
              status={item?.status}
              copy={copy}
            >
              <Field label={copy.common.title}>
                <input
                  name={`name_${locale}`}
                  defaultValue={item?.name ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.summary}>
                <textarea
                  name={`shortDescription_${locale}`}
                  rows={3}
                  defaultValue={item?.shortDescription ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.body}>
                <textarea
                  name={`description_${locale}`}
                  rows={8}
                  defaultValue={item?.description ?? ""}
                  className={inputCls}
                />
              </Field>
              <SeoFields locale={locale} data={item} copy={copy} />
            </LocaleCard>
          );
        })}
      </LocaleEditors>
    </>
  );
}

async function Pricing({
  locale,
  id,
  copy,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
}) {
  const base = adminHref(locale, "pricing");
  if (id) {
    const [row, services] = await Promise.all([
      id === "uusi"
        ? null
        : prisma.pricingItem.findUnique({
            where: { id },
            include: { contents: true },
          }),
      prisma.service.findMany({
        where: { archivedAt: null },
        orderBy: { slug: "asc" },
        select: { id: true, slug: true },
      }),
    ]);
    if (id !== "uusi" && !row) notFound();
    return (
      <EntityForm
        title={
          row
            ? `${copy.common.price} ${Number(row.price).toFixed(2)}`
            : `${copy.common.new} ${copy.modules.pricing}`
        }
        base={base}
        save={savePricingAction}
        remove={row ? removePricingAction : undefined}
        id={row?.id}
        copy={copy}
      >
        <PricingEditor row={row} services={services} copy={copy} />
      </EntityForm>
    );
  }
  const rows = await prisma.pricingItem.findMany({
    include: { contents: true },
    orderBy: [{ order: "asc" }, { price: "asc" }],
  });
  return (
    <Collection title={copy.modules.pricing} base={base} copy={copy}>
      {rows.map((row) => (
        <EntityLink
          key={row.id}
          href={`${base}/${row.id}`}
          title={localizedName(row.contents, locale, "label") || row.label}
          subtitle={`${Number(row.price).toFixed(2)} EUR`}
          archived={Boolean(row.archivedAt)}
          copy={copy}
        />
      ))}
    </Collection>
  );
}

function PricingEditor({
  row,
  services,
  copy,
}: {
  row: PricingRow | null;
  services: { id: string; slug: string }[];
  copy: Copy;
}) {
  const byLocale = new Map(row?.contents.map((item) => [item.locale, item]));
  return (
    <>
      <EditorSection title={copy.common.global}>
        <div className={globalGrid}>
          <Field label="Service">
            <ThemedSelect
              name="serviceId"
              defaultValue={row?.serviceId ?? ""}
              options={[
                { value: "", label: "—" },
                ...services.map((service) => ({
                  value: service.id,
                  label: service.slug,
                })),
              ]}
            />
          </Field>
          <Field label={copy.common.category}>
            <ThemedSelect
              name="category"
              defaultValue={row?.category ?? ""}
              options={[
                "",
                "FACE",
                "BODY",
                "HAIR",
                "INJECTABLE",
                "DEVICE",
                "LASER",
                "CONSULTATION",
              ].map((item) => ({ value: item, label: item || "—" }))}
            />
          </Field>
          <Field label={copy.common.price}>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={row ? Number(row.price) : 0}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.order}>
            <input
              name="order"
              type="number"
              defaultValue={row?.order ?? 0}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-[12px]">
          <Check
            name="archived"
            label={copy.common.archived}
            checked={Boolean(row?.archivedAt)}
          />
        </div>
      </EditorSection>
      <LocaleEditors title={copy.common.locales}>
        {locales.map((locale) => {
          const item = byLocale.get(locale);
          return (
            <LocaleCard
              key={locale}
              locale={locale}
              status={item?.status}
              copy={copy}
            >
              <Field label={copy.common.label}>
                <input
                  name={`label_${locale}`}
                  defaultValue={item?.label ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.unit}>
                <input
                  name={`unit_${locale}`}
                  defaultValue={item?.unit ?? ""}
                  className={inputCls}
                />
              </Field>
            </LocaleCard>
          );
        })}
      </LocaleEditors>
    </>
  );
}

async function Articles({
  locale,
  id,
  copy,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
}) {
  const base = adminHref(locale, "blog");
  if (id) {
    const row =
      id === "uusi"
        ? null
        : await prisma.article.findUnique({
            where: { id },
            include: { contents: true },
          });
    if (id !== "uusi" && !row) notFound();
    return (
      <EntityForm
        title={row?.slug ?? `${copy.common.new} ${copy.modules.blog}`}
        base={base}
        save={saveArticleAction}
        remove={row ? removeArticleAction : undefined}
        id={row?.id}
        copy={copy}
      >
        <ArticleEditor row={row} copy={copy} />
      </EntityForm>
    );
  }
  const rows = await prisma.article.findMany({
    include: { contents: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return (
    <Collection title={copy.modules.blog} base={base} copy={copy}>
      {rows.map((row) => (
        <EntityLink
          key={row.id}
          href={`${base}/${row.id}`}
          title={localizedName(row.contents, locale, "title") || row.slug}
          subtitle={publishedLocales(row.contents)}
          archived={Boolean(row.archivedAt)}
          copy={copy}
        />
      ))}
    </Collection>
  );
}

function ArticleEditor({ row, copy }: { row: ArticleRow | null; copy: Copy }) {
  const byLocale = new Map(row?.contents.map((item) => [item.locale, item]));
  return (
    <>
      <EditorSection title={copy.common.global}>
        <div className={globalGrid}>
          <Field label={copy.common.slug}>
            <input
              name="slug"
              required
              defaultValue={row?.slug ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.imageAlt}>
            <input
              name="coverAlt"
              defaultValue={row?.coverAlt ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={copy.common.order}>
            <input
              name="order"
              type="number"
              defaultValue={row?.order ?? 0}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-[14px]">
          <MediaField
            name="coverImage"
            label={copy.common.images}
            defaultValue={row?.coverImage ?? ""}
            assets={assets}
            multiple={false}
          />
        </div>
        <div className="mt-[12px]">
          <Check
            name="archived"
            label={copy.common.archived}
            checked={Boolean(row?.archivedAt)}
          />
        </div>
      </EditorSection>
      <LocaleEditors title={copy.common.locales}>
        {locales.map((locale) => {
          const item = byLocale.get(locale);
          return (
            <LocaleCard
              key={locale}
              locale={locale}
              status={item?.status}
              copy={copy}
            >
              <Field label={copy.common.title}>
                <input
                  name={`title_${locale}`}
                  defaultValue={item?.title ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.summary}>
                <textarea
                  name={`excerpt_${locale}`}
                  rows={3}
                  defaultValue={item?.excerpt ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={copy.common.body}>
                <textarea
                  name={`body_${locale}`}
                  rows={10}
                  defaultValue={item?.body ?? ""}
                  className={inputCls}
                />
              </Field>
              <SeoFields locale={locale} data={item} copy={copy} noAlt />
            </LocaleCard>
          );
        })}
      </LocaleEditors>
    </>
  );
}

async function Chats({
  locale,
  id,
  copy,
  searchParams,
}: {
  locale: Locale;
  id?: string;
  copy: Copy;
  searchParams: SearchParams;
}) {
  const base = adminHref(locale, "chat");
  if (id) {
    const session = await prisma.chatSession.findUnique({ where: { id } });
    if (!session) notFound();
    const messages = Array.isArray(session.messages)
      ? (session.messages as Array<{
          role?: string;
          content?: string;
          handoff?: boolean;
        }>)
      : [];
    return (
      <div>
        <Back href={base} label={copy.common.back} />
        <PageHeader
          title={`${copy.modules.chat} ${session.id.slice(-8)}`}
          description={`${session.locale.toUpperCase()} · ${formatDate(session.updatedAt, locale)}`}
        />
        <section className={`${panelCls} mt-[20px]`}>
          <dl className="grid gap-[10px] font-sans text-[14px] sm:grid-cols-3">
            <Contact label="Name" value={session.contactName} copy={copy} />
            <Contact label="Email" value={session.contactEmail} copy={copy} />
            <Contact label="Phone" value={session.contactPhone} copy={copy} />
          </dl>
          <div className="mt-[18px] grid gap-[10px]">
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  key={index}
                  className="rounded-[6px] border border-line-hair bg-page p-[12px] font-sans text-[14px]"
                >
                  <small className="tracking-[.1em] text-muted uppercase">
                    {message.handoff ? "handoff" : message.role}
                  </small>
                  <p className="mt-[5px] whitespace-pre-wrap text-body">
                    {message.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted">{copy.common.empty}</p>
            )}
          </div>
        </section>
        <form
          action={updateChatAction}
          className="mt-[14px] flex flex-wrap gap-[8px]"
        >
          <input type="hidden" name="id" value={session.id} />
          <input
            type="hidden"
            name="returnTo"
            value={`${base}/${session.id}`}
          />
          <button
            name="intent"
            value={session.status === "OPEN" ? "resolve" : "reopen"}
            className={primaryButton}
          >
            {session.status === "OPEN" ? "Resolve" : "Reopen"}
          </button>
          <button name="intent" value="archive" className={secondaryButton}>
            {copy.common.archive}
          </button>
          <button name="intent" value="anonymize" className={dangerButton}>
            Anonymize
          </button>
        </form>
      </div>
    );
  }
  const status = searchParams.status === "RESOLVED" ? "RESOLVED" : "OPEN";
  const sessions = await prisma.chatSession.findMany({
    where: { handoffRequested: true, status, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <PageHeader title={copy.modules.chat} />
      <div className="mt-[16px] flex gap-[8px]">
        <Link
          href={base}
          className={status === "OPEN" ? primaryButton : secondaryButton}
        >
          Open
        </Link>
        <Link
          href={`${base}?status=RESOLVED`}
          className={status === "RESOLVED" ? primaryButton : secondaryButton}
        >
          Resolved
        </Link>
      </div>
      <RecordList empty={copy.common.empty}>
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`${base}/${session.id}`}
            className={recordRow}
          >
            <span className="min-w-0">
              <strong>
                {session.contactName ||
                  session.contactEmail ||
                  session.id.slice(-8)}
              </strong>
              <small className="mt-[5px] block">
                {session.locale.toUpperCase()} ·{" "}
                {formatDate(session.updatedAt, locale)}
              </small>
            </span>
            <span>{session.status}</span>
          </Link>
        ))}
      </RecordList>
    </div>
  );
}

function EntityForm({
  title,
  base,
  save,
  remove,
  id,
  removeIdName = "id",
  removeIdValue,
  copy,
  children,
}: {
  title: string;
  base: string;
  save: (data: FormData) => Promise<void>;
  remove?: (data: FormData) => Promise<void>;
  id?: string;
  removeIdName?: string;
  removeIdValue?: string;
  copy: Copy;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Back href={base} label={copy.common.back} />
      <PageHeader title={title} />
      <form action={save} className="mt-[20px]">
        <input type="hidden" name="id" value={id ?? ""} />
        <input
          type="hidden"
          name="returnTo"
          value={id ? `${base}/${id}` : `${base}/uusi`}
        />
        {children}
        <div className="sticky bottom-[12px] z-20 mt-[18px] flex justify-end rounded-[6px] border border-line-card bg-card/95 p-[12px] shadow-card backdrop-blur">
          <button className={primaryButton}>{copy.common.save}</button>
        </div>
      </form>
      {remove ? (
        <form
          action={remove}
          className="mt-[14px] rounded-[6px] border border-line-card bg-card p-[14px]"
        >
          <input
            type="hidden"
            name={removeIdName}
            value={removeIdValue ?? id ?? ""}
          />
          <input type="hidden" name="returnTo" value={base} />
          <p className="mb-[10px] font-sans text-[14px] text-muted">
            {copy.common.confirmDelete}
          </p>
          <button className={dangerButton}>{copy.common.delete}</button>
        </form>
      ) : null}
    </div>
  );
}

function Collection({
  title,
  base,
  copy,
  children,
}: {
  title: string;
  base: string;
  copy: Copy;
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader
        title={title}
        action={
          <Link href={`${base}/uusi`} className={primaryButton}>
            {copy.common.new}
          </Link>
        }
      />
      <RecordList empty={copy.common.empty}>{children}</RecordList>
    </div>
  );
}

function RecordList({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty: string;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <div className="mt-[20px] overflow-hidden rounded-[8px] border border-line-card bg-card">
      {hasChildren ? (
        children
      ) : (
        <p className="p-[18px] font-sans text-[14px] text-muted">{empty}</p>
      )}
    </div>
  );
}

function EntityLink({
  href,
  title,
  subtitle,
  archived,
  copy,
}: {
  href: string;
  title: string;
  subtitle: string;
  archived?: boolean;
  copy: Copy;
}) {
  return (
    <Link href={href} className={recordRow}>
      <span className="min-w-0">
        <strong className="block truncate">{title}</strong>
        <small className="block truncate">{subtitle}</small>
      </span>
      {archived ? (
        <Status archived copy={copy} />
      ) : (
        <span aria-hidden="true">→</span>
      )}
    </Link>
  );
}

function LocaleEditors({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <EditorSection title={title}>
      <div className="grid gap-[16px] xl:grid-cols-3">{children}</div>
    </EditorSection>
  );
}
function LocaleCard({
  locale,
  status,
  copy,
  children,
}: {
  locale: DbLocale;
  status?: string;
  copy: Copy;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-[7px] border border-line-card bg-card p-[14px]">
      <legend className="px-[6px] font-sans text-label font-medium tracking-[.12em] uppercase">
        {locale}
      </legend>
      <Field label={copy.common.status}>
        <ThemedSelect
          name={`status_${locale}`}
          defaultValue={status ?? "DRAFT"}
          options={[
            { value: "DRAFT", label: copy.common.draft },
            { value: "PUBLISHED", label: copy.common.published },
          ]}
        />
      </Field>
      {children}
    </fieldset>
  );
}
function SeoFields({
  locale,
  data,
  copy,
  noAlt = false,
}: {
  locale: DbLocale;
  data?: {
    seoTitle?: string | null;
    seoDescription?: string | null;
    imageAlt?: string | null;
  };
  copy: Copy;
  noAlt?: boolean;
}) {
  return (
    <>
      {!noAlt ? (
        <Field label={copy.common.imageAlt}>
          <input
            name={`imageAlt_${locale}`}
            defaultValue={data?.imageAlt ?? ""}
            className={inputCls}
          />
        </Field>
      ) : null}
      <Field label={copy.common.seoTitle}>
        <input
          name={`seoTitle_${locale}`}
          defaultValue={data?.seoTitle ?? ""}
          className={inputCls}
        />
      </Field>
      <Field label={copy.common.seoDescription}>
        <textarea
          name={`seoDescription_${locale}`}
          rows={2}
          defaultValue={data?.seoDescription ?? ""}
          className={inputCls}
        />
      </Field>
    </>
  );
}
function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${panelCls} mb-[16px]`}>
      <h2 className={sectionTitle}>{title}</h2>
      <div className="mt-[14px]">{children}</div>
    </section>
  );
}
function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-[14px]">
      <div>
        <h1 className="font-display text-[clamp(34px,5vw,54px)] leading-[1.02] font-medium">
          {title}
        </h1>
        {description ? (
          <p className="mt-[8px] max-w-[720px] font-sans text-[14px] text-body">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-[14px] inline-flex min-h-[44px] items-center font-sans text-[12px] tracking-[.08em] text-body uppercase"
    >
      ← {label}
    </Link>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-[12px] block first:mt-0">
      <span className="mb-[6px] block font-sans text-label tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-[44px] items-center gap-[9px] font-sans text-[14px] text-body">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="size-[18px] accent-accent"
      />
      {label}
    </label>
  );
}
function Status({ archived, copy }: { archived: boolean; copy: Copy }) {
  return (
    <span className="shrink-0 self-center rounded-full bg-btn-fill px-[10px] py-[5px] text-meta text-muted">
      {archived ? copy.common.archived : copy.common.published}
    </span>
  );
}
function Contact({
  label,
  value,
  copy,
}: {
  label: string;
  value: string | null;
  copy: Copy;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-[3px] text-ink">{value || copy.common.notProvided}</dd>
    </div>
  );
}
function History({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const has = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className={`${panelCls} mt-[18px]`}>
      <h2 className={sectionTitle}>{title}</h2>
      <div className="mt-[12px] grid gap-[7px]">
        {has ? (
          children
        ) : (
          <p className="font-sans text-[14px] text-muted">{empty}</p>
        )}
      </div>
    </section>
  );
}

function localizedName<T extends { locale: DbLocale }>(
  contents: T[],
  locale: Locale,
  key: keyof T,
) {
  const row = contents.find((item) => item.locale === locale);
  const result = row?.[key];
  return typeof result === "string" ? result : "";
}
function publishedLocales(
  contents: Array<{ locale: DbLocale; status: string }>,
) {
  return (
    contents
      .filter((item) => item.status === "PUBLISHED")
      .map((item) => item.locale.toUpperCase())
      .join(" · ") || "DRAFT"
  );
}
function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Helsinki",
  }).format(date);
}

const inputCls =
  "min-h-[44px] w-full rounded-[4px] border border-line-btn bg-page px-[11px] py-[10px] font-sans text-compact text-ink outline-none focus:border-accent";
const primaryButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-accent px-[16px] font-sans text-meta font-medium tracking-[.1em] text-page uppercase hover:brightness-95";
const secondaryButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-line-btn bg-card px-[14px] font-sans text-meta tracking-[.08em] text-ink uppercase hover:bg-btn-fill";
const dangerButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-[#9b6b5f] px-[14px] font-sans text-meta tracking-[.08em] text-[#7c4438] uppercase hover:bg-btn-fill";
const panelCls =
  "rounded-[8px] border border-line-card bg-card p-[clamp(16px,2.5vw,24px)]";
const cardCls =
  "rounded-[8px] border border-line-card bg-card p-[16px] transition hover:-translate-y-[2px] hover:shadow-card motion-reduce:transform-none";
const sectionTitle = "font-display text-[26px] font-medium";
const recordRow =
  "flex min-h-[72px] items-start justify-between gap-[16px] border-b border-line-hair px-[16px] py-[14px] font-sans text-[14px] text-ink last:border-b-0 hover:bg-page sm:items-center [&_small]:text-label [&_small]:text-muted [&_strong]:block";
const globalGrid = "grid gap-x-[14px] sm:grid-cols-2 xl:grid-cols-3";
const historyRow =
  "grid gap-[7px] rounded-[5px] border border-line-hair bg-page px-[14px] py-[12px] font-sans text-[14px] md:grid-cols-[170px_1fr_1fr_120px]";
const appointmentHistoryRow =
  "grid gap-[7px] rounded-[5px] border border-line-hair bg-page px-[14px] py-[12px] font-sans text-[14px] md:grid-cols-[170px_1fr_120px]";

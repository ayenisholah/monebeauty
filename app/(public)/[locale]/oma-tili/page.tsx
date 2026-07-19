import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { accountHref } from "@/lib/account-routing";
import { clientLogoutAction } from "@/lib/client-account-actions";
import { ChangeRequestForm } from "@/components/account/ChangeRequestForm";
import { Container } from "@/components/ui/Container";
import type { Locale } from "@/i18n/routing";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const user = await currentUser();
  if (!user || user.role !== "CLIENT") redirect(accountHref(locale, "login"));
  const client = await prisma.client.findUnique({
    where: { userId: user.id },
    include: {
      appointments: {
        orderBy: { start: "desc" },
        include: {
          service: {
            include: {
              contents: {
                where: { locale, status: "PUBLISHED" },
                take: 1,
                select: { h1: true },
              },
            },
          },
          practitioner: { select: { name: true } },
          changeRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!client) redirect(accountHref(locale, "login"));
  const now = new Date();
  const upcoming = client.appointments
    .filter((item) => item.start >= now && item.status !== "CANCELLED")
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const past = client.appointments.filter(
    (item) => item.start < now || item.status === "CANCELLED",
  );
  const q = await searchParams;
  const t =
    locale === "fi"
      ? {
          title: "Oma tili",
          hello: "Tervetuloa",
          upcoming: "Tulevat hoidot",
          past: "Aiemmat hoidot",
          empty: "Ei ajanvarauksia.",
          pending: "Muutospyyntö odottaa käsittelyä",
          logout: "Kirjaudu ulos",
        }
      : locale === "ru"
        ? {
            title: "Личный кабинет",
            hello: "Здравствуйте",
            upcoming: "Предстоящие процедуры",
            past: "Прошлые процедуры",
            empty: "Записей нет.",
            pending: "Запрос на изменение ожидает рассмотрения",
            logout: "Выйти",
          }
        : {
            title: "My account",
            hello: "Welcome",
            upcoming: "Upcoming treatments",
            past: "Previous treatments",
            empty: "No appointments.",
            pending: "A change request is awaiting review",
            logout: "Sign out",
          };
  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  });
  const card = (
    appointment: (typeof client.appointments)[number],
    allow: boolean,
  ) => {
    const pending = appointment.changeRequests[0]?.status === "PENDING";
    return (
      <article
        key={appointment.id}
        className="rounded-[8px] border border-line-card bg-card p-[18px] shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-[10px]">
          <div>
            <h3 className="font-display text-[25px] font-medium">
              {appointment.procedureTitle ??
                appointment.service.contents[0]?.h1 ??
                appointment.service.slug}
            </h3>
            <p className="mt-[4px] font-sans text-[14px] text-body">
              {format.format(appointment.start)}
            </p>
            <p className="mt-[3px] font-sans text-[13px] text-muted">
              {appointment.practitioner.name}
            </p>
          </div>
          <span className="rounded-full bg-btn-fill px-[10px] py-[5px] font-sans text-[11px] uppercase">
            {appointment.status}
          </span>
        </div>
        {pending ? (
          <p className="mt-[12px] rounded bg-btn-fill px-3 py-2 text-sm text-body">
            {t.pending}
          </p>
        ) : allow ? (
          <ChangeRequestForm
            appointmentId={appointment.id}
            serviceSlug={appointment.service.slug}
            locale={locale}
          />
        ) : null}
      </article>
    );
  };
  return (
    <section className="bg-page py-[clamp(48px,7vw,90px)]">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-sans text-xs tracking-[.16em] text-muted uppercase">
              {t.hello}, {client.fullName}
            </p>
            <h1 className="mt-2 font-display text-[clamp(38px,6vw,58px)] font-medium">
              {t.title}
            </h1>
          </div>
          <form action={clientLogoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className="min-h-[44px] rounded border border-line-btn px-4 text-sm">
              {t.logout}
            </button>
          </form>
        </div>
        {q.requested ? (
          <p className="mt-5 rounded bg-btn-fill p-3 text-sm">{t.pending}</p>
        ) : null}
        <section className="mt-8">
          <h2 className="font-display text-[31px] font-medium">{t.upcoming}</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {upcoming.length ? (
              upcoming.map((item) => card(item, true))
            ) : (
              <p className="text-muted">{t.empty}</p>
            )}
          </div>
        </section>
        <section className="mt-10">
          <h2 className="font-display text-[31px] font-medium">{t.past}</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {past.length ? (
              past.map((item) => card(item, false))
            ) : (
              <p className="text-muted">{t.empty}</p>
            )}
          </div>
        </section>
      </Container>
    </section>
  );
}

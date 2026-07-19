import { prisma } from "@/lib/db";
import { adminHref } from "@/lib/admin-routing";
import type { Locale } from "@/i18n/routing";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import type { AuditOutcome, Prisma } from "@prisma/client";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const copy = {
  fi: {
    title: "Tapahtumaloki",
    intro:
      "Muuttumaton kirjautumis-, tietoturva-, arkaluonteisen käytön ja estettyjen toimintojen historia.",
    allStaff: "Koko henkilöstö",
    action: "Toiminto",
    outcomes: "Kaikki tulokset",
    filter: "Suodata",
    time: "Aika",
    actor: "Tekijä",
    outcome: "Tulos",
    target: "Kohde",
    empty: "Ei tapahtumia.",
    records: "tapahtumaa",
    previous: "Edellinen",
    next: "Seuraava",
  },
  en: {
    title: "Audit log",
    intro:
      "Immutable authentication, security, sensitive-access, and denied-action history.",
    allStaff: "All staff",
    action: "Action",
    outcomes: "All outcomes",
    filter: "Filter",
    time: "Time",
    actor: "Actor",
    outcome: "Outcome",
    target: "Target",
    empty: "No audit records.",
    records: "records",
    previous: "Previous",
    next: "Next",
  },
  ru: {
    title: "Журнал аудита",
    intro:
      "Неизменяемая история входов, безопасности, доступа к чувствительным данным и запрещённых действий.",
    allStaff: "Все сотрудники",
    action: "Действие",
    outcomes: "Все результаты",
    filter: "Фильтр",
    time: "Время",
    actor: "Пользователь",
    outcome: "Результат",
    target: "Объект",
    empty: "Записей нет.",
    records: "записей",
    previous: "Назад",
    next: "Далее",
  },
} as const;

export async function AuditLogs({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = copy[locale];
  const staffId = one(searchParams.staff) ?? "";
  const action = (one(searchParams.action) ?? "").slice(0, 80);
  const outcome = one(searchParams.outcome);
  const page = Math.max(1, Number(one(searchParams.page)) || 1);
  const take = 50;
  const normalizedOutcome: AuditOutcome | undefined =
    outcome === "SUCCESS" || outcome === "FAILURE" || outcome === "DENIED"
      ? outcome
      : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(staffId ? { actorUserId: staffId } : {}),
    ...(action
      ? { action: { contains: action, mode: "insensitive" as const } }
      : {}),
    ...(normalizedOutcome ? { outcome: normalizedOutcome } : {}),
  };
  const [rows, count, staff] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip: (page - 1) * take,
      take,
      include: { actorUser: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const base = adminHref(locale, "audit");
  const params = new URLSearchParams();
  if (staffId) params.set("staff", staffId);
  if (action) params.set("action", action);
  if (outcome) params.set("outcome", outcome);
  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,54px)] font-medium">
        {t.title}
      </h1>
      <p className="mt-[10px] font-sans text-[14px] text-body">{t.intro}</p>
      <form className="mt-[20px] grid gap-[10px] rounded-[8px] border border-line-card bg-card p-[14px] md:grid-cols-4">
        <ThemedSelect
          name="staff"
          defaultValue={staffId}
          placeholder={t.allStaff}
          options={[
            { value: "", label: t.allStaff },
            ...staff.map((item) => ({
              value: item.id,
              label: item.name ?? item.email,
            })),
          ]}
        />
        <input
          name="action"
          defaultValue={action}
          placeholder={t.action}
          className="min-h-[44px] rounded border border-line-btn bg-page px-3"
        />
        <ThemedSelect
          name="outcome"
          defaultValue={outcome ?? ""}
          placeholder={t.outcomes}
          options={[
            { value: "", label: t.outcomes },
            { value: "SUCCESS", label: "SUCCESS" },
            { value: "FAILURE", label: "FAILURE" },
            { value: "DENIED", label: "DENIED" },
          ]}
        />
        <div className="flex gap-2">
          <button className="min-h-[44px] flex-1 rounded bg-accent px-3 text-page">
            {t.filter}
          </button>
          <a
            className="inline-flex min-h-[44px] items-center rounded border border-line-btn px-3"
            href={`/api/admin/audit/export?${params}`}
          >
            CSV
          </a>
        </div>
      </form>
      <div className="mt-[16px] overflow-x-auto rounded-[8px] border border-line-card bg-card">
        <table className="w-full min-w-[820px] text-left font-sans text-[13px]">
          <thead className="bg-btn-fill text-muted">
            <tr>
              <th className="p-3">{t.time}</th>
              <th className="p-3">{t.actor}</th>
              <th className="p-3">{t.action}</th>
              <th className="p-3">{t.outcome}</th>
              <th className="p-3">{t.target}</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line-hair">
                <td className="p-3 whitespace-nowrap">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(row.at)}
                </td>
                <td className="p-3">
                  {row.actorUser?.name ?? row.actor}
                  <span className="block text-[11px] text-muted">
                    {row.actorUser?.email}
                  </span>
                </td>
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.outcome}</td>
                <td className="p-3">
                  {row.entity}
                  {row.entityId ? ` · ${row.entityId.slice(-8)}` : ""}
                </td>
                <td className="p-3">{row.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-center text-muted">{t.empty}</p>
        ) : null}
      </div>
      <div className="mt-4 flex justify-between text-sm">
        <span>
          {count} {t.records}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <a href={`${base}?${params}&page=${page - 1}`}>{t.previous}</a>
          ) : (
            <span />
          )}
          {page * take < count ? (
            <a href={`${base}?${params}&page=${page + 1}`}>{t.next}</a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

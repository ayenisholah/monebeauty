import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { adminHref } from "@/lib/admin-routing";
import type { Locale } from "@/i18n/routing";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import {
  createStaffAccountAction,
  resetStaffPasswordAction,
  revokeStaffSessionsAction,
  setStaffStatusAction,
} from "@/lib/staff-account-actions";

const input =
  "min-h-[44px] w-full rounded-[4px] border border-line-btn bg-page px-[11px] font-sans text-[14px]";
const button =
  "min-h-[42px] rounded-[4px] border border-line-btn px-[13px] font-sans text-[12px] tracking-[.08em] uppercase hover:bg-btn-fill";
const primary = `${button} border-accent bg-accent text-page hover:brightness-95`;

const copy = {
  fi: {
    title: "Henkilöstötilit",
    intro:
      "Luo henkilöstölle erilliset, työntekijään sidotut tunnukset. Väliaikainen salasana vaihdetaan ensimmäisellä kirjautumisella.",
    create: "Luo henkilöstötili",
    name: "Nimi",
    email: "Sähköposti",
    employee: "Kalenterin työntekijä",
    temp: "Väliaikainen salasana (vähintään 12 merkkiä)",
    save: "Luo tili",
    active: "Aktiivinen",
    disabled: "Poistettu käytöstä",
    reset: "Aseta uusi väliaikainen salasana",
    sessions: "Katkaise istunnot",
    disable: "Poista käytöstä",
    enable: "Ota käyttöön",
    none: "Kaikilla työntekijöillä on jo tili.",
    sessionCount: "aktiivista istuntoa",
    passwordChange: "salasanan vaihto vaaditaan",
    audit: "Tapahtumat",
  },
  en: {
    title: "Staff accounts",
    intro:
      "Create separate credentials linked to a calendar employee. The temporary password must be replaced on first sign-in.",
    create: "Create staff account",
    name: "Name",
    email: "Email",
    employee: "Calendar employee",
    temp: "Temporary password (at least 12 characters)",
    save: "Create account",
    active: "Active",
    disabled: "Disabled",
    reset: "Set new temporary password",
    sessions: "Revoke sessions",
    disable: "Disable",
    enable: "Reactivate",
    none: "Every employee already has an account.",
    sessionCount: "active sessions",
    passwordChange: "password change required",
    audit: "Audit",
  },
  ru: {
    title: "Учётные записи сотрудников",
    intro:
      "Создавайте отдельные данные входа, связанные с сотрудником календаря. Временный пароль нужно сменить при первом входе.",
    create: "Создать учётную запись",
    name: "Имя",
    email: "Эл. почта",
    employee: "Сотрудник календаря",
    temp: "Временный пароль (не менее 12 символов)",
    save: "Создать",
    active: "Активна",
    disabled: "Отключена",
    reset: "Задать новый временный пароль",
    sessions: "Завершить сеансы",
    disable: "Отключить",
    enable: "Включить",
    none: "Для всех сотрудников уже созданы учётные записи.",
    sessionCount: "активных сеансов",
    passwordChange: "требуется смена пароля",
    audit: "Аудит",
  },
} as const;

export async function StaffAccounts({
  locale,
  id,
}: {
  locale: Locale;
  id?: string;
}) {
  const t = copy[locale];
  const returnTo = adminHref(locale, "staff");
  const [staff, available] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        staff: { include: { practitioner: true } },
        sessions: { select: { id: true } },
      },
    }),
    prisma.practitioner.findMany({
      where: { active: true, staff: null },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (id && !staff.some((item) => item.id === id)) notFound();
  const visible = id ? staff.filter((item) => item.id === id) : staff;
  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,54px)] font-medium">
        {t.title}
      </h1>
      <p className="mt-[10px] max-w-[760px] font-sans text-[15px] text-body">
        {t.intro}
      </p>
      {!id ? (
        <section className="mt-[26px] rounded-[8px] border border-line-card bg-card p-[clamp(16px,3vw,26px)] shadow-card">
          <h2 className="font-display text-[28px] font-medium">{t.create}</h2>
          {available.length ? (
            <form
              action={createStaffAccountAction}
              className="mt-[16px] grid gap-[12px] md:grid-cols-2"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="font-sans text-[13px] text-body">
                {t.name}
                <input className={`${input} mt-[5px]`} name="name" required />
              </label>
              <label className="font-sans text-[13px] text-body">
                {t.email}
                <input
                  className={`${input} mt-[5px]`}
                  name="email"
                  type="email"
                  required
                />
              </label>
              <label className="font-sans text-[13px] text-body">
                {t.employee}
                <ThemedSelect
                  className="mt-[5px]"
                  name="practitionerId"
                  required
                  options={available.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </label>
              <label className="font-sans text-[13px] text-body">
                {t.temp}
                <input
                  className={`${input} mt-[5px]`}
                  name="temporaryPassword"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <button className={`${primary} md:col-span-2`}>{t.save}</button>
            </form>
          ) : (
            <p className="mt-[12px] font-sans text-[14px] text-muted">
              {t.none}
            </p>
          )}
        </section>
      ) : null}
      <div className="mt-[20px] grid gap-[14px] xl:grid-cols-2">
        {visible.map((item) => (
          <article
            key={item.id}
            className="rounded-[8px] border border-line-card bg-card p-[18px] shadow-card"
          >
            <div className="flex items-start justify-between gap-[14px]">
              <div>
                <h2 className="font-display text-[25px] font-medium">
                  {item.name}
                </h2>
                <p className="font-sans text-[13px] text-muted">{item.email}</p>
                <p className="mt-[5px] font-sans text-[13px] text-body">
                  {item.staff?.practitioner?.name ?? "—"}
                </p>
              </div>
              <span className="rounded-full bg-btn-fill px-[10px] py-[5px] font-sans text-[11px] uppercase">
                {item.status === "ACTIVE" ? t.active : t.disabled}
              </span>
            </div>
            <p className="mt-[10px] font-sans text-[12px] text-muted">
              {item.sessions.length} {t.sessionCount}
              {item.mustChangePassword ? ` · ${t.passwordChange}` : ""}
            </p>
            <form
              action={resetStaffPasswordAction}
              className="mt-[14px] flex flex-wrap gap-[8px]"
            >
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                className={`${input} flex-1`}
                name="temporaryPassword"
                type="password"
                minLength={12}
                maxLength={128}
                placeholder={t.reset}
                required
              />
              <button className={button}>{t.reset}</button>
            </form>
            <div className="mt-[10px] flex flex-wrap gap-[8px]">
              <form action={revokeStaffSessionsAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button className={button}>{t.sessions}</button>
              </form>
              <form action={setStaffStatusAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  type="hidden"
                  name="status"
                  value={item.status === "ACTIVE" ? "DISABLED" : "ACTIVE"}
                />
                <button className={button}>
                  {item.status === "ACTIVE" ? t.disable : t.enable}
                </button>
              </form>
              <a
                className={button}
                href={`${adminHref(locale, "audit")}?staff=${item.id}`}
              >
                {t.audit}
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

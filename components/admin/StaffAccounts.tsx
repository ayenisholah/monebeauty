import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { adminHref } from "@/lib/admin-routing";
import type { Locale } from "@/i18n/routing";
import { AdminPasswordField } from "@/components/admin/AdminPasswordField";
import { DeleteStaffAccount } from "@/components/admin/DeleteStaffAccount";
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
      "Luo ja hallitse henkilöstön kirjautumistunnuksia. Työntekijän oma kalenteriprofiili luodaan automaattisesti.",
    create: "Luo henkilöstötili",
    name: "Nimi",
    email: "Sähköposti",
    temp: "Väliaikainen salasana",
    save: "Luo tili",
    active: "Aktiivinen",
    disabled: "Käyttöoikeus poistettu",
    reset: "Aseta uusi väliaikainen salasana",
    sessions: "Katkaise istunnot",
    disable: "Poista käyttöoikeus",
    enable: "Palauta käyttöoikeus",
    list: "Kaikki henkilöstötilit",
    none: "Henkilöstötilejä ei ole vielä luotu.",
    sessionCount: "aktiivista istuntoa",
    passwordChange: "salasanan vaihto vaaditaan",
    audit: "Tapahtumat",
    showPassword: "Näytä salasana",
    hidePassword: "Piilota salasana",
    delete: "Poista tili",
    deleteWarning:
      "Kirjautumistunnukset poistetaan pysyvästi. Kalenteri- ja ajanvaraushistoria säilytetään.",
    deleteConfirm: "Vahvista kirjoittamalla henkilöstön sähköpostiosoite",
    cancel: "Peruuta",
  },
  en: {
    title: "Staff accounts",
    intro:
      "Create and manage staff sign-in credentials. A private calendar profile is created automatically for each staff member.",
    create: "Create staff account",
    name: "Name",
    email: "Email",
    temp: "Temporary password",
    save: "Create account",
    active: "Active",
    disabled: "Access revoked",
    reset: "Set new temporary password",
    sessions: "Revoke sessions",
    disable: "Revoke access",
    enable: "Restore access",
    list: "All staff accounts",
    none: "No staff accounts have been created yet.",
    sessionCount: "active sessions",
    passwordChange: "password change required",
    audit: "Audit",
    showPassword: "Show password",
    hidePassword: "Hide password",
    delete: "Delete account",
    deleteWarning:
      "This permanently deletes the login credentials. Calendar and appointment history will be retained.",
    deleteConfirm: "Confirm by entering the staff email address",
    cancel: "Cancel",
  },
  ru: {
    title: "Учётные записи сотрудников",
    intro:
      "Создавайте и управляйте данными входа сотрудников. Личный профиль календаря создаётся автоматически.",
    create: "Создать учётную запись",
    name: "Имя",
    email: "Эл. почта",
    temp: "Временный пароль",
    save: "Создать",
    active: "Активна",
    disabled: "Доступ отозван",
    reset: "Задать новый временный пароль",
    sessions: "Завершить сеансы",
    disable: "Отозвать доступ",
    enable: "Восстановить доступ",
    list: "Все учётные записи сотрудников",
    none: "Учётные записи сотрудников ещё не созданы.",
    sessionCount: "активных сеансов",
    passwordChange: "требуется смена пароля",
    audit: "Аудит",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    delete: "Удалить учётную запись",
    deleteWarning:
      "Данные входа будут удалены навсегда. История календаря и записей сохранится.",
    deleteConfirm: "Для подтверждения введите эл. почту сотрудника",
    cancel: "Отмена",
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
  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      sessions: { select: { id: true } },
    },
  });
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
          <form
            action={createStaffAccountAction}
            className="mt-[16px] grid gap-[12px] md:grid-cols-2"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="font-sans text-[13px] text-body">
              {t.name}
              <input
                className={`${input} mt-[5px]`}
                name="name"
                autoComplete="name"
                required
              />
            </label>
            <label className="font-sans text-[13px] text-body">
              {t.email}
              <input
                className={`${input} mt-[5px]`}
                name="email"
                type="email"
                autoComplete="off"
                required
              />
            </label>
            <label className="font-sans text-[13px] text-body md:col-span-2">
              {t.temp}
              <AdminPasswordField
                className={input}
                wrapperClassName="mt-[5px]"
                name="temporaryPassword"
                showLabel={t.showPassword}
                hideLabel={t.hidePassword}
              />
            </label>
            <button className={`${primary} md:col-span-2`}>{t.save}</button>
          </form>
        </section>
      ) : null}
      <div className="mt-[26px] flex items-end justify-between gap-[12px]">
        <h2 className="font-display text-[28px] font-medium">{t.list}</h2>
        <span className="font-sans text-[13px] text-muted">
          {visible.length}
        </span>
      </div>
      {!visible.length ? (
        <p className="mt-[12px] rounded-[8px] border border-line-card bg-card p-[18px] font-sans text-[14px] text-muted">
          {t.none}
        </p>
      ) : null}
      <div className="mt-[14px] grid gap-[14px] xl:grid-cols-2">
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
              <div className="min-w-[240px] flex-1">
                <AdminPasswordField
                  className={input}
                  name="temporaryPassword"
                  placeholder={t.reset}
                  showLabel={t.showPassword}
                  hideLabel={t.hidePassword}
                />
              </div>
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
              <DeleteStaffAccount
                id={item.id}
                email={item.email}
                returnTo={returnTo}
                labels={{
                  delete: t.delete,
                  warning: t.deleteWarning,
                  confirm: t.deleteConfirm,
                  cancel: t.cancel,
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

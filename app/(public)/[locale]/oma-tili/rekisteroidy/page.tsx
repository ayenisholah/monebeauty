import { AuthCard, AuthField, authButton } from "@/components/account/AuthCard";
import { registerClientAction } from "@/lib/client-account-actions";
import { accountHref } from "@/lib/account-routing";
import type { Locale } from "@/i18n/routing";
const copy = {
  fi: {
    title: "Luo asiakastili",
    intro: "Vahvistamme sähköpostiosoitteesi ennen ensimmäistä kirjautumista.",
    name: "Nimi",
    phone: "Puhelin",
    email: "Sähköposti",
    password: "Salasana (vähintään 12 merkkiä)",
    confirm: "Vahvista salasana",
    consent:
      "Hyväksyn tietosuojaselosteen ja asiakastilin tietojen käsittelyn.",
    submit: "Luo tili",
    error: "Tarkista kentät ja salasanavaatimukset.",
    login: "Minulla on jo tili",
  },
  en: {
    title: "Create a client account",
    intro: "We will verify your email before the first sign-in.",
    name: "Full name",
    phone: "Phone",
    email: "Email",
    password: "Password (at least 12 characters)",
    confirm: "Confirm password",
    consent:
      "I accept the privacy notice and processing required for my client account.",
    submit: "Create account",
    error: "Check the fields and password requirements.",
    login: "I already have an account",
  },
  ru: {
    title: "Создать аккаунт клиента",
    intro: "Перед первым входом мы подтвердим электронную почту.",
    name: "Имя и фамилия",
    phone: "Телефон",
    email: "Эл. почта",
    password: "Пароль (не менее 12 символов)",
    confirm: "Подтвердите пароль",
    consent:
      "Я принимаю политику конфиденциальности и обработку данных для аккаунта.",
    submit: "Создать аккаунт",
    error: "Проверьте поля и требования к паролю.",
    login: "У меня уже есть аккаунт",
  },
} as const;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; claim?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const q = await searchParams;
  const t = copy[locale] ?? copy.fi;
  return (
    <AuthCard
      eyebrow="Mone Beauty Clinic"
      title={t.title}
      intro={t.intro}
      error={q.error ? t.error : null}
      links={[
        {
          href: `${accountHref(locale, "login")}${q.claim ? `?claim=${encodeURIComponent(q.claim)}` : ""}`,
          label: t.login,
        },
      ]}
    >
      <form action={registerClientAction} className="grid gap-[16px]">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="claim" value={q.claim ?? ""} />
        <AuthField label={t.name} name="fullName" autoComplete="name" />
        <AuthField label={t.phone} name="phone" type="tel" autoComplete="tel" />
        <AuthField
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
        />
        <AuthField
          label={t.password}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <AuthField
          label={t.confirm}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
        />
        <label className="flex gap-[10px] font-sans text-[13px] leading-relaxed text-body">
          <input
            className="mt-[3px] h-[18px] w-[18px] accent-accent"
            type="checkbox"
            name="consentGdpr"
            required
          />
          {t.consent}
        </label>
        <button className={authButton}>{t.submit}</button>
      </form>
    </AuthCard>
  );
}

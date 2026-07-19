import { redirect } from "next/navigation";
import { AuthCard, AuthField, authButton } from "@/components/account/AuthCard";
import { currentUser } from "@/lib/auth";
import { staffLoginAction } from "@/lib/staff-account-actions";
import { staffHref } from "@/lib/account-routing";
import type { Locale } from "@/i18n/routing";

const copy = {
  fi: {
    eyebrow: "Henkilöstö",
    title: "Kirjaudu henkilöstöportaaliin",
    intro: "Käytä ylläpitäjän sinulle luomia tunnuksia.",
    email: "Sähköposti",
    password: "Salasana",
    submit: "Kirjaudu",
    error: "Sähköposti tai salasana on virheellinen.",
  },
  en: {
    eyebrow: "Staff",
    title: "Sign in to the staff portal",
    intro: "Use the credentials created for you by the administrator.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    error: "The email or password is incorrect.",
  },
  ru: {
    eyebrow: "Персонал",
    title: "Вход для сотрудников",
    intro: "Используйте данные, созданные администратором.",
    email: "Эл. почта",
    password: "Пароль",
    submit: "Войти",
    error: "Неверный адрес или пароль.",
  },
} as const;

export default async function StaffLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const user = await currentUser();
  if (user?.role === "STAFF")
    redirect(
      user.mustChangePassword
        ? staffHref(locale, "password")
        : staffHref(locale),
    );
  if (user?.role === "ADMIN")
    redirect(locale === "fi" ? "/admin" : `/${locale}/admin`);
  const t = copy[locale] ?? copy.fi;
  const query = await searchParams;
  return (
    <AuthCard
      eyebrow={t.eyebrow}
      title={t.title}
      intro={t.intro}
      error={query.error ? t.error : null}
    >
      <form action={staffLoginAction} className="grid gap-[16px]">
        <input type="hidden" name="locale" value={locale} />
        <AuthField
          label={t.email}
          name="email"
          type="email"
          autoComplete="username"
        />
        <AuthField
          label={t.password}
          name="password"
          type="password"
          autoComplete="current-password"
        />
        <button className={authButton}>{t.submit}</button>
      </form>
    </AuthCard>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SharedCalendar } from "@/components/calendar/SharedCalendar";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { staffHref } from "@/lib/account-routing";
import { staffLogoutAction } from "@/lib/staff-account-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Staff" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await currentUser();
  const appLocale = locale as "en" | "fi" | "ru";
  if (!user || user.role !== "STAFF") redirect(staffHref(appLocale, "login"));
  if (user.mustChangePassword) redirect(staffHref(appLocale, "password"));
  setRequestLocale(locale);
  const t = await getTranslations("Staff");

  return (
    <section className="bg-page py-[clamp(48px,7vw,96px)]">
      <Container>
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>
        <div className="flex flex-wrap items-end justify-between gap-[16px]">
          <p className="mt-[16px] max-w-[660px] font-sans text-lead font-light text-body">
            {t("intro")}
          </p>
          <form action={staffLogoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className="min-h-[44px] rounded-[4px] border border-line-btn px-[16px] font-sans text-[12px] tracking-[.1em] uppercase">
              {locale === "fi"
                ? "Kirjaudu ulos"
                : locale === "ru"
                  ? "Выйти"
                  : "Sign out"}
            </button>
          </form>
        </div>
        <div className="mt-[clamp(28px,4vw,48px)]">
          <SharedCalendar locale={appLocale} />
        </div>
      </Container>
    </section>
  );
}

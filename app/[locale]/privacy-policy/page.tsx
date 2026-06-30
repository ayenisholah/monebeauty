import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return {
    title: t("privacyTitle"),
    alternates: localeAlternates("/privacy-policy", locale),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  return (
    <LegalPage
      title={t("privacyTitle")}
      lastUpdatedLabel={t("lastUpdated")}
      date="2026-07-01"
      placeholder={t("placeholder")}
    />
  );
}

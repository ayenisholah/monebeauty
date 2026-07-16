import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { getLivePageContent } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = await getLivePageContent("about", locale as Locale);
  return {
    title: c?.title,
    description: c ? excerpt(c.body) : undefined,
    alternates: localeAlternates("/about", locale),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContentPage slug="about" locale={locale as Locale} />;
}

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { TechnologyDetailPage } from "@/components/technology/TechnologyDetailPage";
import { getPublishedTechnologyByPath } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = await getPublishedTechnologyByPath("/trichology", locale as Locale);
  return {
    title: c?.content.name,
    description: c ? excerpt(c.content.summary || c.content.body) : undefined,
    alternates: localeAlternates("/trichology", locale),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TechnologyDetailPage path="/trichology" locale={locale as Locale} />;
}

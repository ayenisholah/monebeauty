import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { TechnologyDetailPage } from "@/components/technology/TechnologyDetailPage";
import { getPublishedTechnologyByPath } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = await getPublishedTechnologyByPath(PUBLIC_PATHS.trichology, locale as Locale);
  return {
    title: c?.content.name,
    description: c ? excerpt(c.content.summary || c.content.body) : undefined,
    alternates: localeAlternates(PUBLIC_PATHS.trichology, locale),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TechnologyDetailPage path={PUBLIC_PATHS.trichology} locale={locale as Locale} />;
}

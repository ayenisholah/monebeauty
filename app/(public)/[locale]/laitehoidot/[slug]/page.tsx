import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TechnologyDetailPage } from "@/components/technology/TechnologyDetailPage";
import { getPublishedTechnologyByPath } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const path = `${PUBLIC_PATHS.technologies}/${slug}`;
  const technology = await getPublishedTechnologyByPath(path, locale as Locale);
  return { title: technology?.content.name, description: technology ? excerpt(technology.content.summary || technology.content.body) : undefined, alternates: localeAlternates(path, locale) };
}

export default async function TechnologyPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  return <TechnologyDetailPage path={`${PUBLIC_PATHS.technologies}/${slug}`} locale={locale as Locale} />;
}

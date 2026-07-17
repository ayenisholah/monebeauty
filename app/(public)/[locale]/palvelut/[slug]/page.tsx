import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ServiceDetailPage } from "@/components/services/ServiceDetailPage";
import { getPublishedServiceByPath } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const path = `${PUBLIC_PATHS.services}/${slug}`;
  const c = await getPublishedServiceByPath(path, locale as Locale);
  return {
    title: c?.content.h1,
    description: c ? excerpt(c.content.shortDesc || c.content.whatItIs) : undefined,
    alternates: localeAlternates(path, locale),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  return <ServiceDetailPage slug={`${PUBLIC_PATHS.services.slice(1)}/${slug}`} locale={locale as Locale} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ServiceDetailPage } from "@/components/services/ServiceDetailPage";
import { getPublishedServiceByPath } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await getPublishedServiceByPath(`/services/${slug}`, locale as Locale);
  return {
    title: c?.content.h1,
    description: c ? excerpt(c.content.shortDesc || c.content.whatItIs) : undefined,
    alternates: localeAlternates(`/services/${slug}`, locale),
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
  return <ServiceDetailPage slug={`services/${slug}`} locale={locale as Locale} />;
}

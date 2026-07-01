import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { BookServiceCta } from "@/components/booking/BookServiceCta";
import { getPageContent, childSlugs } from "@/content/pages";
import { localeAlternates, excerpt } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return childSlugs("services").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = getPageContent(`services/${slug}`, locale as Locale);
  return {
    title: c?.title,
    description: c ? excerpt(c.body) : undefined,
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
  if (!getPageContent(`services/${slug}`, locale as Locale)) notFound();
  setRequestLocale(locale);
  return (
    <>
      <ContentPage slug={`services/${slug}`} locale={locale as Locale} />
      <BookServiceCta contentSlug={`services/${slug}`} />
    </>
  );
}

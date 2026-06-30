import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/JsonLd";
import { ServiceTemplate } from "@/components/services/ServiceTemplate";
import {
  getTreatment,
  TREATMENT_SLUGS,
  type AppLocale,
} from "@/content/treatments";
import { routing } from "@/i18n/routing";
import {
  localeAlternates,
  serviceJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from "@/lib/seo";
import { BRAND } from "@/content/site";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return TREATMENT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const treatment = getTreatment(slug);
  if (!treatment || !routing.locales.includes(locale as AppLocale)) return {};
  const c = treatment.content[locale as AppLocale];
  return {
    title: c.seoTitle ?? c.title,
    description: c.seoDescription ?? c.shortDesc,
    alternates: localeAlternates(`/services/${slug}`, locale),
    openGraph: {
      title: c.seoTitle ?? c.title,
      description: c.seoDescription ?? c.shortDesc,
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();
  const treatment = getTreatment(slug);
  if (!treatment) notFound();
  setRequestLocale(locale);

  const c = treatment.content[locale as AppLocale];
  const url = `${SITE}/${locale}/services/${slug}`;

  const jsonLd: object[] = [
    serviceJsonLd(c.title, c.shortDesc, url),
    breadcrumbJsonLd([
      { name: BRAND.name, url: `${SITE}/${locale}` },
      { name: "Services", url: `${SITE}/${locale}/services` },
      { name: c.title, url },
    ]),
  ];
  if (c.faq && c.faq.length > 0) jsonLd.push(faqJsonLd(c.faq));

  return (
    <>
      <JsonLd data={jsonLd} />
      <ServiceTemplate slug={slug} locale={locale as AppLocale} />
    </>
  );
}

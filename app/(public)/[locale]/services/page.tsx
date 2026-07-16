import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { getLivePageContent, getPublishedServices } from "@/lib/live-content";
import { localeAlternates, excerpt } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const content = await getLivePageContent("services", locale as Locale);
  return {
    title: content?.title,
    description: content ? excerpt(content.body) : undefined,
    alternates: localeAlternates("/services", locale),
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  setRequestLocale(locale);
  const [common, page, services] = await Promise.all([
    getTranslations("Common"),
    getLivePageContent("services", currentLocale),
    getPublishedServices(currentLocale),
  ]);
  if (!page) notFound();

  return <section className="bg-alt py-[clamp(52px,7vw,104px)]"><Container>
    <div className="mb-[clamp(32px,4vw,56px)] max-w-[700px]"><Eyebrow className="mb-[16px]">{page.title}</Eyebrow><h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">{page.title}</h1></div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
      {services.map((service, index) => {
        if (!service.publicPath) return null;
        const image = service.images[0];
        return <article key={service.id} className="group flex min-h-full flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card transition-all duration-300 hover:-translate-y-[6px] hover:border-line-card-hover hover:shadow-card motion-reduce:transform-none">
          <Link href={service.publicPath} className="relative block h-[248px] overflow-hidden bg-page"><span className="absolute top-[24px] left-[20px] z-10 font-display text-[24px] text-[rgba(58,42,28,.34)]">{String(index + 1).padStart(2, "0")}</span>{image ? <Image src={image} alt={service.content.imageAlt || service.content.h1} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none" sizes="(max-width: 900px) 100vw, 33vw" /> : null}</Link>
          <div className="flex flex-1 flex-col p-[clamp(22px,2.4vw,30px)]"><h2 className="font-display text-[26px] leading-[1.1] font-semibold text-ink">{service.content.h1.replace(/\s+in\s+Helsinki$/i, "")}</h2><p className="mt-[14px] flex-1 font-sans text-[13px] leading-[1.7] font-light text-body">{excerpt(service.content.shortDesc || service.content.whatItIs, 115)}</p><div className="mt-[22px] flex items-center gap-[14px] whitespace-nowrap">{service.bookable ? <Button href={{ pathname: "/booking", query: { service: service.slug } }} iconRight={ArrowRight}>{common("book")}</Button> : null}<Button href={service.publicPath} variant="textLink" iconRight={ArrowUpRight}>{common("readMore")}</Button></div></div>
        </article>;
      })}
    </div>
  </Container></section>;
}


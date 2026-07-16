import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getPublishedPricing } from "@/lib/live-content";
import { localeAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("modules.pricing"), alternates: localeAlternates("/pricing", locale) };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = locale as Locale;
  const [t, items] = await Promise.all([getTranslations("Admin"), getPublishedPricing(currentLocale)]);
  return <section className="bg-page py-[clamp(52px,7vw,104px)]"><Container className="max-w-[900px]"><Eyebrow className="mb-[14px]">Mone Beauty Clinic</Eyebrow><h1 className="font-display text-h2 font-medium text-ink">{t("modules.pricing")}</h1><div className="mt-[32px] overflow-hidden rounded-[var(--radius)] border border-line-card bg-card">{items.length ? items.map((item) => <div key={item.id} className="flex min-h-[64px] items-center justify-between gap-[18px] border-b border-line-hair px-[clamp(16px,3vw,28px)] py-[14px] last:border-0"><div><h2 className="font-display text-[20px] font-medium">{item.content.label}</h2>{item.content.unit ? <p className="font-sans text-[12px] text-muted">{item.content.unit}</p> : null}</div><strong className="font-sans text-[15px]">{Number(item.price).toFixed(2)} €</strong></div>) : <p className="p-[24px] font-sans text-body">{t("common.empty")}</p>}</div></Container></section>;
}


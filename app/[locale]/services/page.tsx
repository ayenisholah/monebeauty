import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Card } from "@/components/ui/Card";
import { CTABand } from "@/components/marketing/CTABand";
import { TREATMENTS, type AppLocale } from "@/content/treatments";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates("/services", locale),
  };
}

export default async function ServicesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const tc = await getTranslations("Common");
  const l = locale as AppLocale;

  return (
    <>
      <section className="bg-page py-[clamp(48px,6vw,88px)]">
        <Container>
          <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
          <h1 className="max-w-[640px] font-display text-h2 leading-[1.06] font-medium text-ink">
            {t("heading")}
          </h1>
          <p className="mt-[20px] max-w-[560px] font-sans text-lead leading-[1.8] font-light text-body">
            {t("intro")}
          </p>

          <div className="mt-[clamp(36px,4vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
            {TREATMENTS.map((tr, i) => (
              <Card
                key={tr.slug}
                number={String(i + 1).padStart(2, "0")}
                title={tr.content[l].title}
                description={tr.content[l].shortDesc}
                imageCaption={tr.imageCaption}
                href={`/services/${tr.slug}`}
                learnMore={tc("learnMore")}
              />
            ))}
          </div>
        </Container>
      </section>

      <CTABand />
    </>
  );
}

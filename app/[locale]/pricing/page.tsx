import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { TREATMENTS, type AppLocale } from "@/content/treatments";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates("/pricing", locale),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");
  const tc = await getTranslations("Common");
  const l = locale as AppLocale;

  return (
    <section className="bg-page py-[clamp(48px,6vw,88px)]">
      <Container className="max-w-[860px]">
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>
        <p className="mt-[20px] max-w-[560px] font-sans text-lead leading-[1.8] font-light text-body">
          {t("intro")}
        </p>

        <div className="mt-[clamp(32px,4vw,48px)] overflow-hidden rounded-[var(--radius)] border border-line-card">
          <div className="flex items-center justify-between border-b border-line-card bg-alt px-[clamp(18px,3vw,28px)] py-[16px]">
            <span className="font-sans text-[11px] font-medium tracking-[.16em] text-muted uppercase">
              {t("treatment")}
            </span>
            <span className="font-sans text-[11px] font-medium tracking-[.16em] text-muted uppercase">
              {t("price")}
            </span>
          </div>
          {TREATMENTS.map((tr) => (
            <div
              key={tr.slug}
              className="flex items-center justify-between gap-[16px] border-b border-line-card bg-card px-[clamp(18px,3vw,28px)] py-[18px] last:border-b-0"
            >
              <span className="font-display text-[19px] font-medium text-ink">
                {tr.content[l].title}
              </span>
              <span className="shrink-0 font-sans text-[13px] font-light text-muted">
                —
              </span>
            </div>
          ))}
        </div>

        <p className="mt-[18px] font-sans text-[13px] font-light text-muted">
          {t("note")}
        </p>

        <div className="mt-[32px]">
          <Button href="/booking">{tc("bookOnline")}</Button>
        </div>
      </Container>
    </section>
  );
}

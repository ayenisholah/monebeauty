import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  Stethoscope,
  Atom,
  UserFocus,
  Certificate,
  Leaf,
} from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureItem } from "@/components/ui/FeatureItem";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { CTABand } from "@/components/marketing/CTABand";
import { localeAlternates } from "@/lib/seo";

const ADV_ICONS = [Stethoscope, Atom, UserFocus, Certificate, Leaf];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home.about" });
  return {
    title: t("eyebrow"),
    alternates: localeAlternates("/about", locale),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const advantages = t.raw("advantages") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <>
      <section className="bg-page py-[clamp(48px,6vw,88px)]">
        <Container>
          <div className="flex flex-wrap items-center gap-[clamp(32px,4.5vw,72px)]">
            <div className="min-w-[300px] flex-[1_1_440px]">
              <Eyebrow className="mb-[14px]">{t("about.eyebrow")}</Eyebrow>
              <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
                {t("about.headingLine1")}
                <br />
                {t("about.headingLine2")}
              </h1>
              <p className="mt-[24px] max-w-[520px] font-sans text-lead leading-[1.8] font-light text-body">
                {t("about.paragraph1")}
              </p>
              <p className="mt-[16px] max-w-[520px] font-sans text-lead leading-[1.8] font-light text-body">
                {t("about.paragraph2")}
              </p>
            </div>
            <div className="min-w-[280px] flex-[.85_1_320px]">
              <ImageSlot
                caption={t("about.imageCaption")}
                minHeight={480}
                priority
              />
            </div>
          </div>

          <div className="mt-[clamp(48px,6vw,80px)] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[clamp(24px,3vw,44px)] border-t border-line-hair pt-[clamp(36px,4vw,56px)]">
            {advantages.map((adv, i) => (
              <FeatureItem
                key={adv.title}
                icon={ADV_ICONS[i] ?? Leaf}
                title={adv.title}
                description={adv.description}
                iconSize={28}
              />
            ))}
          </div>
        </Container>
      </section>

      <CTABand />
    </>
  );
}

import { getTranslations } from "next-intl/server";
import {
  Stethoscope,
  Atom,
  UserFocus,
  Certificate,
  Leaf,
  ArrowRight,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureItem } from "@/components/ui/FeatureItem";
import { ImageSlot } from "@/components/ui/ImageSlot";

const ADV_ICONS = [Stethoscope, Atom, UserFocus, Certificate, Leaf];

export async function Hero() {
  const t = await getTranslations("Home");
  const tc = await getTranslations("Common");
  const advantages = t.raw("advantages") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <section className="px-[clamp(20px,5vw,56px)] py-[clamp(40px,5vw,72px)]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-stretch gap-[clamp(32px,4.5vw,72px)]">
        {/* Left */}
        <div className="flex min-w-[300px] flex-[1.15_1_440px] flex-col justify-center">
          <Eyebrow tracking="wide" className="mb-[22px]">
            {t("hero.eyebrow")}
          </Eyebrow>
          <h1 className="font-display text-h1 leading-[1.02] font-medium tracking-[.005em] text-ink uppercase">
            {t("hero.titleLine1")}
            <br />
            <span className="text-accent">{t("hero.titleLine2")}</span>
          </h1>
          <p className="mt-[26px] max-w-[430px] font-sans text-lead leading-[1.75] font-light text-body">
            {t("hero.lead")}
          </p>
          <div className="mt-[34px] flex flex-wrap gap-[14px]">
            <Button href="/booking" iconRight={ArrowRight}>
              {tc("bookOnline")}
            </Button>
            <Button href="/services" variant="outline">
              {tc("ourServices")}
            </Button>
          </div>
        </div>

        {/* Right */}
        <div className="min-w-[280px] flex-[.85_1_320px]">
          <ImageSlot
            caption={t("hero.imageCaption")}
            minHeight={560}
            scrollHint
            priority
            className="h-full"
          />
        </div>
      </div>

      {/* Advantages strip */}
      <div className="mx-auto mt-[clamp(40px,5vw,58px)] w-full max-w-[1280px] border-t border-line-hair pt-[30px]">
        <div className="flex flex-wrap gap-[clamp(14px,1.8vw,26px)]">
          {advantages.map((adv, i) => {
            const Icon = ADV_ICONS[i] ?? Leaf;
            return (
              <div key={adv.title} className="min-w-[104px] flex-[1_1_116px]">
                <FeatureItem
                  icon={Icon}
                  title={adv.title}
                  description={adv.description}
                  iconSize={27}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

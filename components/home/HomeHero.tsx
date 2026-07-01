import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  Sparkle,
  Leaf,
} from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/content/site";

const TRUST = [
  { key: "byAppointment", Icon: CalendarCheck },
  { key: "location", Icon: MapPin },
  { key: "instrumental", Icon: Sparkle },
  { key: "products", Icon: Leaf },
] as const;

/** Homepage hero: eyebrow, brand heading, lead, CTA row and trust strip over the real treatment video. */
export async function HomeHero() {
  const t = await getTranslations("Home");
  return (
    <section className="bg-page pt-[clamp(28px,4vw,52px)]">
      <Container className="text-center">
        <Eyebrow className="mb-[16px]">{t("heroEyebrow")}</Eyebrow>
        <h1 className="font-display text-[clamp(40px,7vw,92px)] leading-[1.02] font-medium text-ink">
          {BRAND.name}
        </h1>
        <p className="mx-auto mt-[16px] max-w-[620px] font-sans text-lead leading-[1.7] font-light text-body">
          {t("metaDescription")}
        </p>
        <div className="mt-[clamp(22px,3vw,32px)] flex flex-wrap justify-center gap-[14px]">
          <Button href="/booking" variant="primary" iconRight={ArrowRight}>
            {t("heroBookCta")}
          </Button>
          <Button href="/services" variant="outline">
            {t("heroServicesCta")}
          </Button>
        </div>
      </Container>

      <div className="mt-[clamp(24px,3vw,40px)]">
        <div className="relative h-[clamp(340px,55vh,600px)] w-full overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/media/hero-poster.jpg"
          >
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <Container>
        <div className="mt-[clamp(28px,4vw,44px)] grid gap-[clamp(24px,3vw,44px)] border-t border-line-hair pt-[30px] sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ key, Icon }) => (
            <div key={key} className="flex flex-col gap-[16px]">
              <Icon size={28} weight="thin" className="text-accent" />
              <div>
                <h3 className="font-sans text-[12px] leading-[1.4] font-semibold tracking-[.08em] text-ink uppercase">
                  {t(`heroTrust.${key}.title`)}
                </h3>
                <p className="mt-[14px] font-sans text-[13px] leading-[1.7] font-light text-body">
                  {t(`heroTrust.${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

const FEATURED = [
  {
    key: "endospheres",
    image: "/media/home/endospheres.jpg",
    href: "/instrumental/endosphere",
  },
  { key: "arosha", image: "/media/home/arosha.jpg", href: "/arosha" },
  { key: "facial", image: "/media/home/facial.jpg", href: "/services/face" },
] as const;

export async function FeaturedServices() {
  const t = await getTranslations("Home");
  const tc = await getTranslations("Common");

  return (
    <section className="bg-page py-[clamp(56px,7vw,104px)]">
      <Container>
        <Eyebrow className="mb-[14px]">{t("servicesEyebrow")}</Eyebrow>
        <h2 className="mb-[clamp(28px,3vw,44px)] font-display text-h2-treat font-medium text-ink">
          {t("servicesHeading")}
        </h2>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(20px,2.4vw,32px)]">
          {FEATURED.map((f) => (
            <article
              key={f.key}
              className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card"
            >
              <Link
                href={f.href}
                className="relative h-[240px] w-full overflow-hidden"
              >
                <Image
                  src={f.image}
                  alt={t(`featured.${f.key}.title`)}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-[1.04]"
                  sizes="(max-width: 900px) 100vw, 33vw"
                />
              </Link>
              <div className="flex flex-1 flex-col p-[clamp(20px,2vw,28px)]">
                <h3 className="font-display text-[24px] font-medium text-ink">
                  {t(`featured.${f.key}.title`)}
                </h3>
                <p className="mt-[12px] flex-1 font-sans text-[14px] leading-[1.7] font-light text-body">
                  {t(`featured.${f.key}.description`)}
                </p>
                <div className="mt-[18px]">
                  <Button
                    href={f.href}
                    variant="textLink"
                    iconRight={ArrowRight}
                  >
                    {tc("readMore")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-[clamp(28px,3vw,40px)]">
          <Button href="/services" variant="outline" iconRight={ArrowRight}>
            {tc("allServices")}
          </Button>
        </div>
      </Container>
    </section>
  );
}

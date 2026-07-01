import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Link } from "@/i18n/navigation";
import { getPageContent } from "@/content/pages";
import type { Locale } from "@/i18n/routing";
import { excerpt } from "@/lib/seo";

const FEATURED = [
  {
    slug: "services/face",
    image: "/media/home/facial.jpg",
    href: "/services/face",
  },
  {
    slug: "instrumental/endosphere",
    image: "/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg",
    href: "/instrumental/endosphere",
  },
  {
    slug: "services/body",
    image: "/media/home/endospheres.jpg",
    href: "/services/body",
  },
  {
    slug: "instrumental/laser",
    image: "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
    href: "/instrumental/laser",
  },
] as const;

export async function FeaturedServices() {
  const t = await getTranslations("Home");
  const tc = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  return (
    <section id="treatments" className="bg-alt py-[clamp(60px,7vw,110px)]">
      <Container>
        <div className="mb-[clamp(28px,4vw,52px)] flex flex-wrap items-end justify-between gap-[24px]">
          <div>
            <Eyebrow className="mb-[14px]">{t("servicesEyebrow")}</Eyebrow>
            <h2 className="max-w-[560px] font-display text-h2-treat leading-[1.08] font-medium text-ink">
              {t("servicesHeading")}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
          {FEATURED.map((f, index) => {
            const content = getPageContent(f.slug, locale);
            const title = content?.title ?? f.slug;
            const description = content?.body ? excerpt(content.body, 128) : "";

            return (
              <article
                key={f.slug}
                className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card transition-all duration-300 hover:-translate-y-[6px] hover:border-line-card-hover hover:shadow-card"
              >
                <Link
                  href={f.href}
                  className="relative block h-[248px] w-full overflow-hidden"
                >
                  <span className="absolute top-[26px] left-[20px] z-10 font-display text-[24px] text-[rgba(58,42,28,.34)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {f.image ? (
                    <Image
                      src={f.image}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 900px) 100vw, 25vw"
                    />
                  ) : (
                    <ImageSlot caption={title} minHeight={248} rounded={false} />
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-[clamp(20px,2vw,26px)]">
                  <h3 className="font-display text-[24px] leading-[1.1] font-semibold text-ink">
                    {title}
                  </h3>
                  <p className="mt-[12px] flex-1 font-sans text-[13px] leading-[1.6] font-light text-body">
                    {description}
                  </p>
                  <div className="mt-[18px]">
                    <Button
                      href={f.href}
                      variant="textLink"
                      iconRight={ArrowUpRight}
                    >
                      {tc("readMore")}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
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

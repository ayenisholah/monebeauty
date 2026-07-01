import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { getPageContent } from "@/content/pages";
import { localeAlternates, excerpt } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

const SERVICES = [
  {
    slug: "services/face",
    href: "/services/face",
    image: "/media/home/facial.jpg",
  },
  {
    slug: "services/body",
    href: "/services/body",
    image: "/media/home/endospheres.jpg",
  },
  {
    slug: "services/tricho",
    href: "/services/tricho",
    image: "/media/files/land/303/8b2e9288e47ba7705d700a8d7edb596e.jpeg",
  },
  {
    slug: "services/laser",
    href: "/services/laser",
    image: "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
  },
  {
    slug: "services/mikroneulanrf",
    href: "/services/mikroneulanrf",
    image: "/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg",
  },
  {
    slug: "services/eyebrows",
    href: "/services/eyebrows",
    image: "/media/home/brows.jpg",
  },
  {
    slug: "services/packages",
    href: "/services/packages",
    image: "/media/home/packages.jpg",
  },
  {
    slug: "services/gift-cards",
    href: "/services/gift-cards",
    image: "/media/home/arosha.jpg",
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = getPageContent("services", locale as Locale);
  return {
    title: c?.title,
    description: c ? excerpt(c.body) : undefined,
    alternates: localeAlternates("/services", locale),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = locale as Locale;
  setRequestLocale(locale);
  const tc = await getTranslations("Common");
  const page = getPageContent("services", l);

  return (
    <section className="bg-page py-[clamp(52px,7vw,104px)]">
      <Container>
        <div className="mb-[clamp(32px,4vw,56px)] max-w-[700px]">
          <Eyebrow className="mb-[16px]">{page?.title}</Eyebrow>
          <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
            {page?.title}
          </h1>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
          {SERVICES.map((item, index) => {
            const content = getPageContent(item.slug, l);
            if (!content) return null;

            return (
              <article
                key={item.slug}
                className="group flex min-h-full flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card transition-all duration-300 hover:-translate-y-[6px] hover:border-line-card-hover hover:shadow-card"
              >
                <Link
                  href={item.href}
                  className="relative block h-[248px] overflow-hidden"
                >
                  <span className="absolute top-[24px] left-[20px] z-10 font-display text-[24px] text-[rgba(58,42,28,.34)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Image
                    src={item.image}
                    alt={content.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 900px) 100vw, 33vw"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-[clamp(22px,2.4vw,30px)]">
                  <h2 className="font-display text-[26px] leading-[1.1] font-semibold text-ink">
                    {content.title}
                  </h2>
                  <p className="mt-[14px] flex-1 font-sans text-[13px] leading-[1.7] font-light text-body">
                    {excerpt(content.body, 150)}
                  </p>
                  <div className="mt-[22px] flex flex-wrap gap-[14px]">
                    <Button
                      href={item.href}
                      variant="textLink"
                      iconRight={ArrowUpRight}
                    >
                      {tc("readMore")}
                    </Button>
                    <Button
                      href={{
                        pathname: "/booking",
                        query: { service: bookingKeyForSlug(item.slug) },
                      }}
                      variant="textLink"
                      iconRight={ArrowRight}
                    >
                      {tc("book")}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function bookingKeyForSlug(slug: string) {
  const map: Record<string, string> = {
    "services/face": "facial",
    "services/body": "body",
    "services/tricho": "trichology",
    "services/laser": "laser",
    "services/mikroneulanrf": "rf",
    "services/eyebrows": "brows",
    "services/packages": "packages",
    "services/gift-cards": "packages",
  };
  return map[slug] ?? "";
}

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { BookServiceCta } from "@/components/booking/BookServiceCta";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TreatmentCard } from "@/components/services/TreatmentCard";
import { bookingKeyForContentSlug } from "@/content/booking-services";
import { getLivePageContent } from "@/lib/live-content";
import type { Locale } from "@/i18n/routing";
import { excerpt } from "@/lib/seo";

type TreatmentItem = {
  group: string | null;
  title: string;
  description: string;
  price: string;
};

const SERVICE_IMAGES: Record<string, string[]> = {
  "services/face": [
    "/media/home/facial.jpg",
    "/media/files/land/104/760bda4adade7e51ab613436640590b3.jpg",
  ],
  "services/body": [
    "/media/home/endospheres.jpg",
    "/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg",
    "/media/files/land/133/aee24846322a462b149cee1d4c9fbdb9.jpg",
  ],
  "services/tricho": [
    "/media/files/land/303/8b2e9288e47ba7705d700a8d7edb596e.jpeg",
    "/media/files/land/303/5e7135aaffc757abe7dd5f3cb263e823.jpg",
  ],
  "services/laser": [
    "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
    "/media/files/land/253/41a8f8afce29bcfce17339e4d4e4fa11.jpg",
    "/media/files/land/255/21fb9e172f08b4966fbd887ca08b01a5.jpg",
  ],
  "services/mikroneulanrf": [
    "/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg",
    "/media/files/land/280/4786a56a1b037c521fe8acebe5c90a9c.jpeg",
  ],
  "services/eyebrows": [
    "/media/home/brows.jpg",
    "/media/files/land/303/fb364d611074112e8e9cdf3880b1369f.jpg",
  ],
  "services/packages": [
    "/media/home/packages.jpg",
    "/media/files/land/133/aee24846322a462b149cee1d4c9fbdb9.jpg",
  ],
  "services/gift-cards": [
    "/media/home/arosha.jpg",
    "/media/images/photo/5.jpg",
  ],
};

export async function ServiceDetailPage({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const content = await getLivePageContent(slug, locale);
  if (!content) return null;

  const treatments = parseTreatments(content.body);
  const bookingKey = bookingKeyForContentSlug(slug);
  const common = await getTranslations("Common");
  const nav = await getTranslations("Nav");
  const images = SERVICE_IMAGES[slug] ?? ["/media/home/facial.jpg"];
  const heroImage = images[0];

  if (!bookingKey || treatments.length === 0) {
    return (
      <>
        <article className="bg-page py-[clamp(48px,7vw,96px)]">
          <Container className="max-w-[880px]">
            <Eyebrow className="mb-[16px]">{nav("services")}</Eyebrow>
            <h1 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.04] font-medium text-ink">
              {content.title}
            </h1>
            <div className="mt-[clamp(24px,3vw,40px)]">
              <Markdown>{content.body}</Markdown>
            </div>
          </Container>
        </article>
        <BookServiceCta contentSlug={slug} />
      </>
    );
  }

  return (
    <article className="bg-page">
      <section className="border-b border-line-card bg-alt py-[clamp(48px,7vw,96px)]">
        <Container>
          <div className="grid items-center gap-[clamp(28px,5vw,72px)] lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
            <div>
              <Eyebrow className="mb-[16px]">{nav("services")}</Eyebrow>
              <h1 className="font-display text-[clamp(38px,5vw,72px)] leading-[1.02] font-medium text-ink">
                {content.title}
              </h1>
              <p className="mt-[22px] max-w-[650px] font-sans text-[16px] leading-[1.8] font-light text-body">
                {excerpt(treatments[0]?.description || content.body, 220)}
              </p>
              <div className="mt-[30px]">
                <Button
                  href={{ pathname: "/booking", query: { service: bookingKey } }}
                  iconRight={ArrowRight}
                >
                  {common("bookThis")}
                </Button>
              </div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-[var(--radius)] border border-line-card bg-card shadow-card sm:min-h-[420px]">
              <Image
                src={heroImage}
                alt={content.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-[clamp(44px,7vw,96px)]">
        <Container>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(16px,1.8vw,26px)]">
            {treatments.map((item, index) => {
              const image = images[index % images.length] ?? heroImage;
              return (
                <TreatmentCard
                  key={`${item.group ?? "service"}-${item.title}-${index}`}
                  item={item}
                  index={index}
                  image={image}
                  bookingKey={bookingKey}
                  bookLabel={common("bookThis")}
                  seeMoreLabel={common("seeMore")}
                  seeLessLabel={common("seeLess")}
                />
              );
            })}
          </div>
        </Container>
      </section>
    </article>
  );
}

function parseTreatments(markdown: string): TreatmentItem[] {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n## Media[\s\S]*$/i, "")
    .split("\n");
  const items: TreatmentItem[] = [];
  let group: string | null = null;
  let current: { title: string; description: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const h4 = trimmed.match(/^####\s+(.+)$/);

    if (h3) {
      group = cleanInlineMarkdown(h3[1]);
      continue;
    }

    if (h4) {
      const heading = cleanInlineMarkdown(h4[1]);
      if (isPriceLine(heading)) {
        if (current) {
          const description = cleanDescription(current.description.join("\n"));
          if (description) {
            items.push({
              group,
              title: current.title,
              description,
              price: heading,
            });
          }
          current = null;
        }
      } else {
        current = { title: heading, description: [] };
      }
      continue;
    }

    if (current && !isBasketMarker(trimmed)) current.description.push(line);
  }

  return items;
}

function isPriceLine(value: string) {
  return /(?:€|â‚¬|\beur\b|\d+\s*-\s*\d+|\d+\s*\/|\d+\s*min)/i.test(value);
}

function isBasketMarker(value: string) {
  return /^(into a basket|koriin|в корзину)$/i.test(value);
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

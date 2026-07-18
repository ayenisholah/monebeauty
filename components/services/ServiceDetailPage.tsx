import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TreatmentCard } from "@/components/services/TreatmentCard";
import { getPublishedServiceByPath } from "@/lib/live-content";
import type { Locale } from "@/i18n/routing";
import { excerpt } from "@/lib/seo";
import { notFound } from "next/navigation";
import { parseProcedures } from "@/lib/procedures";
import { PUBLIC_PATHS } from "@/lib/public-routes";

const SERVICE_IMAGES: Record<string, string[]> = {
  facial: [
    "/media/home/facial.jpg",
    "/media/files/land/104/760bda4adade7e51ab613436640590b3.jpg",
  ],
  body: [
    "/media/home/endospheres.jpg",
    "/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg",
    "/media/files/land/133/aee24846322a462b149cee1d4c9fbdb9.jpg",
  ],
  trichology: [
    "/media/files/land/303/8b2e9288e47ba7705d700a8d7edb596e.jpeg",
    "/media/files/land/303/5e7135aaffc757abe7dd5f3cb263e823.jpg",
  ],
  laser: [
    "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
    "/media/files/land/253/41a8f8afce29bcfce17339e4d4e4fa11.jpg",
    "/media/files/land/255/21fb9e172f08b4966fbd887ca08b01a5.jpg",
  ],
  rf: [
    "/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg",
    "/media/files/land/280/4786a56a1b037c521fe8acebe5c90a9c.jpeg",
  ],
  brows: [
    "/media/home/brows.jpg",
    "/media/files/land/303/fb364d611074112e8e9cdf3880b1369f.jpg",
  ],
  packages: [
    "/media/home/packages.jpg",
    "/media/files/land/133/aee24846322a462b149cee1d4c9fbdb9.jpg",
  ],
  giftCards: ["/media/home/arosha.jpg", "/media/images/photo/5.jpg"],
};

export async function ServiceDetailPage({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const service = await getPublishedServiceByPath(`/${slug}`, locale);
  if (!service) notFound();
  const treatments = parseProcedures(service.content.whatItIs);
  const bookingKey = service.bookable ? service.slug : undefined;
  const common = await getTranslations("Common");
  const nav = await getTranslations("Nav");
  const images = service.images.length
    ? service.images
    : (SERVICE_IMAGES[service.slug] ?? []);
  const heroImage = images[0];
  const summary =
    service.content.shortDesc.trim() || excerpt(service.content.whatItIs, 220);
  const bookHref = bookingKey
    ? {
        pathname: PUBLIC_PATHS.booking,
        query: { service: bookingKey },
      }
    : undefined;
  const showTreatmentCards =
    Boolean(bookingKey) && treatments.length > 0 && images.length > 0;

  return (
    <article className="bg-page">
      <section className="relative isolate min-h-[clamp(380px,56vh,600px)] overflow-hidden">
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt={service.content.imageAlt || service.content.h1}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(34,30,27,.88)] via-[rgba(34,30,27,.42)] to-[rgba(34,30,27,.16)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-alt" />
        )}
        <Container className="absolute inset-x-0 bottom-0 pb-[clamp(28px,4.5vw,64px)]">
          <Eyebrow
            tone={heroImage ? "gold" : "accent"}
            tracking="wide"
            className="mb-[14px]"
          >
            {nav("services")}
          </Eyebrow>
          <h1
            className={`font-display text-[clamp(34px,4.6vw,64px)] leading-[1.03] font-medium ${
              heroImage ? "text-cta-heading" : "text-ink"
            }`}
          >
            {service.content.h1}
          </h1>
          <p
            className={`mt-[16px] max-w-[52ch] font-sans text-copy leading-[1.75] font-normal ${
              heroImage
                ? "text-cta-heading [text-shadow:0_1px_10px_rgba(58,42,28,.72)]"
                : "text-body"
            }`}
          >
            {summary}
          </p>
          {bookHref ? (
            <div className="mt-[26px]">
              <Button
                href={bookHref}
                variant={heroImage ? "primaryOnDark" : "primary"}
                iconRight={ArrowRight}
              >
                {common("bookThis")}
              </Button>
            </div>
          ) : null}
        </Container>
      </section>

      <section className="py-[clamp(40px,6vw,76px)]">
        <Container>
          <div className="grid gap-[clamp(28px,4vw,56px)] nav:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <aside className="nav:sticky nav:top-[104px] nav:self-start">
              <div className="rounded-[var(--radius)] border border-line-card bg-card p-[clamp(22px,2.4vw,30px)]">
                <Eyebrow className="mb-[12px]">{nav("services")}</Eyebrow>
                <p className="font-display text-[clamp(22px,2.4vw,28px)] leading-[1.12] font-medium text-ink">
                  {service.content.h1}
                </p>
                <p className="mt-[14px] font-sans text-copy leading-[1.7] font-normal text-body">
                  {summary}
                </p>
                {bookHref ? (
                  <div className="mt-[24px]">
                    <Button
                      href={bookHref}
                      iconRight={ArrowRight}
                      className="w-full justify-center"
                    >
                      {common("bookThis")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </aside>
            <div className="min-w-0">
              {showTreatmentCards && bookingKey ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(16px,1.8vw,26px)]">
                  {treatments.map((item, index) => (
                    <TreatmentCard
                      key={`${item.group ?? "service"}-${item.title}-${index}`}
                      item={item}
                      index={index}
                      image={images[index % images.length]}
                      bookingKey={bookingKey}
                      bookLabel={common("bookThis")}
                      seeMoreLabel={common("seeMore")}
                      seeLessLabel={common("seeLess")}
                    />
                  ))}
                </div>
              ) : (
                <Markdown variant="technology">
                  {service.content.whatItIs}
                </Markdown>
              )}
            </div>
          </div>
        </Container>
      </section>
    </article>
  );
}

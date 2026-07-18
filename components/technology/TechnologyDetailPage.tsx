import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getPublishedTechnologyByPath } from "@/lib/live-content";
import type { Locale } from "@/i18n/routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export async function TechnologyDetailPage({
  path,
  locale,
}: {
  path: string;
  locale: Locale;
}) {
  const technology = await getPublishedTechnologyByPath(path, locale);
  if (!technology) notFound();
  const common = await getTranslations("Common");
  const image = technology.images[0];
  const bookable = technology.relatedService?.bookable;
  const bookHref = {
    pathname: PUBLIC_PATHS.booking,
    query: { service: technology.relatedService?.slug ?? technology.slug },
  } as const;

  return (
    <article className="bg-page">
      <section className="relative isolate min-h-[clamp(380px,56vh,600px)] overflow-hidden">
        {image ? (
          <>
            <Image
              src={image}
              alt={technology.content.imageAlt || technology.content.name}
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
            tone={image ? "gold" : "accent"}
            tracking="wide"
            className="mb-[14px]"
          >
            {technology.content.specification}
          </Eyebrow>
          <h1
            className={`font-display text-[clamp(34px,4.6vw,64px)] leading-[1.03] font-medium ${
              image ? "text-cta-heading" : "text-ink"
            }`}
          >
            {technology.content.name}
          </h1>
          <p
            className={`mt-[16px] max-w-[52ch] font-sans text-[clamp(14.5px,1.3vw,16px)] leading-[1.75] font-normal ${
              image
                ? "text-cta-heading [text-shadow:0_1px_10px_rgba(58,42,28,.72)]"
                : "text-body"
            }`}
          >
            {technology.content.summary}
          </p>
          {bookable ? (
            <div className="mt-[26px]">
              <Button
                href={bookHref}
                variant={image ? "primaryOnDark" : "primary"}
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
                <Eyebrow className="mb-[12px]">
                  {technology.content.specification}
                </Eyebrow>
                <p className="font-display text-[clamp(22px,2.4vw,28px)] leading-[1.12] font-medium text-ink">
                  {technology.content.name}
                </p>
                <p className="mt-[14px] font-sans text-[14.5px] leading-[1.7] font-light text-body">
                  {technology.content.summary}
                </p>
                {bookable ? (
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
              <Markdown variant="technology">
                {technology.content.body}
              </Markdown>
            </div>
          </div>
        </Container>
      </section>
    </article>
  );
}

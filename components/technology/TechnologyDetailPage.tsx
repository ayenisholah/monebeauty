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
  return (
    <article className="bg-page">
      <section className="border-b border-line-card bg-alt py-[clamp(40px,6vw,72px)]">
        <Container width="narrow">
          <div className="grid overflow-hidden rounded-[var(--radius)] border border-line-card bg-card min-[860px]:grid-cols-2">
            {image ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-alt min-[860px]:aspect-auto min-[860px]:h-full min-[860px]:max-h-[340px] min-[860px]:min-h-[300px]">
                <Image
                  src={image}
                  alt={technology.content.imageAlt || technology.content.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 860px) 50vw, 100vw"
                />
              </div>
            ) : null}
            <div className="flex flex-col justify-center p-[clamp(26px,3.4vw,46px)]">
              <Eyebrow className="mb-[12px]">
                {technology.content.specification}
              </Eyebrow>
              <h1 className="font-display text-[clamp(34px,4.2vw,56px)] leading-[1.04] font-medium text-ink">
                {technology.content.name}
              </h1>
              <p className="mt-[14px] max-w-[48ch] font-sans text-[clamp(14.5px,1.3vw,16px)] leading-[1.75] font-light text-body">
                {technology.content.summary}
              </p>
              {technology.relatedService?.bookable ? (
                <div className="mt-[24px]">
                  <Button
                    href={{
                      pathname: PUBLIC_PATHS.booking,
                      query: { service: technology.relatedService.slug },
                    }}
                    iconRight={ArrowRight}
                  >
                    {common("bookThis")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Container>
      </section>
      <section className="py-[clamp(40px,6vw,76px)]">
        <Container className="max-w-[872px]">
          <Markdown variant="technology">{technology.content.body}</Markdown>
        </Container>
      </section>
    </article>
  );
}

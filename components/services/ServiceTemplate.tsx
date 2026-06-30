import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { CTABand } from "@/components/marketing/CTABand";
import { Breadcrumb } from "./Breadcrumb";
import { FaqAccordion } from "./FaqAccordion";
import { TREATMENTS, getTreatment, type AppLocale } from "@/content/treatments";

function Prose({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[clamp(36px,5vw,56px)]">
      <h2 className="font-display text-[clamp(24px,3vw,32px)] font-medium text-ink">
        {heading}
      </h2>
      <div className="mt-[16px] font-sans text-[15px] leading-[1.8] font-light text-body">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-[10px]">
      {items.map((it, i) => (
        <li key={i} className="flex gap-[12px]">
          <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export async function ServiceTemplate({
  slug,
  locale,
}: {
  slug: string;
  locale: AppLocale;
}) {
  const treatment = getTreatment(slug)!;
  const c = treatment.content[locale];
  const t = await getTranslations("Service");
  const tc = await getTranslations("Common");

  const related = TREATMENTS.filter((x) => x.slug !== slug).slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="bg-alt py-[clamp(40px,5vw,72px)]">
        <Container>
          <Breadcrumb
            items={[
              { label: t("breadcrumbHome"), href: "/" },
              { label: t("breadcrumbServices"), href: "/services" },
              { label: c.title },
            ]}
          />
          <div className="mt-[24px] flex flex-wrap items-stretch gap-[clamp(28px,4vw,56px)]">
            <div className="flex min-w-[300px] flex-[1.1_1_420px] flex-col justify-center">
              <h1 className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.05] font-medium text-ink">
                {c.title}
              </h1>
              <p className="mt-[20px] max-w-[480px] font-sans text-lead leading-[1.75] font-light text-body">
                {c.shortDesc}
              </p>
              <div className="mt-[28px]">
                <Button href="/booking" iconRight={ArrowRight}>
                  {t("bookThis")}
                </Button>
              </div>
            </div>
            <div className="min-w-[280px] flex-[.9_1_320px]">
              <ImageSlot
                caption={treatment.imageCaption}
                minHeight={420}
                priority
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Body */}
      <Container className="max-w-[760px] py-[clamp(48px,6vw,80px)]">
        <Prose heading={t("whatItIs")}>
          <p>{c.whatItIs ?? t("clinicToProvide")}</p>
        </Prose>

        {c.suitableFor ? (
          <Prose heading={t("suitableFor")}>
            <BulletList items={c.suitableFor} />
          </Prose>
        ) : null}

        {c.benefits ? (
          <Prose heading={t("benefits")}>
            <BulletList items={c.benefits} />
          </Prose>
        ) : null}

        {c.process ? (
          <Prose heading={t("process")}>
            <ol className="flex flex-col gap-[18px]">
              {c.process.map((step, i) => (
                <li key={i} className="flex gap-[16px]">
                  <span className="font-display text-[22px] font-medium text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-[3px]">{step}</span>
                </li>
              ))}
            </ol>
          </Prose>
        ) : null}

        {c.safety ? (
          <Prose heading={t("safety")}>
            <p>{c.safety}</p>
          </Prose>
        ) : null}

        {c.sessions || c.results ? (
          <div className="mt-[clamp(36px,5vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[20px] rounded-[var(--radius)] border border-line-card bg-card p-[clamp(20px,3vw,32px)]">
            {c.sessions ? (
              <div>
                <div className="font-sans text-[11px] font-medium tracking-[.16em] text-muted uppercase">
                  {t("sessions")}
                </div>
                <div className="mt-[8px] font-sans text-[14.5px] leading-[1.6] font-light text-body">
                  {c.sessions}
                </div>
              </div>
            ) : null}
            {c.results ? (
              <div>
                <div className="font-sans text-[11px] font-medium tracking-[.16em] text-muted uppercase">
                  {t("results")}
                </div>
                <div className="mt-[8px] font-sans text-[14.5px] leading-[1.6] font-light text-body">
                  {c.results}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {c.preCare ? (
          <Prose heading={t("preCare")}>
            <p>{c.preCare}</p>
          </Prose>
        ) : null}

        {c.postCare ? (
          <Prose heading={t("postCare")}>
            <p>{c.postCare}</p>
          </Prose>
        ) : null}

        {c.contraindications ? (
          <Prose heading={t("contraindications")}>
            <BulletList items={c.contraindications} />
          </Prose>
        ) : null}

        {c.faq && c.faq.length > 0 ? (
          <section className="mt-[clamp(36px,5vw,56px)]">
            <h2 className="mb-[16px] font-display text-[clamp(24px,3vw,32px)] font-medium text-ink">
              {t("faq")}
            </h2>
            <FaqAccordion items={c.faq} />
          </section>
        ) : null}
      </Container>

      {/* Related */}
      <section className="bg-alt py-[clamp(60px,7vw,100px)]">
        <Container>
          <h2 className="mb-[clamp(28px,3vw,40px)] font-display text-h2-treat font-medium text-ink">
            {t("related")}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
            {related.map((r, i) => (
              <Card
                key={r.slug}
                number={String(i + 1).padStart(2, "0")}
                title={r.content[locale].title}
                description={r.content[locale].shortDesc}
                imageCaption={r.imageCaption}
                href={`/services/${r.slug}`}
                learnMore={tc("learnMore")}
              />
            ))}
          </div>
        </Container>
      </section>

      <CTABand id="book" />
    </>
  );
}

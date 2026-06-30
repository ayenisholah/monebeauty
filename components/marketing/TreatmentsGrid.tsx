import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type CardData = {
  number: string;
  title: string;
  description: string;
  slug: string;
  imageCaption: string;
};

export async function TreatmentsGrid() {
  const t = await getTranslations("Home.treatments");
  const tc = await getTranslations("Common");
  const cards = t.raw("cards") as CardData[];

  return (
    <section id="treatments" className="bg-alt py-[clamp(60px,7vw,110px)]">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          trailing={
            <Button href="/services" variant="textLink" iconRight={ArrowRight}>
              {tc("allTreatments")}
            </Button>
          }
          className="mb-[clamp(34px,4vw,54px)]"
        >
          {t("heading")}
        </SectionHeading>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
          {cards.map((c) => (
            <Card
              key={c.slug}
              number={c.number}
              title={c.title}
              description={c.description}
              imageCaption={c.imageCaption}
              href={`/services/${c.slug}`}
              learnMore={tc("learnMore")}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

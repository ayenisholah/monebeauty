import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

export async function TechWall() {
  const t = await getTranslations("Home.tech");
  const tc = await getTranslations("Common");
  const names = t.raw("names") as string[];

  return (
    <section className="bg-alt py-[clamp(60px,7vw,110px)]">
      <Container
        width="narrow"
        className="flex flex-col items-center text-center"
      >
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h2 className="font-display text-h2-tech leading-[1.12] font-medium text-ink">
          {t("heading")}
        </h2>

        <div className="mt-[clamp(30px,4vw,48px)] flex flex-wrap items-center justify-center gap-x-[clamp(28px,4vw,56px)] gap-y-[18px]">
          {names.map((name) => (
            <span
              key={name}
              className="font-display text-tech font-medium tracking-[.06em] text-[#A89A85] opacity-85 transition-colors hover:text-ink hover:opacity-100"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-[clamp(30px,4vw,44px)]">
          <Button href="/services" variant="outline" iconRight={ArrowUpRight}>
            {tc("allTechnologies")}
          </Button>
        </div>
      </Container>
    </section>
  );
}

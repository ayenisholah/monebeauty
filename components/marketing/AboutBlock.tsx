import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";

export async function AboutBlock() {
  const t = await getTranslations("Home.about");
  const tc = await getTranslations("Common");

  return (
    <section id="about" className="bg-page py-[clamp(60px,7vw,110px)]">
      <Container>
        <div className="flex flex-wrap items-center gap-[clamp(32px,4.5vw,72px)]">
          <div className="min-w-[300px] flex-[1_1_440px]">
            <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
            <h2 className="font-display text-h2 leading-[1.06] font-medium text-ink">
              {t("headingLine1")}
              <br />
              {t("headingLine2")}
            </h2>
            <p className="mt-[24px] max-w-[520px] font-sans text-lead leading-[1.8] font-light text-body">
              {t("paragraph1")}
            </p>
            <p className="mt-[16px] max-w-[520px] font-sans text-lead leading-[1.8] font-light text-body">
              {t("paragraph2")}
            </p>
            <div className="mt-[30px]">
              <Button href="/about" variant="outline">
                {tc("moreAboutUs")}
              </Button>
            </div>
          </div>
          <div className="min-w-[280px] flex-[.85_1_320px]">
            <ImageSlot caption={t("imageCaption")} minHeight={480} />
          </div>
        </div>
      </Container>
    </section>
  );
}

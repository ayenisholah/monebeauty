import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";

/**
 * Dark rounded Online-Booking CTA band. Reused on service pages with
 * treatment-specific copy via the `heading`/`body` overrides.
 */
export async function CTABand({
  id = "book",
  heading,
  body,
}: {
  id?: string;
  heading?: string;
  body?: string;
}) {
  const t = await getTranslations("Home.cta");

  return (
    <section id={id} className="bg-page py-[clamp(40px,5vw,80px)]">
      <Container>
        <div className="flex flex-wrap items-center gap-[clamp(28px,4vw,56px)] overflow-hidden rounded-[var(--radius)] bg-cta p-[clamp(28px,4vw,56px)]">
          <div className="min-w-[280px] flex-[1.1_1_360px]">
            <Eyebrow tone="gold" className="mb-[16px]">
              {t("eyebrow")}
            </Eyebrow>
            <h2 className="font-display text-h2-cta leading-[1.06] font-medium text-cta-heading">
              {heading ?? t("heading")}
            </h2>
            <p className="mt-[20px] max-w-[460px] font-sans text-lead leading-[1.75] font-light text-cta-body">
              {body ?? t("body")}
            </p>
            <div className="mt-[30px]">
              <Button
                href="/booking"
                variant="primaryOnDark"
                iconRight={ArrowRight}
              >
                {t("button")}
              </Button>
            </div>
          </div>
          <div className="min-w-[240px] flex-[.9_1_300px]">
            <ImageSlot
              caption={t("imageCaption")}
              minHeight={340}
              tone="dark"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

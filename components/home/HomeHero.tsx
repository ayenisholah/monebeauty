import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { BRAND } from "@/content/site";

/** Homepage hero: large serif brand heading over the real treatment video. */
export async function HomeHero() {
  const t = await getTranslations("Home");
  return (
    <section className="bg-page pt-[clamp(28px,4vw,52px)]">
      <Container className="text-center">
        <h1 className="font-display text-[clamp(40px,7vw,92px)] leading-[1.02] font-medium text-ink">
          {BRAND.name}
        </h1>
        <p className="mx-auto mt-[16px] max-w-[620px] font-sans text-lead leading-[1.7] font-light text-body">
          {t("metaDescription")}
        </p>
      </Container>
      <div className="mt-[clamp(24px,3vw,40px)]">
        <div className="relative h-[clamp(340px,55vh,600px)] w-full overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/media/hero-poster.jpg"
          >
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Phone, EnvelopeSimple } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT } from "@/content/site";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Booking" });
  return {
    title: t("metaTitle"),
    alternates: localeAlternates("/booking", locale),
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");

  return (
    <section className="bg-page py-[clamp(60px,8vw,120px)]">
      <Container className="max-w-[680px] text-center">
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>
        <p className="mx-auto mt-[20px] max-w-[520px] font-sans text-lead leading-[1.8] font-light text-body">
          {t("body")}
        </p>
        <div className="mt-[32px] flex flex-wrap justify-center gap-[14px]">
          <ButtonLink href={CONTACT.phoneHref} newTab={false} iconRight={Phone}>
            {t("callUs")}
          </ButtonLink>
          <ButtonLink
            href={CONTACT.emailHref}
            newTab={false}
            variant="outline"
            iconRight={EnvelopeSimple}
          >
            {t("emailUs")}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

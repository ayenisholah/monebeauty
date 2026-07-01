import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { bookableServices } from "@/content/booking-services";
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { locale } = await params;
  const { service } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");

  const services = bookableServices().map((s) => ({
    key: s.key,
    image: s.image,
  }));
  const initialService =
    service && services.some((s) => s.key === service) ? service : undefined;

  return (
    <section className="bg-page py-[clamp(48px,7vw,96px)]">
      <Container className="max-w-[860px]">
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>
        <p className="mt-[16px] max-w-[560px] font-sans text-lead leading-[1.7] font-light text-body">
          {t("intro")}
        </p>
        <BookingWizard
          services={services}
          initialService={initialService}
          fallback={{
            phone: CONTACT.phone,
            phoneHref: CONTACT.phoneHref,
            email: CONTACT.email,
            emailHref: CONTACT.emailHref,
          }}
        />
      </Container>
    </section>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Checkout" });
  return {
    title: t("metaTitle"),
    alternates: localeAlternates("/checkout", locale),
    robots: { index: false },
  };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Checkout");

  return (
    <section className="bg-page py-[clamp(52px,7vw,104px)]">
      <Container>
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>
        <p className="mt-[16px] max-w-[620px] font-sans text-lead font-light text-body">
          {t("intro")}
        </p>
        <div className="mt-[clamp(28px,4vw,48px)]">
          <CheckoutForm />
        </div>
      </Container>
    </section>
  );
}

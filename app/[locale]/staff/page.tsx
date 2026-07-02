import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StaffSchedule } from "@/components/staff/StaffSchedule";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Staff" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Staff");

  return (
    <section className="bg-page py-[clamp(48px,7vw,96px)]">
      <Container>
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>
        <p className="mt-[16px] max-w-[660px] font-sans text-lead font-light text-body">
          {t("intro")}
        </p>
        <div className="mt-[clamp(28px,4vw,48px)]">
          <StaffSchedule />
        </div>
      </Container>
    </section>
  );
}

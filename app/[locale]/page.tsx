import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/marketing/Hero";
import { TreatmentsGrid } from "@/components/marketing/TreatmentsGrid";
import { AboutBlock } from "@/components/marketing/AboutBlock";
import { TechWall } from "@/components/marketing/TechWall";
import { CTABand } from "@/components/marketing/CTABand";
import { FeaturesStrip } from "@/components/marketing/FeaturesStrip";
import { JsonLd } from "@/components/JsonLd";
import { medicalClinicJsonLd } from "@/lib/seo";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <JsonLd data={medicalClinicJsonLd()} />
      <Hero />
      <TreatmentsGrid />
      <AboutBlock />
      <TechWall />
      <CTABand />
      <FeaturesStrip />
    </>
  );
}

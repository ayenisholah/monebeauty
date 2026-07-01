import { setRequestLocale } from "next-intl/server";
import { HomeHero } from "@/components/home/HomeHero";
import { FeaturedServices } from "@/components/home/FeaturedServices";
import { HomeContentSections } from "@/components/home/HomeSections";
import { AroshaShowcase } from "@/components/home/AroshaShowcase";
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
      <HomeHero />
      <FeaturedServices />
      <AroshaShowcase />
      <HomeContentSections />
    </>
  );
}

import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getPublishedTechnologyByPath } from "@/lib/live-content";
import type { Locale } from "@/i18n/routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export async function TechnologyDetailPage({ path, locale }: { path: string; locale: Locale }) {
  const technology = await getPublishedTechnologyByPath(path, locale);
  if (!technology) notFound();
  const common = await getTranslations("Common");
  const image = technology.images[0];
  return <article className="bg-page">
    <section className="border-b border-line-card bg-alt py-[clamp(48px,7vw,96px)]"><Container><div className="grid items-center gap-[clamp(28px,5vw,72px)] lg:grid-cols-2"><div><Eyebrow className="mb-[16px]">{technology.content.specification}</Eyebrow><h1 className="font-display text-[clamp(38px,5vw,72px)] leading-[1.02] font-medium text-ink">{technology.content.name}</h1><p className="mt-[20px] font-sans text-[16px] leading-[1.8] text-body">{technology.content.summary}</p>{technology.relatedService?.bookable ? <div className="mt-[28px]"><Button href={{ pathname: PUBLIC_PATHS.booking, query: { service: technology.relatedService.slug } }} iconRight={ArrowRight}>{common("bookThis")}</Button></div> : null}</div>{image ? <div className="relative min-h-[320px] overflow-hidden rounded-[var(--radius)] border border-line-card bg-card shadow-card sm:min-h-[440px]"><Image src={image} alt={technology.content.imageAlt || technology.content.name} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" /></div> : null}</div></Container></section>
    <section className="py-[clamp(44px,7vw,96px)]"><Container className="max-w-[880px]"><Markdown>{technology.content.body}</Markdown></Container></section>
  </article>;
}

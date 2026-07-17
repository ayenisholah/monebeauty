import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Markdown } from "@/components/Markdown";
import { prisma } from "@/lib/db";
import { localeAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { articlePath } from "@/lib/public-routes";

async function article(slug: string, locale: Locale) {
  return prisma.article.findFirst({ where: { slug, archivedAt: null, contents: { some: { locale, status: "PUBLISHED" } } }, include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } } });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const row = await article(slug, locale as Locale);
  const content = row?.contents[0];
  return { title: content?.seoTitle || content?.title, description: content?.seoDescription || content?.excerpt || undefined, alternates: localeAlternates(articlePath(slug), locale) };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const row = await article(slug, locale as Locale);
  const content = row?.contents[0];
  if (!row || !content) notFound();
  return <article className="bg-page py-[clamp(52px,7vw,104px)]"><Container className="max-w-[880px]"><h1 className="font-display text-[clamp(38px,5vw,64px)] leading-[1.04] font-medium">{content.title}</h1>{row.coverImage ? <div className="relative mt-[28px] h-[clamp(280px,48vw,520px)] overflow-hidden rounded-[var(--radius)]"><Image src={row.coverImage} alt={row.coverAlt || content.title} fill priority className="object-cover" sizes="100vw" /></div> : null}<div className="mt-[32px]"><Markdown>{content.body}</Markdown></div></Container></article>;
}

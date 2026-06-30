import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ARTICLES, getArticle, type AppLocale } from "@/content/articles";
import { localeAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const c = article.content[locale as AppLocale];
  return {
    title: c.title,
    description: c.excerpt,
    alternates: localeAlternates(`/blog/${slug}`, locale),
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  setRequestLocale(locale);
  const c = article.content[locale as AppLocale];

  return (
    <article className="bg-page py-[clamp(48px,6vw,88px)]">
      <Container className="max-w-[720px]">
        <time className="font-sans text-[12px] tracking-[.14em] text-muted uppercase">
          {new Date(article.date).toLocaleDateString(locale)}
        </time>
        <h1 className="mt-[12px] font-display text-h2 leading-[1.06] font-medium text-ink">
          {c.title}
        </h1>
        <div className="mt-[24px] font-sans text-[15px] leading-[1.8] font-light whitespace-pre-line text-body">
          {c.body}
        </div>
      </Container>
    </article>
  );
}

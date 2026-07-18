import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Link } from "@/i18n/navigation";
import { getPublishedArticles } from "@/lib/live-content";
import { localeAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { PUBLIC_PATHS, articlePath } from "@/lib/public-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: t("modules.blog"),
    alternates: localeAlternates(PUBLIC_PATHS.articles, locale),
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = locale as Locale;
  const [t, articles] = await Promise.all([
    getTranslations("Admin"),
    getPublishedArticles(currentLocale),
  ]);
  return (
    <section className="bg-page py-[clamp(52px,7vw,104px)]">
      <Container>
        <Eyebrow className="mb-[14px]">Mone Beauty Clinic</Eyebrow>
        <h1 className="font-display text-h2 font-medium text-ink">
          {t("modules.blog")}
        </h1>
        <div className="mt-[32px] grid gap-[20px] sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="overflow-hidden rounded-[var(--radius)] border border-line-card bg-card"
            >
              {article.coverImage ? (
                <Link
                  href={articlePath(article.slug)}
                  className="relative block h-[220px]"
                >
                  <Image
                    src={article.coverImage}
                    alt={article.coverAlt || article.content.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 900px) 50vw, 33vw"
                  />
                </Link>
              ) : null}
              <div className="p-[20px]">
                <h2 className="font-display text-[25px] font-medium">
                  <Link href={articlePath(article.slug)}>
                    {article.content.title}
                  </Link>
                </h2>
                {article.content.excerpt ? (
                  <p className="mt-[10px] font-sans text-compact leading-[1.7] text-body">
                    {article.content.excerpt}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!articles.length ? (
          <p className="mt-[28px] font-sans text-body">{t("common.empty")}</p>
        ) : null}
      </Container>
    </section>
  );
}

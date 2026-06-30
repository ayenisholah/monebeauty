import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Link } from "@/i18n/navigation";
import { ARTICLES, type AppLocale } from "@/content/articles";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates("/blog", locale),
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");
  const l = locale as AppLocale;

  return (
    <section className="bg-page py-[clamp(48px,6vw,88px)]">
      <Container className="max-w-[820px]">
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>

        {ARTICLES.length === 0 ? (
          <p className="mt-[28px] font-sans text-lead font-light text-muted">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-[clamp(32px,4vw,48px)] flex flex-col divide-y divide-line-card border-y border-line-card">
            {ARTICLES.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/blog/${a.slug}`}
                  className="group block py-[24px]"
                >
                  <time className="font-sans text-[12px] tracking-[.14em] text-muted uppercase">
                    {new Date(a.date).toLocaleDateString(locale)}
                  </time>
                  <h2 className="mt-[8px] font-display text-[24px] font-medium text-ink transition-colors group-hover:text-accent">
                    {a.content[l].title}
                  </h2>
                  {a.content[l].excerpt ? (
                    <p className="mt-[8px] font-sans text-[14.5px] font-light text-body">
                      {a.content[l].excerpt}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

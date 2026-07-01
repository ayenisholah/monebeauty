import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ShoppingCartSimple } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Markdown } from "@/components/Markdown";
import { ProductCard } from "@/components/shop/ProductCard";
import { Link } from "@/i18n/navigation";
import {
  PRODUCTS,
  PRODUCT_SLUGS,
  getProduct,
  formatPrice,
} from "@/content/products";
import { localeAlternates, serviceJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { routing, type Locale } from "@/i18n/routing";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  const c = p.i18n[locale as Locale];
  return {
    title: c?.name,
    description: c?.description?.slice(0, 160) || undefined,
    alternates: localeAlternates(`/catalog/${slug}`, locale),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  const product = getProduct(slug);
  if (!product) notFound();
  setRequestLocale(locale);

  const l = locale as Locale;
  const t = await getTranslations("Product");
  const c = product.i18n[l];
  const related = PRODUCTS.filter(
    (p) => p.slug !== slug && p.category === product.category,
  ).slice(0, 4);

  return (
    <section className="bg-page py-[clamp(32px,4vw,64px)]">
      <Container>
        <JsonLd
          data={serviceJsonLd(
            c.name,
            c.description?.slice(0, 300) ?? c.name,
            `${SITE}/${locale}/catalog/${slug}`,
          )}
        />
        <Link
          href="/catalog"
          className="inline-flex items-center gap-[6px] font-sans text-[12px] tracking-[.12em] text-muted uppercase transition-colors hover:text-accent"
        >
          <ArrowLeft size={14} weight="thin" />
          {t("backToCatalog")}
        </Link>

        <div className="mt-[24px] grid grid-cols-1 gap-[clamp(28px,4vw,56px)] lg:grid-cols-2">
          <div className="relative h-[clamp(320px,42vw,520px)] overflow-hidden rounded-[var(--radius)] border border-line-card bg-alt">
            {product.image ? (
              <Image
                src={product.image}
                alt={c.name}
                fill
                priority
                className="object-contain p-[clamp(24px,4vw,56px)]"
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            ) : null}
          </div>

          <div className="flex flex-col">
            <h1 className="font-display text-[clamp(26px,3vw,40px)] leading-[1.1] font-medium text-ink">
              {c.name}
            </h1>
            {product.size ? (
              <div className="mt-[10px] font-sans text-[13px] tracking-[.06em] text-muted">
                {product.size}
              </div>
            ) : null}
            <div className="mt-[14px] font-display text-[28px] font-medium text-ink">
              {formatPrice(product.price)}
            </div>
            <button
              type="button"
              aria-label={t("intoBasket")}
              className="mt-[24px] inline-flex w-fit items-center gap-[10px] rounded-[4px] bg-accent px-[30px] py-[14px] font-sans text-[12px] font-medium tracking-[.16em] text-page uppercase transition-colors hover:[background:color-mix(in_srgb,var(--accent)_86%,#000)]"
            >
              <ShoppingCartSimple size={16} weight="thin" />
              {t("intoBasket")}
            </button>

            {c.description ? (
              <div className="mt-[clamp(28px,3vw,40px)]">
                <h2 className="font-display text-[22px] font-medium text-ink">
                  {t("description")}
                </h2>
                <Markdown>{c.description}</Markdown>
              </div>
            ) : null}
          </div>
        </div>

        {related.length > 0 ? (
          <div className="mt-[clamp(48px,6vw,80px)]">
            <h2 className="mb-[clamp(20px,2vw,28px)] font-display text-h2-treat font-medium text-ink">
              {t("seeAlso")}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[clamp(16px,1.8vw,26px)]">
              {related.map((p) => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  locale={l}
                  intoBasket={t("intoBasket")}
                />
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </section>
  );
}

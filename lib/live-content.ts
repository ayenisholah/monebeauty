import "server-only";

import { prisma } from "@/lib/db";
import {
  getPageContent,
  type PageContent,
  CONTENT_PAGE_SLUGS,
} from "@/content/pages";
import {
  PRODUCTS,
  getProduct,
  type Product,
  type ProductCategory,
} from "@/content/products";
import type { Locale } from "@/i18n/routing";

export async function getLivePageContent(
  slug: string,
  locale: Locale,
): Promise<PageContent | undefined> {
  try {
    const content = await prisma.contentPage.findUnique({
      where: { slug_locale: { slug, locale } },
      select: { title: true, hero: true, body: true },
    });
    if (content) return content;
  } catch {
    // Build/preview fallback when DATABASE_URL is not reachable.
  }
  return getPageContent(slug, locale);
}

export async function getLiveProducts(): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      include: { contents: true },
    });
    if (rows.length > 0) {
      return rows.map((row) => ({
        slug: row.slug,
        category: row.category as ProductCategory,
        image: row.images[0] ?? null,
        price: Number(row.price),
        size: row.size,
        i18n: Object.fromEntries(
          row.contents.map((content) => [
            content.locale,
            { name: content.name, description: content.description },
          ]),
        ) as Product["i18n"],
      }));
    }
  } catch {
    // Build/preview fallback when DATABASE_URL is not reachable.
  }
  return PRODUCTS;
}

export async function getLiveProduct(slug: string): Promise<Product | undefined> {
  const products = await getLiveProducts();
  return products.find((product) => product.slug === slug) ?? getProduct(slug);
}

export { CONTENT_PAGE_SLUGS };

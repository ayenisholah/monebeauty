import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type Locale, type ProductCategory } from "@prisma/client";

const prisma = new PrismaClient();
const root = process.cwd();

type PageContent = {
  title: string;
  hero: string | null;
  body: string;
};

type ProductContent = {
  name: string;
  description: string;
};

type Product = {
  slug: string;
  category: ProductCategory;
  image: string | null;
  price: number | null;
  size: string | null;
  i18n: Partial<Record<Locale, ProductContent>>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

async function syncPages() {
  const pages = readJson<Record<string, Partial<Record<Locale, PageContent>>>>(
    "content/generated/pages.json",
  );
  let count = 0;
  for (const [slug, localized] of Object.entries(pages)) {
    for (const [locale, content] of Object.entries(localized) as [
      Locale,
      PageContent,
    ][]) {
      await prisma.contentPage.upsert({
        where: { slug_locale: { slug, locale } },
        update: {
          title: content.title,
          hero: content.hero,
          body: content.body,
        },
        create: {
          slug,
          locale,
          title: content.title,
          hero: content.hero,
          body: content.body,
        },
      });
      count += 1;
    }
  }
  return count;
}

async function syncProducts() {
  const products = readJson<Product[]>("content/generated/products.json");
  let count = 0;
  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        category: product.category,
        size: product.size,
        price: product.price ?? 0,
        images: product.image ? [product.image] : [],
      },
      create: {
        slug: product.slug,
        category: product.category,
        size: product.size,
        price: product.price ?? 0,
        images: product.image ? [product.image] : [],
      },
      select: { id: true },
    });

    for (const [locale, content] of Object.entries(product.i18n) as [
      Locale,
      ProductContent,
    ][]) {
      await prisma.productContent.upsert({
        where: { productId_locale: { productId: saved.id, locale } },
        update: {
          name: content.name,
          description: content.description,
        },
        create: {
          productId: saved.id,
          locale,
          name: content.name,
          description: content.description,
        },
      });
    }
    count += 1;
  }
  return count;
}

async function main() {
  const [pages, products] = await Promise.all([syncPages(), syncProducts()]);
  console.log(`Synced ${pages} content pages and ${products} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

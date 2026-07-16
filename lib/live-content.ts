import "server-only";

import { prisma } from "@/lib/db";
import type { PageContent } from "@/content/pages";
import type { Product, ProductCategory } from "@/content/products";
import type { Locale } from "@/i18n/routing";

/** Public content is database-owned: only the requested locale's published row is visible. */
export async function getLivePageContent(
  slug: string,
  locale: Locale,
): Promise<PageContent | undefined> {
  const content = await prisma.contentPage.findFirst({
    where: { slug, locale, status: "PUBLISHED" },
    select: { title: true, hero: true, body: true },
  });
  return content ?? undefined;
}

export async function getLiveProducts(locale: Locale): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: {
      archivedAt: null,
      published: true,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
    include: {
      contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
    },
  });
  return rows.flatMap((row) => {
    const content = row.contents[0];
    if (!content) return [];
    return [{
      slug: row.slug,
      category: row.category as ProductCategory,
      image: row.images[0] ?? null,
      price: Number(row.price),
      size: row.size,
      i18n: { [locale]: { name: content.name, description: content.description } } as Product["i18n"],
    }];
  });
}

export async function getLiveProduct(
  slug: string,
  locale: Locale,
): Promise<Product | undefined> {
  const row = await prisma.product.findFirst({
    where: {
      slug,
      archivedAt: null,
      published: true,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
  });
  const content = row?.contents[0];
  if (!row || !content) return undefined;
  return {
    slug: row.slug,
    category: row.category as ProductCategory,
    image: row.images[0] ?? null,
    price: Number(row.price),
    size: row.size,
    i18n: { [locale]: { name: content.name, description: content.description } } as Product["i18n"],
  };
}

export async function getPublishedServices(locale: Locale) {
  const rows = await prisma.service.findMany({
    where: {
      archivedAt: null,
      published: true,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
  });
  return rows.flatMap((row) => {
    const content = row.contents[0];
    return content ? [{ ...row, content }] : [];
  });
}

export async function getPublishedServiceByPath(path: string, locale: Locale) {
  const row = await prisma.service.findFirst({
    where: {
      publicPath: path,
      archivedAt: null,
      published: true,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
  });
  const content = row?.contents[0];
  return row && content ? { ...row, content } : undefined;
}

export async function getPublishedTechnologies(locale: Locale) {
  const rows = await prisma.technology.findMany({
    where: {
      archivedAt: null,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
    include: {
      contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
      relatedService: { select: { slug: true, bookable: true } },
    },
  });
  return rows.flatMap((row) => {
    const content = row.contents[0];
    return content ? [{ ...row, content }] : [];
  });
}

export async function getPublishedTechnologyByPath(path: string, locale: Locale) {
  const row = await prisma.technology.findFirst({
    where: {
      publicPath: path,
      archivedAt: null,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    include: {
      contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
      relatedService: { select: { slug: true, bookable: true } },
    },
  });
  const content = row?.contents[0];
  return row && content ? { ...row, content } : undefined;
}

export async function getPublishedPricing(locale: Locale) {
  const rows = await prisma.pricingItem.findMany({
    where: {
      archivedAt: null,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    orderBy: [{ order: "asc" }, { price: "asc" }],
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
  });
  return rows.flatMap((row) => row.contents[0] ? [{ ...row, content: row.contents[0] }] : []);
}

export async function getPublishedArticles(locale: Locale) {
  const rows = await prisma.article.findMany({
    where: {
      archivedAt: null,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
  });
  return rows.flatMap((row) => row.contents[0] ? [{ ...row, content: row.contents[0] }] : []);
}

export async function getBookableServices(locale: Locale) {
  const services = await getPublishedServices(locale);
  return services.filter((service) => service.bookable);
}


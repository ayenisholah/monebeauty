import type { MetadataRoute } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";
import { prisma } from "@/lib/db";
import {
  PUBLIC_PATHS,
  articlePath,
  contentPagePath,
  productPath,
} from "@/lib/public-routes";

const SITE = siteUrl();
const ALWAYS = [
  PUBLIC_PATHS.home,
  PUBLIC_PATHS.booking,
  PUBLIC_PATHS.pricing,
  PUBLIC_PATHS.articles,
  PUBLIC_PATHS.privacy,
  PUBLIC_PATHS.terms,
  PUBLIC_PATHS.cookies,
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, services, technologies, products, articles] = await Promise.all(
    [
      prisma.contentPage.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, locale: true, updatedAt: true },
      }),
      prisma.treatmentContent.findMany({
        where: {
          status: "PUBLISHED",
          service: { archivedAt: null, publicPath: { not: null } },
        },
        select: {
          locale: true,
          updatedAt: true,
          service: { select: { publicPath: true } },
        },
      }),
      prisma.technologyContent.findMany({
        where: { status: "PUBLISHED", technology: { archivedAt: null } },
        select: {
          locale: true,
          updatedAt: true,
          technology: { select: { publicPath: true } },
        },
      }),
      prisma.productContent.findMany({
        where: {
          status: "PUBLISHED",
          product: { archivedAt: null, published: true },
        },
        select: {
          locale: true,
          updatedAt: true,
          product: { select: { slug: true } },
        },
      }),
      prisma.articleContent.findMany({
        where: { status: "PUBLISHED", article: { archivedAt: null } },
        select: {
          locale: true,
          updatedAt: true,
          article: { select: { slug: true } },
        },
      }),
    ],
  );
  const entries: Array<{ path: string; locale: Locale; updatedAt: Date }> = [];
  const now = new Date();
  for (const locale of routing.locales)
    for (const path of ALWAYS) entries.push({ path, locale, updatedAt: now });
  for (const row of pages)
    entries.push({
      path: contentPagePath(row.slug),
      locale: row.locale,
      updatedAt: row.updatedAt,
    });
  for (const row of services)
    if (row.service.publicPath)
      entries.push({
        path: row.service.publicPath,
        locale: row.locale,
        updatedAt: row.updatedAt,
      });
  for (const row of technologies)
    entries.push({
      path: row.technology.publicPath,
      locale: row.locale,
      updatedAt: row.updatedAt,
    });
  for (const row of products)
    entries.push({
      path: productPath(row.product.slug),
      locale: row.locale,
      updatedAt: row.updatedAt,
    });
  for (const row of articles)
    entries.push({
      path: articlePath(row.article.slug),
      locale: row.locale,
      updatedAt: row.updatedAt,
    });
  const unique = new Map(
    entries.map((entry) => [`${entry.locale}:${entry.path}`, entry]),
  );
  const all = [...unique.values()];
  return all.map((entry) => {
    const available = all
      .filter((candidate) => candidate.path === entry.path)
      .map((candidate) => candidate.locale);
    return {
      url: absoluteLocalizedUrl(SITE, entry.path, entry.locale),
      lastModified: entry.updatedAt,
      alternates: {
        languages: Object.fromEntries([
          ...available.map((locale) => [
            locale,
            absoluteLocalizedUrl(SITE, entry.path, locale),
          ]),
          ...(available.includes("fi")
            ? [["x-default", absoluteLocalizedUrl(SITE, entry.path, "fi")]]
            : []),
        ]),
      },
    };
  });
}

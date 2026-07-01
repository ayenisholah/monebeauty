import type { Locale } from "@/i18n/routing";
import pagesData from "./generated/pages.json";

export interface PageContent {
  title: string;
  hero: string | null;
  body: string;
}

type PagesMap = Record<string, Partial<Record<Locale, PageContent>>>;

const pages = pagesData as PagesMap;

/** All content-page slugs (e.g. "about", "instrumental/endosphere", "services/face"). */
export const CONTENT_PAGE_SLUGS = Object.keys(pages);

export function getPageContent(
  slug: string,
  locale: Locale,
): PageContent | undefined {
  return pages[slug]?.[locale];
}

/** Slugs under a given group prefix, without the prefix (e.g. group "services"). */
export function childSlugs(group: string): string[] {
  const prefix = `${group}/`;
  return CONTENT_PAGE_SLUGS.filter((s) => s.startsWith(prefix)).map((s) =>
    s.slice(prefix.length),
  );
}

import type { AppLocale } from "./treatments";
export type { AppLocale } from "./treatments";

export interface ArticleContent {
  title: string;
  excerpt?: string;
  body: string;
}

export interface Article {
  slug: string;
  date: string; // ISO
  content: Record<AppLocale, ArticleContent>;
}

/**
 * Blog is CMS-driven from Phase 5; until the clinic provides content this is
 * intentionally empty and the index shows a friendly empty state.
 * [CLINIC TO PROVIDE]
 */
export const ARTICLES: Article[] = [];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

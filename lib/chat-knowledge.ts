import "server-only";

import { prisma } from "@/lib/db";
import { CONTACT } from "@/content/site";
import type { Locale } from "@/i18n/routing";

export type KnowledgeSnippet = {
  title: string;
  body: string;
  url?: string;
};

export type KnowledgeResult = {
  snippets: KnowledgeSnippet[];
  matched: boolean;
};

const MAX_BODY = 900;
const MAX_SNIPPETS = 8;
const QUERY_STOP_TERMS = new Set([
  "about",
  "can",
  "could",
  "does",
  "have",
  "hello",
  "help",
  "offer",
  "perform",
  "please",
  "provide",
  "tell",
  "that",
  "the",
  "what",
  "with",
  "you",
  "että",
  "hei",
  "mitä",
  "onko",
  "teillä",
  "voiko",
  "для",
  "есть",
  "как",
  "ли",
  "можно",
  "предлагаете",
  "привет",
  "расскажите",
  "что",
  "это",
]);

function cleanText(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]*\)/g, " ")
    .replace(/[#*_>`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function terms(value: string) {
  return cleanText(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 2 && !QUERY_STOP_TERMS.has(term));
}

function scoreSnippet(queryTerms: string[], snippet: KnowledgeSnippet) {
  const haystack = `${snippet.title} ${snippet.body}`.toLowerCase();
  return queryTerms.reduce(
    (score, term) => score + (haystack.includes(term) ? 1 : 0),
    0,
  );
}

function publicPath(slug: string) {
  if (slug === "home") return "/";
  return `/${slug}`;
}

async function pageSnippets(locale: Locale): Promise<KnowledgeSnippet[]> {
    const rows = await prisma.contentPage.findMany({
      where: { locale, status: "PUBLISHED" },
      select: { slug: true, title: true, body: true },
      orderBy: { slug: "asc" },
    });
    return rows.map((row) => ({
        title: row.title,
        body: cleanText(row.body).slice(0, MAX_BODY),
        url: publicPath(row.slug),
      }));
}

async function productSnippets(locale: Locale): Promise<KnowledgeSnippet[]> {
    const rows = await prisma.product.findMany({
      where: { published: true, archivedAt: null, contents: { some: { locale, status: "PUBLISHED" } } },
      include: { contents: { where: { locale, status: "PUBLISHED" } } },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      take: 40,
    });
      const snippets: KnowledgeSnippet[] = [];
      for (const row of rows) {
        const content = row.contents[0];
        if (!content) continue;
        snippets.push({
          title: content.name,
          body: cleanText(
            `${content.description} Price: ${Number(row.price).toFixed(2)} ${row.currency}. Size: ${row.size ?? ""}`,
          ).slice(0, MAX_BODY),
          url: `/catalog/${row.slug}`,
        });
      }
      return snippets;
}

async function articleSnippets(locale: Locale): Promise<KnowledgeSnippet[]> {
    const rows = await prisma.articleContent.findMany({
      where: { locale, status: "PUBLISHED", article: { published: true, archivedAt: null } },
      include: { article: { select: { slug: true } } },
      take: 20,
    });
    return rows.map((row) => ({
      title: row.title,
      body: cleanText(`${row.excerpt ?? ""} ${row.body}`).slice(0, MAX_BODY),
      url: `/blog/${row.article.slug}`,
    }));
}

async function serviceSnippets(locale: Locale): Promise<KnowledgeSnippet[]> {
  const services = await prisma.service.findMany({
    where: { bookable: true, archivedAt: null, contents: { some: { locale, status: "PUBLISHED" } } },
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });
  return services.map((service) => ({
    title: service.contents[0].h1,
    body: cleanText(`${service.contents[0].shortDesc} ${service.contents[0].whatItIs} Duration: ${service.durationMin} minutes.`).slice(0, MAX_BODY),
    url: `/booking?service=${service.slug}`,
  }));
}

function contactSnippet(): KnowledgeSnippet {
  return {
    title: "Mone Beauty Clinic contact",
    body: `Address: ${CONTACT.address.street}, ${CONTACT.address.postalCode} ${CONTACT.address.city}, ${CONTACT.address.country}. Phone: ${CONTACT.phone}. Email: ${CONTACT.email}. Opening hours: by appointment.`,
    url: "/about",
  };
}

export async function retrieveKnowledge(locale: Locale, query: string) {
  const all = [
    contactSnippet(),
    ...(await serviceSnippets(locale)),
    ...(await pageSnippets(locale)),
    ...(await productSnippets(locale)),
    ...(await articleSnippets(locale)),
  ];
  const queryTerms = terms(query);
  if (queryTerms.length === 0) {
    return { snippets: all.slice(0, MAX_SNIPPETS), matched: false };
  }

  const ranked = all
    .map((snippet) => ({ snippet, score: scoreSnippet(queryTerms, snippet) }))
    .sort((a, b) => b.score - a.score);
  const matching = ranked.filter((item) => item.score > 0);
  return {
    snippets: (matching.length > 0 ? matching : ranked)
      .slice(0, MAX_SNIPPETS)
      .map((item) => item.snippet),
    matched: matching.length > 0,
  };
}

export async function detectBookingService(locale: Locale, message: string) {
  const text = cleanText(message).toLowerCase();
  const services = await prisma.service.findMany({
    where: { bookable: true, archivedAt: null, contents: { some: { locale, status: "PUBLISHED" } } },
    include: { contents: { where: { locale, status: "PUBLISHED" }, take: 1 } },
  });
  return services.find((service) => {
    const title = service.contents[0]?.h1.toLowerCase() ?? "";
    return (
      text.includes(service.slug.toLowerCase()) ||
      Boolean(title && text.includes(title))
    );
  });
}

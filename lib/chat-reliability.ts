import type { Locale } from "@/i18n/routing";
import type { KnowledgeResult, KnowledgeSnippet } from "@/lib/chat-knowledge";

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_SOURCE_LINKS = 3;
const MAX_FALLBACK_SNIPPETS = 2;
const MAX_FALLBACK_EXCERPT = 360;

export type ChatSource = {
  title: string;
  href: string;
};

export type ClaudeRuntimeConfig = {
  apiKey: string;
  configured: boolean;
  maxRetries: 1;
  model: string;
  timeoutMs: number;
};

export type ReliableChatResult = {
  answer: string;
  degraded: boolean;
  sources: ChatSource[];
};

function boundedTimeout(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(30_000, Math.max(1_000, Math.round(parsed)));
}

export function claudeRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): ClaudeRuntimeConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() ?? "";
  return {
    apiKey,
    configured: apiKey.length > 0,
    maxRetries: 1,
    model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: boundedTimeout(env.ANTHROPIC_TIMEOUT_MS),
  };
}

function excerpt(snippet: KnowledgeSnippet) {
  const body = snippet.body.trim();
  return body.length > MAX_FALLBACK_EXCERPT
    ? `${body.slice(0, MAX_FALLBACK_EXCERPT).trimEnd()}…`
    : body;
}

function unmatchedFallback(locale: Locale) {
  if (locale === "fi") {
    return "Voin auttaa Mone Beauty Clinicin hoitoihin, tuotteisiin, ajanvaraukseen ja klinikan yhteystietoihin liittyvissä kysymyksissä. Voit myös varata ajan, ottaa yhteyttä klinikkaan tai pyytää yhteydenottoa henkilökunnalta.";
  }
  if (locale === "ru") {
    return "Я могу помочь с вопросами о процедурах и продуктах Mone Beauty Clinic, записи и контактных данных клиники. Вы также можете записаться онлайн, связаться с клиникой или попросить сотрудника ответить вам.";
  }
  return "I can help with Mone Beauty Clinic treatments, products, booking, and clinic details. You can also book online, contact the clinic, or ask a staff member to follow up.";
}

function fallbackIntroduction(locale: Locale) {
  if (locale === "fi") return "Klinikan hyväksytyn sisällön perusteella:";
  if (locale === "ru") return "По утверждённым материалам клиники:";
  return "Based on approved clinic content:";
}

export function groundedFallback(locale: Locale, knowledge: KnowledgeResult) {
  if (!knowledge.matched) return unmatchedFallback(locale);

  const excerpts = knowledge.snippets
    .filter((snippet) => snippet.body.trim().length > 0)
    .slice(0, MAX_FALLBACK_SNIPPETS)
    .map((snippet) => `${snippet.title}: ${excerpt(snippet)}`);

  if (excerpts.length === 0) return unmatchedFallback(locale);
  return `${fallbackIntroduction(locale)}\n\n${excerpts.join("\n\n")}`;
}

export function sourceLinks(
  snippets: KnowledgeSnippet[],
  limit = MAX_SOURCE_LINKS,
): ChatSource[] {
  const seen = new Set<string>();
  const links: ChatSource[] = [];
  for (const snippet of snippets) {
    const href = snippet.url?.trim();
    if (!href?.startsWith("/") || href.startsWith("//") || seen.has(href)) {
      continue;
    }
    seen.add(href);
    links.push({ title: snippet.title, href });
    if (links.length >= limit) break;
  }
  return links;
}

export async function answerReliably({
  locale,
  knowledge,
  configured,
  complete,
}: {
  locale: Locale;
  knowledge: KnowledgeResult;
  configured: boolean;
  complete: () => Promise<string>;
}): Promise<ReliableChatResult> {
  const sources = sourceLinks(knowledge.snippets);
  if (configured) {
    try {
      const answer = (await complete()).trim();
      if (answer) return { answer, degraded: false, sources };
    } catch {
      // Provider failures degrade to deterministic approved content below.
    }
  }

  return {
    answer: groundedFallback(locale, knowledge),
    degraded: true,
    sources: knowledge.matched ? sources : [],
  };
}

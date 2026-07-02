import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { Locale } from "@/i18n/routing";
import type { KnowledgeSnippet } from "@/lib/chat-knowledge";

const DEFAULT_MODEL = "claude-sonnet-5";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function hasClaudeConfig() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function localeName(locale: Locale) {
  return locale === "fi" ? "Finnish" : locale === "ru" ? "Russian" : "English";
}

export function groundedSystemPrompt(locale: Locale, snippets: KnowledgeSnippet[]) {
  return [
    `You are the website assistant for Mone Beauty Clinic in Helsinki. Answer in ${localeName(locale)}.`,
    "Use only the approved context below. Do not invent medical claims, prices, policies, contraindications, or treatment outcomes.",
    "You are not a clinician. Do not diagnose, triage emergencies, or give personalized medical advice.",
    "If the answer is not in the context, say the clinic should confirm it and offer booking, phone, email, or human handoff.",
    "Keep answers concise and practical. Mention booking only when relevant.",
    "",
    "Approved context:",
    snippets
      .map((snippet, index) => {
        const url = snippet.url ? ` (${snippet.url})` : "";
        return `${index + 1}. ${snippet.title}${url}: ${snippet.body}`;
      })
      .join("\n\n"),
  ].join("\n");
}

export async function completeChat({
  locale,
  snippets,
  messages,
}: {
  locale: Locale;
  snippets: KnowledgeSnippet[];
  messages: ChatMessage[];
}) {
  const response = await client().messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 700,
    temperature: 0.2,
    system: groundedSystemPrompt(locale, snippets),
    messages,
  });

  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

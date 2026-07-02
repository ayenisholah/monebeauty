import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { completeChat, hasClaudeConfig, type ChatMessage } from "@/lib/ai";
import { CONTACT } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";
import { detectBookingService, retrieveKnowledge } from "@/lib/chat-knowledge";

const MAX_MESSAGE = 1200;
const MAX_HISTORY = 12;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function fallback(locale: Locale) {
  if (locale === "fi") {
    return `Chat ei ole juuri nyt käytettävissä. Voit varata ajan tai ottaa yhteyttä: ${CONTACT.phone}, ${CONTACT.email}.`;
  }
  if (locale === "ru") {
    return `Чат сейчас недоступен. Вы можете записаться или связаться с клиникой: ${CONTACT.phone}, ${CONTACT.email}.`;
  }
  return `Chat is temporarily unavailable. You can book online or contact the clinic: ${CONTACT.phone}, ${CONTACT.email}.`;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = (item as { role?: unknown }).role;
      const content = String((item as { content?: unknown }).content ?? "")
        .trim()
        .slice(0, MAX_MESSAGE);
      if ((role !== "user" && role !== "assistant") || !content) return null;
      return { role, content };
    })
    .filter((item): item is ChatMessage => Boolean(item))
    .slice(-MAX_HISTORY);
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const locale = routing.locales.includes(payload.locale as Locale)
    ? (payload.locale as Locale)
    : routing.defaultLocale;
  const message = String(payload.message ?? "").trim().slice(0, MAX_MESSAGE);
  const consentGdpr = payload.consentGdpr === true;
  const history = normalizeMessages(payload.history);
  const sessionId = String(payload.sessionId ?? "").trim();
  if (!message) return bad("message_required");

  const snippets = await retrieveKnowledge(locale, message);
  const service = detectBookingService(locale, message);

  let answer: string;
  let degraded = false;
  if (!hasClaudeConfig()) {
    answer = fallback(locale);
    degraded = true;
  } else {
    try {
      answer = await completeChat({
        locale,
        snippets,
        messages: [...history, { role: "user", content: message }],
      });
    } catch {
      answer = fallback(locale);
      degraded = true;
    }
  }

  let savedSessionId = sessionId || null;
  const nextMessages = [
    ...history,
    { role: "user" as const, content: message },
    { role: "assistant" as const, content: answer },
  ].slice(-MAX_HISTORY);

  if (consentGdpr) {
    try {
      const existing = savedSessionId
        ? await prisma.chatSession.findUnique({ where: { id: savedSessionId } })
        : null;
      const saved = existing
        ? await prisma.chatSession.update({
            where: { id: existing.id },
            data: { locale, messages: nextMessages },
            select: { id: true },
          })
        : await prisma.chatSession.create({
            data: { locale, messages: nextMessages },
            select: { id: true },
          });
      savedSessionId = saved.id;
    } catch {
      // The answer should still be delivered even if transcript persistence fails.
    }
  }

  return NextResponse.json({
    answer,
    sessionId: savedSessionId,
    degraded,
    booking: service
      ? { serviceKey: service.key, href: `/booking?service=${service.key}` }
      : null,
  });
}

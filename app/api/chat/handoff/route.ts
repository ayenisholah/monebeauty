import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { routing, type Locale } from "@/i18n/routing";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const consentGdpr = payload.consentGdpr === true;
  if (!consentGdpr) return bad("consent_required");

  const sessionId = String(payload.sessionId ?? "").trim();
  const message = String(payload.message ?? "").trim().slice(0, 1200);
  const locale = routing.locales.includes(payload.locale as Locale)
    ? (payload.locale as Locale)
    : routing.defaultLocale;
  const contactName = String(payload.name ?? "").trim().slice(0, 160) || null;
  const contactEmail = String(payload.email ?? "").trim().slice(0, 200) || null;
  const contactPhone = String(payload.phone ?? "").trim().slice(0, 80) || null;

  if (!sessionId && !message) return bad("message_required");

  try {
    const existing = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;
    const baseMessages = Array.isArray(existing?.messages)
      ? (existing.messages as unknown[])
      : [];
    const messages = (message
      ? [...baseMessages, { role: "user", content: message, handoff: true }]
      : baseMessages) as Prisma.InputJsonValue;

    const saved = existing
      ? await prisma.chatSession.update({
          where: { id: existing.id },
          data: {
            handoffRequested: true,
            status: "OPEN",
            contactName,
            contactEmail,
            contactPhone,
            messages,
          },
          select: { id: true },
        })
      : await prisma.chatSession.create({
          data: {
            locale,
            messages,
            handoffRequested: true,
            status: "OPEN",
            contactName,
            contactEmail,
            contactPhone,
          },
          select: { id: true },
        });

    return NextResponse.json({ id: saved.id });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

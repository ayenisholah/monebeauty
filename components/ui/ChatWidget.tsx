"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  ChatCircleDots,
  EnvelopeSimple,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ChatWidget() {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ serviceKey: string; href: string } | null>(
    null,
  );
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffSent, setHandoffSent] = useState(false);
  const [handoff, setHandoff] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const panelTitle = useMemo(() => t("title"), [t]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setBooking(null);
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          locale,
          message: text,
          history: messages,
          consentGdpr: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("chat_failed");
      setMessages([
        ...nextMessages,
        { role: "assistant", content: String(data.answer ?? "") },
      ]);
      setSessionId(data.sessionId ?? sessionId);
      setBooking(data.booking ?? null);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function sendHandoff() {
    setError(null);
    try {
      const res = await fetch("/api/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          locale,
          ...handoff,
          consentGdpr: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("handoff_failed");
      setSessionId(data.id ?? sessionId);
      setHandoffSent(true);
      setHandoffOpen(false);
    } catch {
      setError(t("handoffError"));
    }
  }

  return (
    <div className="fixed right-[14px] bottom-[14px] z-[60] flex max-w-[calc(100vw-28px)] flex-col items-end gap-[12px] sm:right-[22px] sm:bottom-[22px]">
      {open ? (
        <section className="flex h-[min(680px,calc(100vh-100px))] w-[min(390px,calc(100vw-28px))] flex-col overflow-hidden rounded-[14px] border border-line-card bg-page shadow-[var(--shadow-bubble)]">
          <header className="flex items-center justify-between gap-[12px] border-b border-line-hair bg-card px-[16px] py-[13px]">
            <div>
              <div className="font-display text-[20px] font-semibold text-ink">
                {panelTitle}
              </div>
              <p className="font-sans text-[12px] text-muted">{t("subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="grid h-[38px] w-[38px] place-items-center rounded-full border border-line-btn text-ink"
            >
              <X size={18} weight="thin" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-[14px] py-[14px]">
            {messages.length === 0 ? (
              <div className="rounded-[8px] border border-line-card bg-card p-[14px] font-sans text-[13px] leading-[1.6] text-body">
                {t("welcome")}
              </div>
            ) : null}
            <div className="grid gap-[10px]">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "max-w-[88%] rounded-[10px] px-[12px] py-[10px] font-sans text-[13px] leading-[1.55]",
                    message.role === "user"
                      ? "ml-auto bg-accent text-page"
                      : "mr-auto border border-line-card bg-card text-body",
                  )}
                >
                  {message.content}
                </div>
              ))}
              {loading ? (
                <div className="mr-auto rounded-[10px] border border-line-card bg-card px-[12px] py-[10px] font-sans text-[13px] text-muted">
                  {t("thinking")}
                </div>
              ) : null}
            </div>
            {booking ? (
              <Link
                href={{ pathname: "/booking", query: { service: booking.serviceKey } }}
                className="mt-[12px] inline-flex min-h-[42px] items-center gap-[8px] rounded-[4px] bg-accent px-[14px] font-sans text-[11px] tracking-[.12em] text-page uppercase"
              >
                {t("book")} <ArrowRight size={14} weight="thin" />
              </Link>
            ) : null}
            {handoffSent ? (
              <p className="mt-[12px] rounded-[4px] border border-line-btn bg-btn-fill px-[12px] py-[9px] font-sans text-[13px] text-ink">
                {t("handoffSent")}
              </p>
            ) : null}
            {error ? (
              <p className="mt-[12px] rounded-[4px] border border-line-btn bg-btn-fill px-[12px] py-[9px] font-sans text-[13px] text-ink">
                {error}
              </p>
            ) : null}
          </div>

          {handoffOpen ? (
            <div className="border-t border-line-hair bg-card px-[14px] py-[12px]">
              <div className="grid gap-[8px]">
                <input
                  value={handoff.name}
                  onChange={(e) => setHandoff({ ...handoff, name: e.target.value })}
                  placeholder={t("fields.name")}
                  className={inputCls}
                />
                <input
                  value={handoff.email}
                  onChange={(e) => setHandoff({ ...handoff, email: e.target.value })}
                  placeholder={t("fields.email")}
                  className={inputCls}
                />
                <input
                  value={handoff.phone}
                  onChange={(e) => setHandoff({ ...handoff, phone: e.target.value })}
                  placeholder={t("fields.phone")}
                  className={inputCls}
                />
                <textarea
                  value={handoff.message}
                  onChange={(e) =>
                    setHandoff({ ...handoff, message: e.target.value })
                  }
                  placeholder={t("fields.message")}
                  rows={2}
                  className={inputCls}
                />
              </div>
              <div className="mt-[10px] flex gap-[8px]">
                <button
                  type="button"
                  onClick={() => void sendHandoff()}
                  disabled={!consent}
                  className="min-h-[40px] flex-1 rounded-[4px] bg-accent px-[12px] font-sans text-[11px] tracking-[.12em] text-page uppercase disabled:opacity-50"
                >
                  {t("sendHandoff")}
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffOpen(false)}
                  className="min-h-[40px] rounded-[4px] border border-line-btn px-[12px] font-sans text-[11px] tracking-[.12em] text-ink uppercase"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <footer className="border-t border-line-hair bg-card px-[14px] py-[12px]">
              <label className="mb-[10px] flex items-start gap-[8px] font-sans text-[12px] leading-[1.45] text-body">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-[2px] h-[16px] w-[16px] accent-[var(--accent)]"
                />
                <span>{t("consent")}</span>
              </label>
              <div className="flex gap-[8px]">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={t("placeholder")}
                  className="min-h-[44px] flex-1 rounded-[4px] border border-line-btn bg-page px-[12px] font-sans text-[13px] text-ink outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label={t("send")}
                  className="grid h-[44px] w-[44px] place-items-center rounded-[4px] bg-accent text-page disabled:opacity-50"
                >
                  <PaperPlaneTilt size={18} weight="thin" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setHandoffOpen(true)}
                className="mt-[10px] inline-flex min-h-[36px] items-center gap-[7px] font-sans text-[12px] text-accent"
              >
                <EnvelopeSimple size={15} weight="thin" />
                {t("handoff")}
              </button>
            </footer>
          )}
        </section>
      ) : (
        <div className="hidden rounded-[14px] bg-page px-[16px] py-[12px] shadow-[var(--shadow-bubble)] sm:block">
          <div className="font-sans text-[12px] font-medium text-ink">
            {t("title")}
          </div>
          <div className="font-sans text-[12px] font-light text-muted">
            {t("subtitle")}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("open")}
        className="grid h-[58px] w-[58px] place-items-center rounded-full bg-accent text-page shadow-[var(--shadow-fab)]"
        style={
          open
            ? undefined
            : { animation: "monePulse 3.2s ease-in-out infinite" }
        }
      >
        {open ? (
          <X size={24} weight="thin" />
        ) : (
          <ChatCircleDots size={26} weight="thin" />
        )}
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[10px] py-[9px] font-sans text-[13px] text-ink outline-none focus:border-accent";

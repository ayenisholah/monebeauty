"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChatCircleDots, X } from "@phosphor-icons/react";

/**
 * Chat FAB shell (design per 03-homepage-spec.md §8). The actual AI chatbot is
 * wired in Phase 7; for now the panel shows a friendly placeholder.
 */
export function ChatWidget() {
  const t = useTranslations("Chat");
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-[22px] bottom-[22px] z-[60] flex flex-col items-end gap-[12px]">
      {open ? (
        <div className="w-[260px] rounded-[14px] bg-page p-[18px] shadow-[var(--shadow-bubble)]">
          <div className="mb-[6px] font-display text-[18px] font-semibold text-ink">
            {t("title")}
          </div>
          <p className="font-sans text-[13px] leading-[1.6] font-light text-muted">
            {t("subtitle")}
          </p>
        </div>
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

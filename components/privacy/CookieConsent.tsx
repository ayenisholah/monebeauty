"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "monebeauty.cookie-consent.v1";
export const COOKIE_CONSENT_EVENT = "monebeauty-cookie-consent";

type ConsentValue = "accepted" | "declined";

export function readCookieConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "accepted" || value === "declined" ? value : null;
}

function writeCookieConsent(value: ConsentValue) {
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}

export function CookieConsent() {
  const t = useTranslations("CookieConsent");
  const [visible, setVisible] = useState(() => readCookieConsent() === null);

  function choose(value: ConsentValue) {
    writeCookieConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-label={t("title")}
      className="fixed right-[14px] bottom-[90px] left-[14px] z-[70] mx-auto max-w-[760px] rounded-[var(--radius)] border border-line-card bg-page p-[18px] shadow-[var(--shadow-bubble)] sm:right-[22px] sm:left-auto sm:w-[420px]"
    >
      <h2 className="font-display text-[22px] font-medium text-ink">
        {t("title")}
      </h2>
      <p className="mt-[8px] font-sans text-[13px] leading-[1.6] text-body">
        {t("body")}
      </p>
      <div className="mt-[14px] flex flex-wrap gap-[10px]">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="min-h-[42px] rounded-[4px] bg-accent px-[16px] font-sans text-[11px] font-medium tracking-[.14em] text-page uppercase"
        >
          {t("accept")}
        </button>
        <button
          type="button"
          onClick={() => choose("declined")}
          className="min-h-[42px] rounded-[4px] border border-line-btn px-[16px] font-sans text-[11px] font-medium tracking-[.14em] text-ink uppercase"
        >
          {t("decline")}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { CaretDown } from "@phosphor-icons/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const LABELS: Record<string, string> = { en: "EN", fi: "FI", ru: "RU" };

export function LanguageSwitcher({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(next: string) {
    setOpen(false);
    if (next !== locale) {
      const query = Object.fromEntries(searchParams.entries());
      router.replace(
        query && Object.keys(query).length > 0 ? { pathname, query } : pathname,
        { locale: next },
      );
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-[5px] px-[2px] py-[6px] font-sans text-[12px] font-medium tracking-[.1em] uppercase transition-colors",
          tone === "dark"
            ? "text-footer-link hover:text-footer-logo"
            : "text-nav hover:text-accent",
        )}
      >
        {LABELS[locale]}
        <CaretDown
          size={13}
          weight="thin"
          className={
            open ? "rotate-180 transition-transform" : "transition-transform"
          }
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+8px)] right-0 z-[60] min-w-[88px] overflow-hidden rounded-[6px] border border-line-header bg-page py-[4px] shadow-[var(--shadow-scroll)]"
        >
          {routing.locales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                onClick={() => choose(l)}
                className={cn(
                  "block w-full px-[16px] py-[8px] text-left font-sans text-[12px] tracking-[.1em] uppercase transition-colors hover:bg-alt",
                  l === locale ? "text-accent" : "text-nav",
                )}
              >
                {LABELS[l]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

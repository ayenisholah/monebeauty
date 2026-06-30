"use client";

import { useState, useEffect } from "react";
import { List, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

type NavLink = { label: string; href: string };

export function MobileMenu({
  links,
  bookOnline,
  openLabel,
}: {
  links: NavLink[];
  bookOnline: string;
  openLabel: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock scroll while the panel is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex items-center gap-[14px]">
      <LanguageSwitcher />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={openLabel}
        aria-expanded={open}
        className="grid h-[42px] w-[42px] place-items-center rounded-[6px] border border-[#E2D7C6] bg-[rgba(255,255,255,.5)] text-ink"
      >
        {open ? (
          <X size={22} weight="thin" />
        ) : (
          <List size={22} weight="thin" />
        )}
      </button>

      {open ? (
        <div className="absolute top-full right-0 left-0 border-t border-line-header bg-page px-[clamp(20px,5vw,56px)] pt-[14px] pb-[24px]">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line-mobile px-[4px] py-[13px] font-sans text-[14px] tracking-[.08em] text-ink uppercase"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/booking"
              onClick={() => setOpen(false)}
              className="mt-[14px] rounded-[4px] bg-accent px-[15px] py-[15px] text-center font-sans text-[12px] tracking-[.16em] text-page uppercase"
            >
              {bookOnline}
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

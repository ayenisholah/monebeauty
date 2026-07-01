"use client";

import { useState, useEffect } from "react";
import { List, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

type Item = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

export function MobileMenu({
  tree,
  bookTime,
  openLabel,
}: {
  tree: Item[];
  bookTime: string;
  openLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="flex items-center gap-[12px]">
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
        <div className="absolute top-full right-0 left-0 max-h-[80vh] overflow-y-auto border-t border-line-header bg-page px-[clamp(20px,5vw,56px)] pt-[10px] pb-[24px]">
          <nav className="flex flex-col">
            {tree.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="border-b border-line-mobile py-[10px]"
                >
                  <div className="px-[4px] py-[6px] font-sans text-[12px] tracking-[.14em] text-muted uppercase">
                    {item.label}
                  </div>
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={close}
                      className="block px-[14px] py-[9px] font-sans text-[14px] text-ink"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={close}
                  className="border-b border-line-mobile px-[4px] py-[13px] font-sans text-[14px] tracking-[.08em] text-ink uppercase"
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              href="/booking"
              onClick={close}
              className="mt-[14px] rounded-[4px] bg-accent px-[15px] py-[15px] text-center font-sans text-[12px] tracking-[.16em] text-page uppercase"
            >
              {bookTime}
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

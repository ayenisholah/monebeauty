"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";

export function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string }[];
}) {
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

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[5px] font-sans text-[12px] tracking-[.13em] text-nav uppercase transition-colors hover:text-accent"
      >
        {label}
        <CaretDown size={12} weight="thin" />
      </button>
      {open ? (
        <ul className="absolute top-full left-0 z-[60] min-w-[240px] rounded-[8px] border border-line-header bg-page py-[8px] shadow-[var(--shadow-card)]">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={() => setOpen(false)}
                className="block px-[18px] py-[10px] font-sans text-[13px] text-nav transition-colors hover:bg-alt hover:text-accent"
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

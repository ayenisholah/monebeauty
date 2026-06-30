"use client";

import { useState } from "react";
import { Plus, Minus } from "@phosphor-icons/react";

export function FaqAccordion({
  items,
}: {
  items: Array<{ q: string; a: string }>;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line-card border-y border-line-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-[16px] py-[18px] text-left"
            >
              <span className="font-display text-[19px] font-medium text-ink">
                {item.q}
              </span>
              {isOpen ? (
                <Minus
                  size={18}
                  weight="thin"
                  className="shrink-0 text-accent"
                />
              ) : (
                <Plus
                  size={18}
                  weight="thin"
                  className="shrink-0 text-accent"
                />
              )}
            </button>
            {isOpen ? (
              <p className="pb-[20px] font-sans text-[14.5px] leading-[1.75] font-light text-body">
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

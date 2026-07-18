"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import { BUSINESS_HOURS } from "@/lib/booking-config";
import { cn } from "@/lib/cn";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Month-grid date picker (Monday-first). Disables past, out-of-range, and closed days. */
export function BookingCalendar({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (value: string) => void;
}) {
  const locale = useLocale();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + BUSINESS_HOURS.daysAhead);

  const [view, setView] = useState(() => startOfMonth(today));
  const year = view.getFullYear();
  const month = view.getMonth();

  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // Monday-first weekday labels (2024-01-01 is a Monday).
  const weekLabels = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(2024, 0, 1 + i)),
  );

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const canPrev = startOfMonth(view) > startOfMonth(today);
  const canNext = new Date(year, month + 1, 1) <= maxDate;

  function isDisabled(d: Date) {
    return (
      d < today || d > maxDate || !BUSINESS_HOURS.openDays.includes(d.getDay())
    );
  }

  const navBtn =
    "grid h-[36px] w-[36px] place-items-center rounded-[6px] text-ink transition-colors hover:bg-btn-fill disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="w-full rounded-[var(--radius)] border border-line-card bg-card p-[16px] md:w-[340px]">
      <div className="mb-[12px] flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setView(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className={navBtn}
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <span className="font-display text-[18px] font-medium text-ink capitalize">
          {monthFmt.format(view)}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setView(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className={navBtn}
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[2px]">
        {weekLabels.map((w, i) => (
          <div
            key={i}
            className="grid h-[30px] place-items-center font-sans text-meta tracking-[.02em] text-muted uppercase"
          >
            {w.slice(0, 2)}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} aria-hidden />;
          const val = ymd(d);
          const disabled = isDisabled(d);
          const selected = value === val;
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onSelect(val)}
              className={cn(
                "grid aspect-square min-h-[40px] place-items-center rounded-[6px] font-sans text-[14px] transition-colors",
                selected
                  ? "bg-accent text-page"
                  : disabled
                    ? "cursor-not-allowed text-muted/35"
                    : "text-ink hover:bg-btn-fill",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { BUSINESS_HOURS } from "@/lib/booking-config";
import { clinicTodayYmd, ymd } from "@/lib/clinic-date";
import { cn } from "@/lib/cn";

function parseYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function CalendarGrid({
  locale,
  value,
  onSelect,
  min,
  max,
  disableClosedDays = true,
  availableDates,
  onMonthChange,
}: {
  locale: string;
  value?: string;
  onSelect: (value: string) => void;
  min?: string;
  max?: string;
  disableClosedDays?: boolean;
  availableDates?: readonly string[];
  onMonthChange?: (from: string, to: string) => void;
}) {
  const selected = value ? parseYmd(value) : null;
  const minimum = min ? parseYmd(min) : null;
  const maximum = max ? parseYmd(max) : null;
  const [view, setView] = useState(() =>
    monthStart(selected ?? minimum ?? parseYmd(clinicTodayYmd()) ?? new Date()),
  );
  const year = view.getFullYear();
  const month = view.getMonth();
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  });
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter.format(new Date(2024, 0, 1 + index)),
  );
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from(
      { length: days },
      (_, index) => new Date(year, month, index + 1),
    ),
  ];
  const previousMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const canPrevious = !minimum || previousMonth >= monthStart(minimum);
  const canNext = !maximum || nextMonth <= monthStart(maximum);
  const available = availableDates ? new Set(availableDates) : null;

  useEffect(() => {
    if (!onMonthChange) return;
    const from = ymd(new Date(year, month, 1));
    const to = ymd(new Date(year, month + 1, 0));
    onMonthChange(from, to);
  }, [month, onMonthChange, year]);

  return (
    <div className="w-[min(340px,calc(100vw-32px))] rounded-[var(--radius)] border border-line-card bg-card p-[16px]">
      <div className="mb-[12px] flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrevious}
          onClick={() => setView(previousMonth)}
          aria-label="Previous month"
          className="grid h-[40px] w-[40px] place-items-center rounded-[6px] text-ink hover:bg-btn-fill disabled:cursor-not-allowed disabled:opacity-30"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <span className="font-display text-[18px] font-medium text-ink capitalize">
          {monthFormatter.format(view)}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setView(nextMonth)}
          aria-label="Next month"
          className="grid h-[40px] w-[40px] place-items-center rounded-[6px] text-ink hover:bg-btn-fill disabled:cursor-not-allowed disabled:opacity-30"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
      <div role="grid" className="grid grid-cols-7 gap-[2px]">
        {weekdayLabels.map((label, index) => (
          <div
            key={index}
            role="columnheader"
            className="grid h-[30px] place-items-center font-sans text-meta tracking-[.02em] text-muted uppercase"
          >
            {label.slice(0, 2)}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} aria-hidden />;
          const dateValue = ymd(date);
          const disabled =
            Boolean(minimum && date < minimum) ||
            Boolean(maximum && date > maximum) ||
            (disableClosedDays &&
              !available &&
              !BUSINESS_HOURS.openDays.includes(date.getDay())) ||
            Boolean(available && !available.has(dateValue));
          const active = dateValue === value;
          return (
            <button
              key={dateValue}
              type="button"
              role="gridcell"
              aria-label={dayFormatter.format(date)}
              aria-selected={active}
              disabled={disabled}
              onClick={() => onSelect(dateValue)}
              className={cn(
                "grid aspect-square min-h-[40px] place-items-center rounded-[6px] font-sans text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                active
                  ? "bg-accent text-page"
                  : disabled
                    ? "cursor-not-allowed text-muted/35"
                    : "text-ink hover:bg-btn-fill",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  locale,
  name,
  value,
  defaultValue = "",
  onValueChange,
  id,
  ariaLabel,
  placeholder = "Select date",
  min,
  max,
  disableClosedDays = true,
  availableDates,
  onMonthChange,
  clearable = false,
  className,
}: {
  locale: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disableClosedDays?: boolean;
  availableDates?: readonly string[];
  onMonthChange?: (from: string, to: string) => void;
  clearable?: boolean;
  className?: string;
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value : internalValue;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = selectedValue ? parseYmd(selectedValue) : null;
  const label = selectedDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        selectedDate,
      )
    : placeholder;

  useEffect(() => {
    function close(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node))
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function select(next: string) {
    if (!controlled) setInternalValue(next);
    onValueChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <div className="flex min-h-[44px] items-stretch rounded-[4px] border border-line-btn bg-page focus-within:border-accent">
        <button
          id={id}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center justify-between gap-[10px] px-[12px] font-sans text-[15px] tracking-normal text-ink normal-case outline-none"
        >
          <span className={cn("truncate", !selectedDate && "text-muted")}>
            {label}
          </span>
          <CalendarBlank size={17} weight="thin" className="shrink-0" />
        </button>
        {clearable && selectedValue ? (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => select("")}
            className="grid w-[40px] place-items-center border-l border-line-hair text-muted hover:text-ink"
          >
            <X size={14} weight="thin" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[90] shadow-[var(--shadow-card)]">
          <CalendarGrid
            locale={locale}
            value={selectedValue}
            onSelect={select}
            min={min}
            max={max}
            disableClosedDays={disableClosedDays}
            availableDates={availableDates}
            onMonthChange={onMonthChange}
          />
        </div>
      ) : null}
    </div>
  );
}

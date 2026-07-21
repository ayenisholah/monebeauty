"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FloppyDisk } from "@phosphor-icons/react";
import {
  normalizeInternalPalette,
  truncateCalendarAlias,
  type InternalPalettePreference,
} from "@/lib/calendar-preferences";
import { INTERNAL_PALETTE_MAX_SELECTED } from "@/lib/internal-calendar-services";

type Template = {
  key: string;
  labels: { fi: string; en: string; ru: string };
  dragLabel: string;
  defaultEnabled: boolean;
};

const copy = {
  en: {
    title: "Select services for the drag-and-drop list",
    help: "Choose up to 24 services shown beside the calendar. Drag-and-drop names can be no longer than 14 characters.",
    service: "Service name",
    alias: "Drag & drop name",
    close: "Close",
    save: "Save changes",
  },
  fi: {
    title: "Valitse palvelut vedä ja pudota -listaan",
    help: "Valitse enintään 24 kalenterin vieressä näytettävää palvelua. Vedä ja pudota -nimi voi olla enintään 14 merkkiä.",
    service: "Palvelun nimi",
    alias: "Vedä ja pudota -nimi",
    close: "Sulje",
    save: "Tallenna muutokset",
  },
  ru: {
    title: "Выберите услуги для списка перетаскивания",
    help: "Выберите до 24 услуг рядом с календарём. Короткое название — не более 14 символов.",
    service: "Название услуги",
    alias: "Короткое название",
    close: "Закрыть",
    save: "Сохранить",
  },
} as const;

export function InternalServicePaletteEditor({
  locale,
  templates,
  value,
  onChange,
  onClose,
}: {
  locale: "en" | "fi" | "ru";
  templates: Template[];
  value: InternalPalettePreference[];
  onChange: (value: InternalPalettePreference[]) => void;
  onClose: () => void;
}) {
  const t = copy[locale];
  const catalog = templates.map((template) => ({
    key: template.key,
    dragLabel: template.dragLabel,
    defaultEnabled: template.defaultEnabled,
  }));
  const [draft, setDraft] = useState(() =>
    normalizeInternalPalette(value, catalog),
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedCount = draft.filter((item) => item.enabled).length;

  useEffect(() => {
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    setDraft((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-ink/40 p-[10px] sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="palette-editor-title"
        className="max-h-[94vh] w-full max-w-[940px] overflow-y-auto rounded-[8px] border border-line-card bg-card shadow-card"
      >
        <div className="flex items-center justify-between border-b border-line-hair px-[18px] py-[14px]">
          <h2
            id="palette-editor-title"
            className="font-sans text-[18px] font-medium text-ink"
          >
            {t.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="size-11 rounded border border-transparent text-xl hover:border-line-btn"
            aria-label={t.close}
          >
            ×
          </button>
        </div>
        <div className="p-[18px]">
          <p className="rounded-[5px] border border-[#d8e6e8] bg-[#eff7f8] px-[18px] py-[14px] font-sans text-[13px] text-body">
            {t.help} ({selectedCount}/{INTERNAL_PALETTE_MAX_SELECTED})
          </p>
          <div className="mt-[16px] overflow-x-auto rounded-[6px] border border-line-card">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[36px_minmax(240px,1fr)_190px_104px] items-center border-b border-line-card px-[10px] py-[11px] font-sans text-[12px] font-medium text-ink">
                <span />
                <span>{t.service}</span>
                <span>{t.alias}</span>
                <span />
              </div>
              {draft.map((item, index) => {
                const template = templates.find(
                  (entry) => entry.key === item.key,
                );
                return (
                  <div
                    key={item.key}
                    className="grid grid-cols-[36px_minmax(240px,1fr)_190px_104px] items-center border-b border-line-hair px-[10px] py-[9px] last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={
                        !item.enabled &&
                        selectedCount >= INTERNAL_PALETTE_MAX_SELECTED
                      }
                      onChange={(event) =>
                        setDraft((current) =>
                          current.map((entry) =>
                            entry.key === item.key
                              ? { ...entry, enabled: event.target.checked }
                              : entry,
                          ),
                        )
                      }
                      className="size-4 accent-accent"
                      aria-label={template?.labels.fi ?? item.key}
                    />
                    <span className="font-sans text-[13px] text-body">
                      {template?.labels.fi ?? item.key}
                    </span>
                    <input
                      value={item.alias}
                      maxLength={14}
                      onChange={(event) =>
                        setDraft((current) =>
                          current.map((entry) =>
                            entry.key === item.key
                              ? {
                                  ...entry,
                                  alias: truncateCalendarAlias(
                                    event.target.value,
                                  ),
                                }
                              : entry,
                          ),
                        )
                      }
                      className="min-h-[40px] rounded-[4px] border border-line-btn bg-page px-[11px] font-sans text-[13px]"
                    />
                    <div className="flex justify-end gap-[5px]">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="size-9 rounded border border-line-btn disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === draft.length - 1}
                        className="size-9 rounded border border-line-btn disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(normalizeInternalPalette(draft, catalog))
                        }
                        className="size-9 rounded border border-line-btn"
                        aria-label={t.save}
                      >
                        <FloppyDisk size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-[16px] flex justify-end gap-[8px]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded border border-line-btn px-4 font-sans text-sm"
            >
              {t.close}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(normalizeInternalPalette(draft, catalog));
                onClose();
              }}
              className="min-h-11 rounded bg-accent px-5 font-sans text-sm text-page"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

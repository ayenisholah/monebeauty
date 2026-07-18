"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ThemedSelect } from "@/components/ui/ThemedSelect";

export function MediaField({
  name,
  label,
  defaultValue = "",
  assets,
  multiple = true,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  assets: string[];
  multiple?: boolean;
}) {
  const [paths, setPaths] = useState(defaultValue);
  const [selection, setSelection] = useState("");
  const preview = useMemo(
    () =>
      paths
        .split(/\r?\n/)
        .map((path) => path.trim())
        .find(Boolean),
    [paths],
  );

  function choose(path: string) {
    setSelection(path);
    if (!path) return;
    if (multiple) {
      const current = paths
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (!current.includes(path)) setPaths([...current, path].join("\n"));
    } else {
      setPaths(path);
    }
  }

  return (
    <div>
      <label className="block">
        <span className="mb-[6px] block font-sans text-label tracking-[.08em] text-muted uppercase">
          {label}
        </span>
        {multiple ? (
          <textarea
            name={name}
            rows={3}
            value={paths}
            onChange={(event) => setPaths(event.target.value)}
            className="w-full rounded-[4px] border border-line-btn bg-page px-[11px] py-[10px] font-sans text-compact text-ink outline-none focus:border-accent"
          />
        ) : (
          <input
            name={name}
            value={paths}
            onChange={(event) => setPaths(event.target.value)}
            className="w-full rounded-[4px] border border-line-btn bg-page px-[11px] py-[10px] font-sans text-compact text-ink outline-none focus:border-accent"
          />
        )}
      </label>
      <div className="mt-[8px] grid gap-[8px] sm:grid-cols-[1fr_96px]">
        <ThemedSelect
          ariaLabel={`${label} media library`}
          value={selection}
          onValueChange={choose}
          options={assets.map((asset) => ({ value: asset, label: asset }))}
          placeholder="/media/…"
          searchable
          searchPlaceholder="Search media"
          className="min-w-0 [&_button[data-trigger]]:bg-card"
        />
        {preview?.startsWith("/media/") ? (
          <div className="relative h-[72px] overflow-hidden rounded-[4px] border border-line-card bg-page">
            <Image
              src={preview}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

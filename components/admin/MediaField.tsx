"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import {
  ADMIN_IMAGE_MIME_TYPES,
  MAX_ADMIN_IMAGE_BYTES,
} from "@/lib/media-reference";

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [uploadMessage, setUploadMessage] = useState("");
  const uploadId = useId();
  const t = useTranslations("Admin.media");
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

  async function upload(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    setUploadMessage("");
    const invalidType = selected.some(
      (file) =>
        !(ADMIN_IMAGE_MIME_TYPES as readonly string[]).includes(file.type),
    );
    if (invalidType) {
      setUploadMessage(t("typeError"));
      return;
    }
    if (selected.some((file) => file.size > MAX_ADMIN_IMAGE_BYTES)) {
      setUploadMessage(t("sizeError"));
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: selected.length });
    const uploaded: string[] = [];
    try {
      for (let index = 0; index < selected.length; index++) {
        setUploadProgress({ current: index + 1, total: selected.length });
        const body = new FormData();
        body.set("file", selected[index]);
        const response = await fetch("/api/admin/media/upload", {
          method: "POST",
          body,
        });
        const result = (await response.json().catch(() => null)) as {
          url?: string;
        } | null;
        if (!response.ok || !result?.url) throw new Error("upload_failed");
        uploaded.push(result.url);
        if (multiple) {
          setPaths((currentValue) => {
            const current = currentValue
              .split(/\r?\n/)
              .map((item) => item.trim())
              .filter(Boolean);
            return [...new Set([...current, result.url as string])].join("\n");
          });
        } else {
          setPaths(result.url);
        }
        setSelection(result.url);
      }
      setUploadMessage(t("success", { count: uploaded.length }));
    } catch {
      setUploadMessage(t("uploadError"));
    } finally {
      setUploading(false);
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
      <div className="mt-[8px] flex flex-wrap items-center gap-[10px]">
        <label
          htmlFor={uploadId}
          className={`inline-flex min-h-[40px] items-center justify-center rounded-[4px] border border-line-btn bg-card px-[13px] font-sans text-meta tracking-[.08em] text-ink uppercase ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer hover:bg-btn-fill"}`}
        >
          {uploading
            ? t("uploading", uploadProgress)
            : t(multiple ? "uploadMultiple" : "uploadSingle")}
        </label>
        <input
          id={uploadId}
          type="file"
          accept={ADMIN_IMAGE_MIME_TYPES.join(",")}
          multiple={multiple}
          disabled={uploading}
          className="sr-only"
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
        <span aria-live="polite" className="font-sans text-[12px] text-muted">
          {uploadMessage}
        </span>
      </div>
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
        {preview?.startsWith("/media/") ||
        preview?.startsWith("https://res.cloudinary.com/") ? (
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

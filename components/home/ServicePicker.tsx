"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export function ServicePicker({
  services,
  labels,
}: {
  services: { key: string; title: string }[];
  labels: { placeholder: string; cta: string };
}) {
  const router = useRouter();
  const [service, setService] = useState(services[0]?.key ?? "");
  return (
    <div className="flex w-full flex-col gap-[12px] sm:flex-row">
      <label className="sr-only" htmlFor="home-service-picker">
        {labels.placeholder}
      </label>
      <select
        id="home-service-picker"
        value={service}
        onChange={(event) => setService(event.target.value)}
        className="min-h-[52px] flex-1 rounded-[4px] border border-line-btn bg-card px-[16px] font-sans text-[14px] text-ink outline-none focus:border-accent"
      >
        {services.map((item) => (
          <option key={item.key} value={item.key}>
            {item.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => router.push(`${PUBLIC_PATHS.booking}?service=${service}`)}
        className="inline-flex min-h-[52px] items-center justify-center gap-[10px] rounded-[4px] bg-accent px-[26px] font-sans text-[12px] font-medium tracking-[.16em] text-page uppercase transition-transform hover:-translate-y-px"
      >
        {labels.cta}
        <ArrowRight size={17} weight="thin" />
      </button>
    </div>
  );
}

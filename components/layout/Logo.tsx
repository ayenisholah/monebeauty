import { FlowerLotus } from "@phosphor-icons/react/ssr";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/content/site";
import { cn } from "@/lib/cn";

/** Lotus mark + stacked MONE / BEAUTY CLINIC wordmark. */
export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link href="/" className="flex items-center gap-[12px]">
      <FlowerLotus size={34} weight="thin" className="text-accent" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[22px] font-semibold tracking-[.04em]",
            tone === "dark" ? "text-footer-logo" : "text-ink",
          )}
        >
          {BRAND.wordmark.line1}
        </span>
        <span className="mt-[3px] font-sans text-[9.5px] font-normal tracking-[.34em] text-eyebrow-subtle">
          {BRAND.wordmark.line2}
        </span>
      </span>
    </Link>
  );
}

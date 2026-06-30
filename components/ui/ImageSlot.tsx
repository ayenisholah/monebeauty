import Image from "next/image";
import { Image as ImageIcon, ArrowDown } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";

const LIGHT_GRADIENT =
  "repeating-linear-gradient(135deg,rgba(255,255,255,.45) 0 1px,transparent 1px 17px),linear-gradient(155deg,#E7DBC8,#D6C5AB)";
const DARK_GRADIENT =
  "repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 1px,transparent 1px 17px),linear-gradient(155deg,#4A4338,#2E2A23)";

/**
 * Image placeholder (the prototype's beige pinstripe gradient + caption).
 * Drops in a real photo via `src`; otherwise renders the placeholder so the
 * layout is final and only the imagery is swapped later.
 */
export function ImageSlot({
  caption,
  src,
  alt,
  minHeight = 480,
  tone = "light",
  scrollHint = false,
  rounded = true,
  className,
  priority = false,
}: {
  caption?: string;
  src?: string;
  alt?: string;
  minHeight?: number;
  tone?: "light" | "dark";
  scrollHint?: boolean;
  rounded?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        rounded && "rounded-[var(--radius)]",
        className,
      )}
      style={{
        minHeight,
        backgroundImage: src
          ? undefined
          : tone === "dark"
            ? DARK_GRADIENT
            : LIGHT_GRADIENT,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? caption ?? ""}
          fill
          priority={priority}
          className="object-cover"
          sizes="(max-width: 900px) 100vw, 50vw"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-[9px]",
            tone === "dark" ? "text-[#A99C86]" : "text-[#A1907A]",
          )}
        >
          <ImageIcon size={30} weight="thin" />
          {caption ? (
            <span className="font-mono text-[11px] tracking-[.2em] uppercase">
              {caption}
            </span>
          ) : null}
        </div>
      )}

      {scrollHint ? (
        <div className="absolute right-[22px] bottom-[22px] grid h-[48px] w-[48px] place-items-center rounded-full bg-[rgba(251,248,243,.9)] text-accent shadow-[var(--shadow-scroll)]">
          <ArrowDown size={20} weight="thin" />
        </div>
      ) : null}
    </div>
  );
}

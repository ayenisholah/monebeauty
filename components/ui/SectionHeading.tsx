import { cn } from "@/lib/cn";
import { Eyebrow } from "./Eyebrow";

/**
 * Eyebrow + serif H2, with an optional trailing slot (e.g. a text-link) aligned
 * to the right on the same baseline row.
 */
export function SectionHeading({
  eyebrow,
  children,
  trailing,
  className,
  headingClassName,
  as: As = "h2",
  maxWidth = "560px",
}: {
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  headingClassName?: string;
  as?: "h1" | "h2";
  maxWidth?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-[18px]",
        className,
      )}
    >
      <div style={{ maxWidth }}>
        {eyebrow ? <Eyebrow className="mb-[14px]">{eyebrow}</Eyebrow> : null}
        <As
          className={cn(
            "font-display text-h2-treat leading-[1.08] font-medium text-ink",
            headingClassName,
          )}
        >
          {children}
        </As>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

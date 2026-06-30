import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Link } from "@/i18n/navigation";
import { ImageSlot } from "./ImageSlot";

/** Treatment card — image (248px) with corner number, serif title, muted copy, Learn More link. */
export function Card({
  number,
  title,
  description,
  imageCaption,
  href,
  learnMore,
  imageSrc,
}: {
  number: string;
  title: string;
  description: string;
  imageCaption?: string;
  href: string;
  learnMore: string;
  imageSrc?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card transition-all duration-300 hover:-translate-y-[6px] hover:border-line-card-hover hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative">
        <ImageSlot
          caption={imageCaption}
          src={imageSrc}
          alt={title}
          minHeight={248}
          rounded={false}
        />
        <span className="absolute top-[14px] left-[18px] font-display text-[26px] font-medium text-[rgba(58,42,28,.34)]">
          {number}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-[22px] pt-[22px] pb-[26px]">
        <h3 className="font-display text-[24px] leading-[1.1] font-semibold text-ink">
          {title}
        </h3>
        <p className="mt-[10px] font-sans text-[13px] leading-[1.6] font-light text-muted">
          {description}
        </p>
        <span className="mt-[18px] inline-flex items-center gap-[6px] font-sans text-[11px] font-medium tracking-[.16em] text-accent uppercase">
          {learnMore}
          <ArrowUpRight size={14} weight="thin" />
        </span>
      </div>
    </Link>
  );
}

import { CaretRight } from "@phosphor-icons/react/ssr";
import { Link } from "@/i18n/navigation";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-[8px]"
    >
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-[8px]">
          {it.href ? (
            <Link
              href={it.href}
              className="font-sans text-[12px] tracking-[.1em] text-muted uppercase transition-colors hover:text-accent"
            >
              {it.label}
            </Link>
          ) : (
            <span className="font-sans text-[12px] tracking-[.1em] text-ink uppercase">
              {it.label}
            </span>
          )}
          {i < items.length - 1 ? (
            <CaretRight size={12} weight="thin" className="text-muted" />
          ) : null}
        </span>
      ))}
    </nav>
  );
}

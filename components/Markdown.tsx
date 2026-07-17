import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/navigation";
import { canonicalInternalHref } from "@/lib/public-routes";

/**
 * Renders real page-body markdown (from scraped_content) with the design system.
 * Images resolve from public/media/** (src rewritten by scripts/gen-content.mjs).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-[clamp(32px,4vw,48px)] font-display text-[clamp(26px,3.2vw,40px)] leading-[1.12] font-medium text-ink first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-[clamp(28px,3.5vw,44px)] font-display text-[clamp(23px,2.6vw,32px)] leading-[1.15] font-medium text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-[clamp(22px,2.4vw,32px)] font-display text-[22px] font-semibold text-ink">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mt-[16px] font-sans text-[15px] leading-[1.8] font-light text-body">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mt-[16px] flex flex-col gap-[10px]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-[16px] flex list-decimal flex-col gap-[10px] pl-[20px] marker:text-accent">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="font-sans text-[15px] leading-[1.75] font-light text-body">
              {children}
            </li>
          ),
          a: ({ href, children }) => {
            const canonicalHref = href ? canonicalInternalHref(href) : "";
            const className =
              "text-accent underline decoration-line-underline underline-offset-2 transition-colors hover:decoration-accent";
            return canonicalHref.startsWith("/") &&
              !canonicalHref.startsWith("//") ? (
              <Link href={canonicalHref} className={className}>
                {children}
              </Link>
            ) : (
              <a href={href} className={className}>
                {children}
              </a>
            );
          },
          strong: ({ children }) => (
            <strong className="font-medium text-ink">{children}</strong>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              // Markdown images have unknown intrinsic size — plain img with lazy load.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                className="mt-[24px] w-full rounded-[var(--radius)] object-cover"
              />
            ) : null,
          table: ({ children }) => (
            <div className="mt-[20px] overflow-x-auto">
              <table className="w-full border-collapse text-left font-sans text-[14px]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-line-card px-[12px] py-[10px] font-medium text-ink">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line-card px-[12px] py-[10px] font-light text-body">
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

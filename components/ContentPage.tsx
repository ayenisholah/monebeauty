import { Container } from "@/components/ui/Container";
import { Markdown } from "@/components/Markdown";
import { getPageContent } from "@/content/pages";
import type { Locale } from "@/i18n/routing";

/** Renders a real content page (title + markdown body) from scraped_content. */
export function ContentPage({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const content = getPageContent(slug, locale);
  if (!content) return null;
  return (
    <article className="bg-page py-[clamp(40px,5vw,72px)]">
      <Container className="max-w-[880px]">
        <h1 className="font-display text-[clamp(32px,4.4vw,56px)] leading-[1.06] font-medium text-ink">
          {content.title}
        </h1>
        <div className="mt-[clamp(20px,2.5vw,36px)]">
          <Markdown>{content.body}</Markdown>
        </div>
      </Container>
    </article>
  );
}

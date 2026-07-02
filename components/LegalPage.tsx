import { Container } from "@/components/ui/Container";

/** Shared legal page shell (Privacy / Terms / Cookies). Content is a placeholder. */
export function LegalPage({
  title,
  lastUpdatedLabel,
  date,
  body,
}: {
  title: string;
  lastUpdatedLabel: string;
  date: string;
  body: string[];
}) {
  return (
    <section className="bg-page py-[clamp(48px,6vw,88px)]">
      <Container className="max-w-[720px]">
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {title}
        </h1>
        <p className="mt-[12px] font-sans text-[12px] tracking-[.14em] text-muted uppercase">
          {lastUpdatedLabel}: {date}
        </p>
        <div className="mt-[28px] grid gap-[16px] font-sans text-[15px] leading-[1.8] font-light text-body">
          {body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Container>
    </section>
  );
}

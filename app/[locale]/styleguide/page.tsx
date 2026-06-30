import { setRequestLocale } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button, ButtonAction } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeatureItem } from "@/components/ui/FeatureItem";
import { Stethoscope } from "@phosphor-icons/react/ssr";

export const metadata = { robots: { index: false } };

const COLORS = [
  ["page", "#FBF8F3"],
  ["alt", "#F5EFE4"],
  ["card", "#FCFAF6"],
  ["accent", "#97785A"],
  ["cta", "#2A2520"],
  ["footer", "#221E1B"],
];

const TYPE = [
  ["text-h1", "Display H1"],
  ["text-h2", "Display H2"],
  ["text-h2-treat", "Section H2"],
  ["text-tech", "Technology name"],
  ["text-lead", "Lead / body"],
];

export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container className="space-y-[56px] py-[64px]">
      <div>
        <Eyebrow>Styleguide</Eyebrow>
        <h1 className="mt-[10px] font-display text-h2 font-medium text-ink">
          Design system
        </h1>
      </div>

      {/* Colors */}
      <section>
        <SectionHeading className="mb-[24px]">Colors</SectionHeading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[16px]">
          {COLORS.map(([name, hex]) => (
            <div
              key={name}
              className="overflow-hidden rounded-[var(--radius)] border border-line-card"
            >
              <div className={`h-[80px] bg-${name}`} />
              <div className="p-[12px]">
                <div className="font-sans text-[13px] text-ink">{name}</div>
                <div className="font-mono text-[11px] text-muted">{hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Type */}
      <section>
        <SectionHeading className="mb-[24px]">Typography</SectionHeading>
        <div className="space-y-[14px]">
          {TYPE.map(([cls, label]) => (
            <p key={cls} className={`font-display ${cls} text-ink`}>
              {label}
            </p>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section>
        <SectionHeading className="mb-[24px]">Buttons</SectionHeading>
        <div className="flex flex-wrap items-center gap-[14px]">
          <Button href="/styleguide" iconRight={ArrowRight}>
            Primary
          </Button>
          <Button href="/styleguide" variant="outline">
            Outline
          </Button>
          <Button href="/styleguide" variant="textLink" iconRight={ArrowRight}>
            Text link
          </Button>
          <div className="rounded-[var(--radius)] bg-cta p-[20px]">
            <ButtonAction variant="primaryOnDark">On dark</ButtonAction>
          </div>
        </div>
      </section>

      {/* Components */}
      <section>
        <SectionHeading className="mb-[24px]">Components</SectionHeading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-[26px]">
          <Card
            number="01"
            title="Treatment Card"
            description="Image, corner number, serif title, muted copy and a Learn More link."
            imageCaption="Preview"
            href="/styleguide"
            learnMore="Learn More"
          />
          <div className="rounded-[var(--radius)] border border-line-card bg-card p-[24px]">
            <FeatureItem
              icon={Stethoscope}
              title="Feature Item"
              description="Thin icon, uppercase title, muted description."
            />
          </div>
        </div>
      </section>
    </Container>
  );
}

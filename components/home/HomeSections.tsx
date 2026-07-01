import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Atom,
  Certificate,
  Medal,
  ShieldCheck,
  UserFocus,
} from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Link } from "@/i18n/navigation";
import { getPageContent } from "@/content/pages";
import { CONTACT } from "@/content/site";
import type { Locale } from "@/i18n/routing";

function cleanMarkdown(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\\-/g, "-")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeading(body: string, fallback: string) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? cleanMarkdown(match[1]) : fallback;
}

function firstParagraphs(body: string, count: number) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith("#") && !/^\\?-/.test(block))
    .slice(0, count)
    .map(cleanMarkdown);
}

function findSectionHeading(body: string, patterns: RegExp[], fallback: string) {
  const heading = body
    .split(/\r?\n/)
    .find((line) => patterns.some((pattern) => pattern.test(line)));
  return heading ? cleanMarkdown(heading) : fallback;
}

function whyChooseItems(body: string) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    /why choose|miksi valita|почему выбирают/i.test(line),
  );
  const source = start === -1 ? lines : lines.slice(start + 1);
  const items: Array<{ title: string; body: string }> = [];

  for (const raw of source) {
    const line = raw.trim();
    const match = line.match(/^\\?-\s+\*\*(.+?)\*\*:?\s*(.+)$/);
    if (!match) {
      if (items.length > 0 && line.startsWith("#")) break;
      continue;
    }
    items.push({
      title: cleanMarkdown(match[1]).replace(/:$/, ""),
      body: cleanMarkdown(match[2]),
    });
    if (items.length === 4) break;
  }

  return items;
}

export async function HomeAbout() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Common");
  const about = getPageContent("about", locale);
  if (!about) return null;
  const paragraphs = firstParagraphs(about.body, 2);

  return (
    <section id="about" className="bg-page py-[clamp(60px,7vw,112px)]">
      <Container>
        <div className="grid items-center gap-[clamp(32px,6vw,80px)] nav:grid-cols-[1fr_.95fr]">
          <div>
            <Eyebrow className="mb-[22px]">{about.title}</Eyebrow>
            <h2 className="max-w-[620px] font-display text-h2 leading-[1.06] font-medium text-ink">
              {firstHeading(about.body, about.title)}
            </h2>
            <div className="mt-[28px] max-w-[620px] space-y-[20px]">
              {paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="font-sans text-lead leading-[1.8] font-light text-body"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-[36px]">
              <Button href="/about" variant="outline" iconRight={ArrowRight}>
                {t("readMore")}
              </Button>
            </div>
          </div>
          <ImageSlot
            src="/media/home/about.jpg"
            alt={about.title}
            minHeight={480}
          />
        </div>
      </Container>
    </section>
  );
}

export async function HomeTechnologies() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Nav");
  const tc = await getTranslations("Common");
  const about = getPageContent("about", locale);
  const heading = about
    ? findSectionHeading(
        about.body,
        [/Top Modern/i, /Parhaat nykyaikaiset/i, /Лучшие современные/i],
        t("services"),
      )
    : t("services");

  const technologies = [
    { label: t("endospheres"), href: "/instrumental/endosphere" },
    { label: t("laser"), href: "/instrumental/laser" },
    { label: t("rf"), href: "/instrumental/mikroneulanrf" },
    { label: t("trichology"), href: "/trichology" },
    { label: t("arosha"), href: "/arosha" },
    { label: t("catalog"), href: "/catalog" },
  ] as const;

  return (
    <section className="bg-alt py-[clamp(60px,7vw,104px)]">
      <div className="mx-auto max-w-[1100px] px-[clamp(20px,5vw,56px)] text-center">
        <Eyebrow className="mb-[14px]">{t("services")}</Eyebrow>
        <h2 className="font-display text-h2-tech leading-[1.12] font-medium text-ink">
          {heading}
        </h2>
        <div className="mt-[clamp(34px,4vw,54px)] flex flex-wrap items-center justify-center gap-x-[clamp(28px,5vw,64px)] gap-y-[20px]">
          {technologies.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-tech tracking-[.06em] text-[#A89A85] opacity-85 transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-[clamp(34px,4vw,54px)]">
          <Button href="/services" variant="outline" iconRight={ArrowRight}>
            {tc("allServices")}
          </Button>
        </div>
      </div>
    </section>
  );
}

export async function HomeBookingCta() {
  const t = await getTranslations();

  return (
    <section id="book" className="bg-page py-[clamp(40px,5vw,80px)]">
      <Container>
        <div className="grid overflow-hidden rounded-[var(--radius)] bg-cta nav:grid-cols-[1.1fr_.9fr]">
          <div className="px-[clamp(28px,5vw,72px)] py-[clamp(44px,6vw,76px)]">
            <Eyebrow className="mb-[24px] text-gold">{t("Nav.bookTime")}</Eyebrow>
            <h2 className="max-w-[560px] font-display text-h2-cta leading-[1.06] font-medium text-cta-heading">
              {t("Booking.heading")}
            </h2>
            <p className="mt-[22px] max-w-[560px] font-sans text-[15px] leading-[1.75] font-light text-cta-body">
              {CONTACT.address.street}, {CONTACT.address.postalCode}{" "}
              {CONTACT.address.city} · {CONTACT.phone} · {CONTACT.email}
            </p>
            <div className="mt-[32px]">
              <Button
                href="/booking"
                variant="primaryOnDark"
                iconRight={ArrowRight}
              >
                {t("Common.bookTime")}
              </Button>
            </div>
          </div>
          <ImageSlot
            src="/media/files/land/240/d0c2d035d8a3b00a7d39938b2a2b8bea.jpg"
            alt={t("Nav.bookTime")}
            minHeight={340}
            tone="dark"
            rounded={false}
          />
        </div>
      </Container>
    </section>
  );
}

export async function HomeFeatureStrip() {
  const locale = (await getLocale()) as Locale;
  const about = getPageContent("about", locale);
  if (!about) return null;

  const icons = [Medal, UserFocus, Atom, ShieldCheck, Certificate];
  const items = whyChooseItems(about.body);
  if (items.length === 0) return null;

  return (
    <section className="bg-page pb-[clamp(60px,7vw,104px)]">
      <Container>
        <div className="grid gap-[clamp(24px,3vw,44px)] border-t border-line-hair pt-[clamp(38px,5vw,58px)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = icons[index] ?? Certificate;
            return (
              <div key={item.title} className="flex flex-col gap-[16px]">
                <Icon size={30} weight="thin" className="text-accent" />
                <div>
                  <h3 className="font-sans text-[12px] leading-[1.4] font-semibold tracking-[.08em] text-ink uppercase">
                    {item.title}
                  </h3>
                  <p className="mt-[14px] font-sans text-[13px] leading-[1.7] font-light text-body">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export async function HomeContentSections() {
  return (
    <>
      <HomeAbout />
      <HomeTechnologies />
      <HomeBookingCta />
      <HomeFeatureStrip />
    </>
  );
}

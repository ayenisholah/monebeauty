import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  Phone,
  EnvelopeSimple,
  MapPin,
  Clock,
} from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CONTACT } from "@/content/site";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates("/contact", locale),
  };
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-card px-[14px] py-[12px] font-sans text-[14px] text-ink outline-none focus:border-line-btn-hover";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    `${CONTACT.address.street}, ${CONTACT.address.postalCode} ${CONTACT.address.city}`,
  )}&output=embed`;

  const details = [
    {
      Icon: MapPin,
      heading: t("addressHeading"),
      value: `${CONTACT.address.street}, ${CONTACT.address.postalCode} ${CONTACT.address.city}`,
    },
    {
      Icon: Phone,
      heading: t("phoneHeading"),
      value: CONTACT.phone,
      href: CONTACT.phoneHref,
    },
    {
      Icon: EnvelopeSimple,
      heading: t("emailHeading"),
      value: CONTACT.email,
      href: CONTACT.emailHref,
    },
    { Icon: Clock, heading: t("hoursHeading"), value: t("hours") },
  ];

  return (
    <section className="bg-page py-[clamp(48px,6vw,88px)]">
      <Container>
        <Eyebrow className="mb-[14px]">{t("eyebrow")}</Eyebrow>
        <h1 className="font-display text-h2 leading-[1.06] font-medium text-ink">
          {t("heading")}
        </h1>

        <div className="mt-[clamp(36px,4vw,56px)] grid grid-cols-1 gap-[clamp(32px,4vw,56px)] lg:grid-cols-[1fr_1.1fr]">
          {/* Details */}
          <div className="flex flex-col gap-[24px]">
            {details.map(({ Icon, heading, value, href }) => (
              <div key={heading} className="flex items-start gap-[14px]">
                <Icon
                  size={22}
                  weight="thin"
                  className="mt-[2px] shrink-0 text-accent"
                />
                <div>
                  <div className="font-sans text-[11px] font-medium tracking-[.16em] text-muted uppercase">
                    {heading}
                  </div>
                  {href ? (
                    <a
                      href={href}
                      className="font-sans text-[15px] text-ink transition-colors hover:text-accent"
                    >
                      {value}
                    </a>
                  ) : (
                    <div className="font-sans text-[15px] text-ink">
                      {value}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form (preview — submission wired in a later phase) */}
          <form className="flex flex-col gap-[14px] rounded-[var(--radius)] border border-line-card bg-card p-[clamp(20px,3vw,32px)]">
            <h2 className="font-display text-[22px] font-medium text-ink">
              {t("formHeading")}
            </h2>
            <input
              className={inputCls}
              type="text"
              name="name"
              placeholder={t("name")}
              aria-label={t("name")}
            />
            <input
              className={inputCls}
              type="email"
              name="email"
              placeholder={t("email")}
              aria-label={t("email")}
            />
            <input
              className={inputCls}
              type="tel"
              name="phone"
              placeholder={t("phone")}
              aria-label={t("phone")}
            />
            <textarea
              className={`${inputCls} min-h-[120px] resize-y`}
              name="message"
              placeholder={t("message")}
              aria-label={t("message")}
            />
            <label className="flex items-start gap-[10px] font-sans text-[12.5px] leading-[1.5] font-light text-muted">
              <input type="checkbox" className="mt-[3px]" required />
              <span>{t("consent")}</span>
            </label>
            <button
              type="button"
              className="mt-[4px] inline-flex items-center justify-center rounded-[4px] bg-accent px-[30px] py-[14px] font-sans text-[12px] font-medium tracking-[.16em] text-page uppercase transition-colors hover:[background:color-mix(in_srgb,var(--accent)_86%,#000)]"
            >
              {t("send")}
            </button>
            <p className="font-sans text-[11.5px] font-light text-muted">
              {t("formNote")}
            </p>
          </form>
        </div>

        {/* Map */}
        <div className="mt-[clamp(36px,4vw,56px)] overflow-hidden rounded-[var(--radius)] border border-line-card">
          <iframe
            title={t("addressHeading")}
            src={mapSrc}
            className="h-[360px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Container>
    </section>
  );
}

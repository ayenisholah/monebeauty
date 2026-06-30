import { getTranslations, getLocale } from "next-intl/server";
import {
  InstagramLogo,
  FacebookLogo,
  WhatsappLogo,
  Phone,
  EnvelopeSimple,
  MapPin,
  ArrowRight,
} from "@phosphor-icons/react/ssr";
import { Link } from "@/i18n/navigation";
import { BRAND, CONTACT, SOCIALS, NAV, LEGAL_NAV } from "@/content/site";
import {
  FOOTER_TREATMENT_SLUGS,
  getTreatment,
  type AppLocale,
} from "@/content/treatments";

const socials = [
  { href: SOCIALS.instagram, Icon: InstagramLogo, label: "Instagram" },
  { href: SOCIALS.facebook, Icon: FacebookLogo, label: "Facebook" },
  { href: SOCIALS.whatsapp, Icon: WhatsappLogo, label: "WhatsApp" },
];

export async function Footer() {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  const colHeading =
    "mb-[18px] font-sans text-[11px] font-medium uppercase tracking-[.2em] text-footer-heading";
  const linkCls =
    "font-sans text-[13.5px] font-light text-footer-link transition-colors hover:text-footer-logo";

  return (
    <footer className="bg-footer">
      <div className="mx-auto w-full max-w-[1280px] px-[clamp(20px,5vw,56px)] py-[clamp(60px,7vw,96px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[clamp(34px,4vw,56px)] border-b border-line-footer pb-[clamp(40px,5vw,64px)]">
          {/* Brand */}
          <div className="flex flex-col gap-[20px]">
            <span className="font-display text-[22px] font-semibold tracking-[.04em] text-footer-logo">
              {BRAND.wordmark.line1}
            </span>
            <p className="max-w-[260px] font-sans text-[13.5px] leading-[1.7] font-light text-footer-para">
              {t("Footer.brandDescription")}
            </p>
            <div className="flex gap-[12px]">
              {socials.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-[40px] w-[40px] place-items-center rounded-full border border-line-social text-footer-link transition-colors hover:border-accent hover:bg-accent hover:text-page"
                >
                  <Icon size={18} weight="thin" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className={colHeading}>{t("Footer.navHeading")}</h4>
            <ul className="flex flex-col gap-[12px]">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={linkCls}>
                    {t(`Nav.${n.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatments */}
          <div>
            <h4 className={colHeading}>{t("Footer.treatmentsHeading")}</h4>
            <ul className="flex flex-col gap-[12px]">
              {FOOTER_TREATMENT_SLUGS.map((slug) => {
                const tr = getTreatment(slug);
                if (!tr) return null;
                return (
                  <li key={slug}>
                    <Link href={`/services/${slug}`} className={linkCls}>
                      {tr.content[locale].title}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/services" className={linkCls}>
                  {t("Footer.allTreatments")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h4 className={colHeading}>{t("Footer.contactsHeading")}</h4>
            <ul className="flex flex-col gap-[14px]">
              <li>
                <a
                  href={CONTACT.phoneHref}
                  className={`inline-flex items-center gap-[10px] ${linkCls}`}
                >
                  <Phone size={16} weight="thin" className="text-accent" />
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a
                  href={CONTACT.emailHref}
                  className={`inline-flex items-center gap-[10px] ${linkCls}`}
                >
                  <EnvelopeSimple
                    size={16}
                    weight="thin"
                    className="text-accent"
                  />
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex items-start gap-[10px] font-sans text-[13.5px] font-light text-footer-link">
                <MapPin
                  size={16}
                  weight="thin"
                  className="mt-[2px] shrink-0 text-accent"
                />
                <span>
                  {CONTACT.address.street}
                  <br />
                  {CONTACT.address.postalCode} {CONTACT.address.city}
                </span>
              </li>
            </ul>
            <Link
              href="/booking"
              className="mt-[20px] inline-flex items-center gap-[9px] rounded-[4px] bg-accent px-[22px] py-[12px] font-sans text-[11px] font-medium tracking-[.16em] text-page uppercase transition-colors hover:[background:color-mix(in_srgb,var(--accent)_84%,#fff)]"
            >
              {t("Nav.bookOnline")}
              <ArrowRight size={15} weight="thin" />
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-[14px] pt-[26px]">
          <p className="font-sans text-[12px] text-footer-copy">
            © {new Date().getFullYear()} {BRAND.name}. {t("Footer.rights")}
          </p>
          <div className="flex flex-wrap gap-[20px]">
            {LEGAL_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-sans text-[12px] text-footer-copy transition-colors hover:text-footer-logo"
              >
                {t(`Footer.${l.key}`)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

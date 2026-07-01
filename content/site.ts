/**
 * Brand + global site constants — Mone Beauty Clinic (per SCOPE.md; aesthetic medicine).
 * Real NAP, nav, and hours from scraped_content. Logo/favicon are the real assets.
 */

export const BRAND = {
  name: "Mone Beauty Clinic",
  shortName: "Mone Beauty Clinic",
  logo: "/logo.svg",
  domain: "monebeauty.fi",
  url: "https://monebeauty.fi",
} as const;

export const CONTACT = {
  phone: "+358 40 129 3800",
  phoneHref: "tel:+358401293800",
  email: "info@monebeauty.fi",
  emailHref: "mailto:info@monebeauty.fi",
  address: {
    street: "Solvikinkatu 5",
    postalCode: "00990",
    city: "Helsinki",
    country: "Finland",
  },
  geo: { lat: 60.2099, lng: 25.0807 },
} as const;

export const SOCIALS = {
  instagram: "https://www.instagram.com/monebeauty.fi/",
  facebook: "https://www.facebook.com/monebeauty.fi/",
  whatsapp: "https://wa.me/358401293800",
} as const;

export type NavChild = { key: string; href: string };
export type NavItem =
  { key: string; href: string } | { key: string; children: NavChild[] };

/** Primary navigation (labels resolve to messages.Nav.*). Mirrors the live header. */
export const NAV: NavItem[] = [
  { key: "about", href: "/about" },
  {
    key: "instrumental",
    children: [
      { key: "endospheres", href: "/instrumental/endosphere" },
      { key: "laser", href: "/instrumental/laser" },
      { key: "rf", href: "/instrumental/mikroneulanrf" },
    ],
  },
  { key: "trichology", href: "/trichology" },
  { key: "arosha", href: "/arosha" },
  {
    key: "services",
    children: [
      { key: "face", href: "/services/face" },
      { key: "body", href: "/services/body" },
      { key: "serviceTricho", href: "/services/tricho" },
      { key: "serviceLaser", href: "/services/laser" },
      { key: "serviceRf", href: "/services/mikroneulanrf" },
      { key: "eyebrows", href: "/services/eyebrows" },
      { key: "packages", href: "/services/packages" },
      { key: "giftCards", href: "/services/gift-cards" },
    ],
  },
  { key: "catalog", href: "/catalog" },
];

/** Footer navigation columns (mirrors the live footer). */
export const FOOTER_NAV: NavChild[] = [
  { key: "about", href: "/about" },
  { key: "endospheres", href: "/instrumental/endosphere" },
  { key: "trichology", href: "/trichology" },
  { key: "arosha", href: "/arosha" },
  { key: "services", href: "/services" },
  { key: "catalog", href: "/catalog" },
];

export const LEGAL_NAV = [
  { key: "privacy", href: "/privacy-policy" },
  { key: "terms", href: "/terms-of-use" },
  { key: "cookies", href: "/cookies-policy" },
] as const;

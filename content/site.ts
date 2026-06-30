/**
 * Brand + global site constants.
 * Real NAP from the live site (scraped_content). Brand name kept as a single
 * constant — "Clinic" per SCOPE/handoff; final name to be confirmed by client.
 */

export const BRAND = {
  name: "Mone Beauty Clinic",
  shortName: "Mone Beauty",
  wordmark: { line1: "MONE", line2: "BEAUTY CLINIC" },
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
  geo: { lat: 60.2099, lng: 25.0807 }, // approximate (Helsinki)
} as const;

export const SOCIALS = {
  instagram: "https://www.instagram.com/monebeauty.fi/",
  facebook: "https://www.facebook.com/monebeauty.fi/",
  whatsapp: "https://wa.me/358401293800",
} as const;

/** Primary navigation (keys resolve to messages.Nav.*). */
export const NAV = [
  { key: "about", href: "/about" },
  { key: "services", href: "/services" },
  { key: "pricing", href: "/pricing" },
  { key: "blog", href: "/blog" },
  { key: "contact", href: "/contact" },
] as const;

export const LEGAL_NAV = [
  { key: "privacy", href: "/privacy-policy" },
  { key: "terms", href: "/terms-of-use" },
  { key: "cookies", href: "/cookies-policy" },
] as const;

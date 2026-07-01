import { routing } from "@/i18n/routing";
import { BRAND, CONTACT } from "@/content/site";

/** Plain-text excerpt from markdown for meta descriptions. */
export function excerpt(markdown: string, max = 160): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/[#>*_`|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max
    ? text.slice(0, max).replace(/\s+\S*$/, "") + "…"
    : text;
}

/** hreflang + canonical for a locale-agnostic path (e.g. "/services/x"). */
export function localeAlternates(path: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

/** LocalBusiness / MedicalClinic JSON-LD with Helsinki NAP (local SEO). */
export function medicalClinicJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: BRAND.name,
    url: BRAND.url,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT.address.street,
      postalCode: CONTACT.address.postalCode,
      addressLocality: CONTACT.address.city,
      addressCountry: "FI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CONTACT.geo.lat,
      longitude: CONTACT.geo.lng,
    },
    medicalSpecialty: "Aesthetic",
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqJsonLd(faq: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function serviceJsonLd(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name,
    description,
    url,
    provider: { "@type": "MedicalClinic", name: BRAND.name, url: BRAND.url },
  };
}

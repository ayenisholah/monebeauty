import type { Locale } from "@/i18n/routing";

export const ADMIN_SEGMENTS = {
  dashboard: "",
  login: "kirjaudu",
  clients: "asiakkaat",
  services: "palvelut",
  technologies: "teknologiat",
  content: "sisalto",
  products: "tuotteet",
  pricing: "hinnasto",
  blog: "artikkelit",
  chat: "keskustelut",
} as const;

export type AdminModule = keyof typeof ADMIN_SEGMENTS;

export const LEGACY_ADMIN_SEGMENTS: Record<string, string> = {
  login: ADMIN_SEGMENTS.login,
  clients: ADMIN_SEGMENTS.clients,
  services: ADMIN_SEGMENTS.services,
  technologies: ADMIN_SEGMENTS.technologies,
  content: ADMIN_SEGMENTS.content,
  products: ADMIN_SEGMENTS.products,
  pricing: ADMIN_SEGMENTS.pricing,
  blog: ADMIN_SEGMENTS.blog,
  chat: ADMIN_SEGMENTS.chat,
  new: "uusi",
};

export function adminBase(locale: Locale): string {
  return locale === "fi" ? "/admin" : `/${locale}/admin`;
}

export function adminHref(
  locale: Locale,
  module: AdminModule,
  suffix?: string,
): string {
  const segment = ADMIN_SEGMENTS[module];
  return [adminBase(locale), segment, suffix]
    .filter(Boolean)
    .join("/")
    .replaceAll("//", "/");
}

export function localeFromAdminPath(pathname: string): Locale {
  if (pathname.startsWith("/en/")) return "en";
  if (pathname.startsWith("/ru/")) return "ru";
  return "fi";
}


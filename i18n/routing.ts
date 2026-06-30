import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fi", "ru"],
  defaultLocale: "en",
  // Every locale is prefixed (/en, /fi, /ru) for clean hreflang + local SEO.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

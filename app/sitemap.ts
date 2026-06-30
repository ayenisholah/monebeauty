import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { TREATMENT_SLUGS } from "@/content/treatments";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_PATHS = [
  "",
  "/about",
  "/services",
  "/pricing",
  "/blog",
  "/contact",
  "/booking",
  "/privacy-policy",
  "/terms-of-use",
  "/cookies-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PATHS,
    ...TREATMENT_SLUGS.map((slug) => `/services/${slug}`),
  ];

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE}/${l}${path}`]),
        ),
      },
    })),
  );
}

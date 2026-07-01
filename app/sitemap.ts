import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { childSlugs } from "@/content/pages";
import { PRODUCT_SLUGS } from "@/content/products";
import { absoluteLocalizedUrl, siteUrl } from "@/lib/seo";

const SITE = siteUrl();

const STATIC_PATHS = [
  "",
  "/about",
  "/trichology",
  "/arosha",
  "/services",
  "/catalog",
  "/booking",
  "/privacy-policy",
  "/terms-of-use",
  "/cookies-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PATHS,
    ...childSlugs("instrumental").map((s) => `/instrumental/${s}`),
    ...childSlugs("services").map((s) => `/services/${s}`),
    ...PRODUCT_SLUGS.map((s) => `/catalog/${s}`),
  ];

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteLocalizedUrl(SITE, path || "/", locale),
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          [
            ...routing.locales.map((l) => [
              l,
              absoluteLocalizedUrl(SITE, path || "/", l),
            ]),
            [
              "x-default",
              absoluteLocalizedUrl(SITE, path || "/", routing.defaultLocale),
            ],
          ],
        ),
      },
    })),
  );
}

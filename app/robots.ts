import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const SITE = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/en/admin/",
        "/ru/admin/",
        "/henkilosto/",
        "/en/henkilosto/",
        "/ru/henkilosto/",
        "/oma-tili/",
        "/en/oma-tili/",
        "/ru/oma-tili/",
        "/api/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}

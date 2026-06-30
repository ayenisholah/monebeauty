# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Progress maps to the phases in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## [Unreleased]

### Phase 0 — Scaffold

- Scaffolded Next.js 16 (App Router) + TypeScript + Tailwind v4 + ESLint via
  `create-next-app`, preserving the existing project docs.
- Added dependencies: `next-intl`, `@phosphor-icons/react`, Prisma 6 (`prisma`,
  `@prisma/client`), `tsx`, Prettier (+ tailwind plugin).
- Wired brand fonts with `next/font` — Cormorant Garamond (display) + Jost (sans)
  exposed as CSS variables (`lib/fonts.ts`).
- Translated the design system (`design_handoff/01-design-system.md`) into Tailwind v4
  `@theme` tokens in `app/globals.css` — full color palette, fluid `clamp()` type
  scale, radii, warm shadows; runtime-switchable `--accent` / `--radius`; base reset,
  `::selection`, chat-pulse keyframes, and a `prefers-reduced-motion` guard.
- Authored the full Prisma schema (`prisma/schema.prisma`) covering services/CMS,
  e-commerce, booking, staff scheduling, CRM, blog, chatbot, GDPR/audit — **no
  migration run** (live DB deferred to Phase 2/3). Added `lib/db.ts` singleton.
- Added `content/site.ts` (brand + real Helsinki NAP + nav), `.env.example`,
  `.prettierrc`, npm scripts (`format`, `db:*`).
- Git: initialized repo; git-ignored the two reference folders
  (`design_handoff_mone_beauty_clinic/`, `scraped_content/`) and `.env*`.
- Verified: `prisma validate`, `prisma generate`, and `next build` all pass.

### Phase 1 — MVP marketing site (tri-lingual)

- **i18n**: `next-intl` routing for `en` / `fi` / `ru` with locale-prefixed routes,
  `proxy.ts` (Next 16) middleware, `hreflang` alternates, and a header language
  switcher that preserves the current path. Message catalogs for all three locales
  (EN complete; FI/RU best-effort, flagged `[TODO: clinic review]`).
- **Design-system components**: `Button` (4 variants), `Eyebrow`, `SectionHeading`,
  `Card`, `FeatureItem`, `ImageSlot`, `Container`, `LanguageSwitcher`, `ChatWidget`
  FAB, Phosphor thin icons — built to the `01-design-system.md` tokens. Plus a
  `/styleguide` reference page.
- **Layout shell**: sticky blurred `Header` with desktop nav + `<900px` `MobileMenu`,
  dark 4-column `Footer`, chat FAB — wired into the locale layout.
- **Homepage**: Hero + 5-item advantages strip, TreatmentsGrid, AboutBlock, TechWall,
  dark CTABand, FeaturesStrip — recreated from `03-homepage-spec.md`.
- **Service pages**: one `ServiceTemplate` (13 content blocks) driving all **9
  treatments** at `/services/[slug]` (+ services index), with content seeded from
  `scraped_content` where it maps and `[CLINIC TO PROVIDE]` fallbacks elsewhere. No
  invented medical claims.
- **Marketing & legal**: About, Pricing, Contact (form preview + map + GDPR consent),
  Blog (+ article route, empty state), Booking placeholder, and Privacy / Terms /
  Cookies pages — all localized.
- **SEO**: per-page metadata + `hreflang`, `MedicalProcedure` / `FAQPage` /
  `BreadcrumbList` JSON-LD on service pages, `MedicalClinic` JSON-LD with the real
  Helsinki NAP on the homepage, `sitemap.xml`, and `robots.txt`.
- Added Prettier config + `.prettierignore`; ESLint ignores the reference folders.
- Verified: `next build` (all routes prerendered across 3 locales), `next lint`, and
  a production-server smoke test (locale redirect, FI/RU rendering, JSON-LD, sitemap).

# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Progress maps to the phases in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## [Unreleased]

### Phase 4 — Staff schedule

- Added an internal `/staff` schedule surface for selecting practitioner/date, reviewing
  daily slots, seeing booked appointment/client details, and saving open/closed slots.
- Added `/api/staff/schedule` to read daily schedule data, persist day-level availability,
  and apply working-hour patterns over a future date range.
- Added shared staff schedule helpers for normalized working hours, generated slots, and
  booked-slot overlays from appointments.
- Added EN/FI/RU staff schedule UI copy. Auth/RBAC remains deferred to Phase 5.

### Phase 3 — Booking upgrade

- Upgraded the booking flow from lean single-practitioner booking to a four-step
  Service → Specialist → Time → You wizard with a "no preference" specialist option.
- Added practitioner-aware slot lookup backed by Prisma `Availability.slots` when present,
  with generated business-hour fallback and non-cancelled appointment overlap filtering.
- Added `GET /api/booking/practitioners`, upgraded `GET /api/booking/slots`, and upgraded
  `POST /api/booking` to revalidate the selected practitioner/slot at submit time.
- Added lightweight cancel and reschedule endpoints using appointment reference plus
  matching contact detail.
- Updated `prisma/seed.ts` to connect bookable services to the default practitioner and
  create near-term development availability.

### Phase 2 — E-commerce cart & checkout

- Implemented real cart state for the AROSHA/DIXIDOX catalog with `localStorage` persistence,
  add-to-cart buttons, and a live header basket count.
- Replaced the `/basket` placeholder with line items, quantity controls, remove actions,
  item count, subtotal, and a checkout entry point.
- Added `/checkout`, `POST /api/checkout`, and `/order/[id]`: checkout captures client
  details + GDPR consent, recalculates product totals server-side, self-heals Prisma
  `Product` rows, and persists `Client`, `Order`, `OrderItem`, and `Consent` rows.
- Added localized EN/FI/RU cart, checkout, and order confirmation UI. Payment capture and
  confirmation email remain deferred.

### Live-site mirror — real content, media & IA

- **Reoriented the app to mirror the live site** (`monebeauty.fi` = Mone Beauty Club):
  brand, IA, pages, links, logo, and favicon now come from `scraped_content/`.
- **Content pipeline:** `scripts/gen-content.mjs` bakes real per-locale copy (15 content
  pages + 31 products, EN/FI/RU) into committed `content/generated/*.json`;
  `scripts/copy-media.mjs` copies referenced images, the hero video, `logo.svg`, and
  `favicon.ico` into `public/media/**`. Page bodies render via `react-markdown`.
- **Real media everywhere** — replaced gradient placeholders with real photos/video
  (homepage hero video, featured-service images, product photos).
- **Live IA & nav:** header with dropdowns (Instrumental cosmetology, Services), cart,
  "Book time"; footer with opening hours "By agreement". New routes: `/instrumental/[slug]`,
  `/trichology`, `/arosha`, `/services` + 8 subpages, `/catalog` (+ 31 product pages),
  `/basket`. Retired the clinic-only pages (9 treatments, pricing, blog, contact).
- **Homepage** rebuilt: serif brand hero over the real treatment video, 3 featured services,
  and the AROSHA product grid (8) → "See more" → `/catalog`.
- Brand switched to **Mone Beauty Club** (real `logo.svg` + `favicon.ico`); i18n messages
  trimmed to UI chrome (real translations, no `[TODO]`). Sitemap updated to the live routes.
- Updated governance docs (`REQUIREMENTS`, `IMPLEMENTATION_PLAN`, `CLAUDE`, `AGENTS`): new
  source-of-truth hierarchy (scraped = IA+content+media; handoff = visual design only) and a
  binding content-sourcing rule.
- Verified: `next build` (all live routes prerender across 3 locales — 93 product pages),
  `next lint`, and a production smoke test (real logo/hero video, dropdowns, catalog, FI/RU).

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

# Implementation Plan — Mone Beauty

> Binding build roadmap. Pairs with [`REQUIREMENTS.md`](./REQUIREMENTS.md). Phases run in
> order; each builds on the last. **Commit after each phase.** Key direction: the app
> realizes the **client brief** (`SCOPE.md` = **Mone Beauty Clinic**, aesthetic medicine);
> `SCOPE.md` governs brand/positioning/IA/features, the design handoff supplies visual
> styling + structure, and **existing-page copy, images, and video come from
> `scraped_content/`**. **Prisma + custom admin (no Payload)**; **e-commerce is in scope**.
> **Current completed milestone: Phase 8 SEO + GDPR finalize.** Phase 6 notifications/reminders
> were intentionally skipped for now; payment capture and transactional email/SMS remain deferred.

## Content & media pipeline (from the live site)

- `scripts/gen-content.mjs` parses `scraped_content/{en,fi,ru}/*.md` → committed
  `content/generated/{pages,products,assets}.json` (image srcs rewritten to `/media/...`).
- `scripts/copy-media.mjs` copies referenced assets + hero video + logo + favicon into
  committed `public/media/**`, `public/logo.svg`, `app/favicon.ico`.
- Page bodies render via `components/Markdown.tsx` (`react-markdown` + `remark-gfm`).
- `scraped_content/` stays git-ignored; re-run both scripts to refresh content/media.

## Stack (locked)

Next.js (App Router) · TypeScript · Tailwind (tokens from `01-design-system.md`) · Prisma ·
PostgreSQL · `next-intl` (ru/fi/en) · `@phosphor-icons/react` (thin) · `next/font`
(Cormorant Garamond + Jost) · Anthropic Claude API · Resend/Postmark (email) · Twilio/FI
gateway (SMS) · GA4 + Search Console + `next-sitemap`.

## Project structure (target)

```
app/
  [locale]/
    page.tsx (home), about, instrumental/[slug], trichology, arosha,
    services, services/[slug], catalog, catalog/[slug], basket, booking,
    privacy-policy, terms-of-use, cookies-policy
    (later)     shop cart/checkout/order, account, staff
    (account)/    account            # client: appointments, orders, profile
    (staff)/      staff              # staff schedule
  admin/                            # custom Prisma-backed admin + CRM
  api/            booking, chat, checkout, webhooks (email/sms)
  styleguide/                       # component + token showcase
components/
  ui/        Button, Eyebrow, SectionHeading, Card, FeatureItem, ImageSlot,
             LanguageSwitcher, ChatWidget
  layout/    Header, Footer, MobileMenu
  marketing/ Hero, TreatmentsGrid, AboutBlock, TechWall, CTABand, FeaturesStrip
  shop/      ProductCard, ProductGrid, CartLineItem, CheckoutForm
  booking/   Wizard, Calendar, SlotPicker
  staff/     ScheduleCalendar, WorkingHoursEditor
  admin/     CollectionTable, RecordEditor, ClientSearch
lib/         tokens.ts, seo.ts, i18n.ts, db.ts (Prisma client), ai.ts (Claude client),
             auth.ts, mail.ts, sms.ts
prisma/      schema.prisma, seed.ts
messages/    ru.json, fi.json, en.json
content/     seed copy/images derived from scraped_content/
```

## Prisma data model (core entities)

```
User            id, email, passwordHash?, role(admin|staff|client), locale
Service         id, slug, category, priceFrom, heroImage(alt), order, published
TreatmentContent serviceId, locale, h1, shortDesc, whatItIs, suitableFor[], benefits[],
                 processSteps[], safety, preCare, postCare, contraindications[],
                 sessions, results, faq[{q,a}], seo{title,description,ogImage}
Product         id, slug, name(i18n), size, price, images[], description(i18n),
                category(AROSHA_BODY|DIXIDOX_TRICHO), published
Cart / CartItem  cartId, productId, qty
Order / OrderItem id, clientId?, items[], totals, status, consent, createdAt
Practitioner    id, name, role, services[]
StaffUser       id, userId, practitionerId, workingHours, daysOff
Availability    practitionerId, date, slots[{start,end,status(open|closed|booked)}]
Appointment     id, clientId, practitionerId, serviceId, start, end,
                status(booked|confirmed|completed|cancelled|rescheduled), channel,
                notes, history[]
Client (CRM)    id, fullName, phone, email, appointments[], orders[], notes,
                contraindications(sensitive), consent{gdpr,marketing}, cancelHistory[]
Article         id, slug, title(i18n), body(i18n), cover(alt), seo, publishedAt
PricingItem     serviceId?, label, price, unit, category
ChatSession     id, locale, messages[], handoffRequested, clientId?
Consent / AuditLog  actor, action, entity, at   # GDPR + medical-field audit
```

---

## Phase 0 — Scaffold

Init Next.js (App Router) + TS + Tailwind + ESLint/Prettier. Add `next/font` (Cormorant +
Jost), `@phosphor-icons/react`, Prisma + Postgres (`DATABASE_URL`), `next-intl`. Translate
`01-design-system.md` into the Tailwind theme + CSS variables (`accent`, `--radius`); global
reset (box-sizing, `::selection` `#E7D9C4`, link color inherit) + `prefers-reduced-motion`
guard. **Verify:** `npm run dev` boots; theme tokens resolve; Prisma connects.

## Phase 1 — MVP ⭐ (ship target)

**Goal:** tri-lingual, responsive marketing site, pixel-matched to the prototype.

- **UI primitives** (`components/ui`) + `/styleguide` page — Button variants, Eyebrow,
  SectionHeading, Card, FeatureItem, ImageSlot (`next/image`), LanguageSwitcher.
- **Layout shell + i18n** — Header (sticky, blurred, logo + nav + Book Online + switcher),
  MobileMenu (<900px hamburger), Footer (4-col + legal bar), ChatWidget FAB shell;
  `next-intl` locale routing (ru/fi/en); nav per `02-information-architecture.md`.
- **Homepage** — recreate `03-homepage-spec.md` exactly (Hero + 5 advantages, TreatmentsGrid,
  AboutBlock, TechWall, dark CTABand, FeaturesStrip); verify vs `assets/mone-*.png` at
  390/768/1280.
- **Service template + 9 treatments + `/services` index** — one template, 13 blocks (`04`),
  JSON-LD + hreflang; seed content from `scraped_content` per the §6 map, gaps marked
  `[CLINIC TO PROVIDE]`.
- **Remaining marketing** — About, Pricing, Contact (form + map + hours + consent), Blog +
  `/blog/[slug]`, legal pages.
- **Baseline SEO** — per-page title/meta/alt, ordered headings, real NAP.
- **Verify:** Lighthouse on marketing pages; visual diff vs PNGs; all three locales render.

## Phase 2 — E-commerce (AROSHA shop) ✅ implemented

Existing live IA routes are used: `/catalog`, `/catalog/[slug]`, `/basket`, `/checkout`,
`/order/[id]`. The 31 products + images come from `scraped_content` via the generated
registry. Cart state is client-side (`localStorage`), checkout captures GDPR consent,
server-side totals are recalculated from the product registry, and Prisma persists `Client`,
`Product`, `Order`, `OrderItem`, and `Consent`. Payment capture and confirmation email are
deferred. **Verify:** browse → add to cart → checkout → order persists + confirmation page;
mobile layout at 390px.

## Lean Booking (one-click) ✅ implemented at reduced scope

**Goal:** the SCOPE.md priority — open the site, **select a service in one click, book fast**.
Ships ahead of the full Phase 3, reusing that data model at reduced scope.

- **Bookable-services registry** (`content/booking-services.ts`) derived from the existing
  real service pages; SCOPE extras (Injectable, Consultation) as `[CLINIC TO PROVIDE]` stubs.
- **DB**: run `prisma migrate` against `DATABASE_URL`; `prisma/seed.ts` seeds one default
  `Practitioner` + `Service` rows from the registry.
- **Slots** (`lib/booking.ts`): simple business-hours slot generation minus already-booked
  `Appointment` starts (no per-practitioner `Availability` yet).
- **API**: `POST /api/booking` (upsert `Client`, create `Appointment` + `Consent`, reject
  double-book) and `GET /api/booking/slots`.
- **Wizard** (`components/booking/BookingWizard.tsx`): **Service → Time → You**, one-tap
  select-and-advance, `?service=<key>` preselect, GDPR consent, on-screen confirmation.
- **One-click entry points**: `Book` buttons on `/services/[slug]` + a home "Choose a
  service" selectable grid deep-linking `/booking?service=<key>`; trim homepage length.
- **Upgraded in Phase 3**: practitioner/no-preference selection, `Availability`-aware slots,
  and lightweight reschedule/cancel endpoints. Email/SMS + reminders remain deferred to
  Phase 6. **Verify:** e2e a booking persists; double-book rejected; 390px first.

## Phase 3 — Booking (client wizard) ✅ implemented

Booking data model (Practitioner, Availability, Appointment, Client). Wizard per
`05-platform-features.md §1`: treatment → practitioner/no preference → date/time (open slots
only) → details (create/match client) → confirm + consent → confirmation. Slot lookup uses
`Availability.slots` when present, falls back to generated business-hours slots while staff
UI is absent, and rejects appointment overlaps. Lightweight cancel/reschedule endpoints exist
using appointment reference + matching contact detail. **Verify:** slot generation,
double-booking prevention, e2e booking, cancel, and reschedule.

## Phase 4 — Staff schedule (`/staff`) ✅ implemented

Internal staff schedule area: practitioner/date selector, daily schedule view, working-hours
range editor, open/closed slot controls, and booked appointment details. Staff edits persist
to `Availability.slots` and are reflected in the client booking wizard. Staff/admin auth,
role gating, and own-schedule restriction are implemented in Phase 5; notifications are
deferred to Phase 6.
**Verify:** staff edits availability → reflected in client wizard.

## Phase 5 — CRM + custom admin + auth ✅ implemented

Custom Prisma-backed auth uses `User.passwordHash` plus durable `Session` rows and an
HTTP-only session cookie. Admin/staff roles are enforced: `/admin` is admin-only, `/staff`
and `/api/staff/schedule` require staff/admin, and staff users are limited to their linked
`Practitioner`. `/admin` includes CRM client search/profile editing, audited
contraindication access/edits, service/product/pricing/blog management, and editable
`ContentPage` overrides seeded from generated scraped content. Public pages and catalog
prefer Prisma edits with generated JSON fallback. **Verify:** role gating enforced;
medical-field access audited; admin edits appear on site after migration + content sync.

## Phase 6 — Notifications + reminders ⏭️ skipped/deferred

Email (Resend/Postmark) + SMS (Twilio/FI gateway). Booking confirmations (email + SMS,
SMS preferred) + reminders at 24h and 2h via a scheduled job; staff new-booking alerts;
order confirmations. This phase is intentionally skipped for now per user direction; it
should be resumed after the chatbot milestone. **Verify:** confirmation + scheduled reminder
fire; consent respected.

## Phase 7 — AI chatbot ✅ implemented

Claude API integration with locale-matched RU/FI/EN responses, system prompt grounded in
approved CMS/generated content, product content, booking registry, and clinic contact facts.
The public chat FAB now supports GDPR consent, transcript persistence in `ChatSession`,
booking deep-links for detected services, and human handoff. `/admin/chat` provides the
handoff queue and transcript detail with resolve/reopen actions. **Verify:** answers from
content only; handoff creates an admin queue item.

## Phase 8 — SEO + GDPR finalize ✅ implemented

`next-sitemap` XML sitemap + robots.txt; GA4 + Search Console; `LocalBusiness`/`MedicalClinic`
JSON-LD with Helsinki NAP + hours. Cookie-consent banner; data access/erase/export; EU
residency; SSL. Run Lighthouse and fix Core Web Vitals across marketing pages.
Implemented sitemap/robots hardening, richer `MedicalClinic` JSON-LD, GA4 loading gated by
cookie consent, localized cookie banner, non-placeholder legal pages, and admin GDPR client
export/anonymization tools. Lighthouse/Rich Results/Search Console validation remains a
deployment/manual verification task. **Verify:** sitemap valid; JSON-LD passes Rich Results
test; Lighthouse ≥ targets.

---

## Cross-cutting guardrails (every phase)

- Match the prototype precisely (exact tokens; reference the PNGs) — this is hi-fi.
- **Mobile-first** — verify at 390px first.
- **No invented medical content** — structure + `[CLINIC TO PROVIDE]` placeholders; seed from
  scraped copy as draft for clinic review.
- EU/GDPR for personal + medical data; strict access control.
- Performance — keep marketing pages SSG/SSR and lean; lazy-load images.
- Use real NAP from `scraped_content`; keep brand name in one config constant.

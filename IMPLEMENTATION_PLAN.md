# Implementation Plan — Mone Beauty

## Stripe website payments (owner-approved, 2026-07-19) ✅ implemented

- Replace unpaid order requests with Stripe-hosted Checkout for website-originated physical
  products, gift cards, and prepaid treatment vouchers; retain server-owned prices and GDPR
  checkout consent.
- Reconcile payments, delayed methods, expiry, and full/partial refunds through signed,
  idempotent Stripe webhooks and durable Prisma payment/event records.
- Secure Stripe's return link with a per-attempt hashed cancellation token, explicitly expire
  abandoned Sessions, and expose a localized Awaiting payment admin badge/filter.
- Add free clinic pickup or one Dashboard-managed Finland shipping rate, automatic balance
  gift cards and single-use treatment vouchers, admin redemption/refunds, and localized
  payment/fulfilment/refund notifications.
- Keep appointment booking entirely outside Stripe: in-person appointments are paid at the
  clinic and never receive Stripe invoices or follow-up charges.

## Account portals, staff RBAC, and audit (owner-approved, 2026-07-19) ✅ implemented

- Add optional verified client accounts under `/oma-tili`, secure guest-appointment claims,
  isolated past/upcoming procedure history, and admin-reviewed change requests.
- Add separate staff login, admin-managed temporary credentials, forced first-login password
  replacement, account disable/reset/session revocation, and no staff confirmation email.
- Give staff audited assigned-calendar operational access: create, edit, confirm, complete,
  cancel, and reschedule appointments for their linked employee while restricting working
  hours and availability changes to their own linked employee.
- Keep website content, pricing, service/resource setup, CRM administration, staff accounts,
  and every other clinic configuration mutation admin-only at the server boundary.
- Add admin staff management and immutable security/access audit views with filters and CSV
  export; retain audit records until a legally reviewed clinic policy replaces that default.

## Shared employee calendar (owner-approved, 2026-07-19) ✅ implemented

- Add localized `/admin/kalenteri` navigation and reuse the calendar presentation at
  `/henkilosto` with role-specific data and controls.
- Replace the synthetic default-provider assignment with a fixed primary employee per
  service plus qualified internal backups; preserve historical relations.
- Add admin setup for employees, working hours, rooms, physical devices, and service/resource
  mappings.
- Render Timma-inspired day/week/month views with all employees visible, availability
  backgrounds, client/procedure/room/time cards, and confirmed drag-to-move behavior.
- Add a persistent Create appointment action and empty-time click creation with CRM client
  search/inline creation, confirmed staff bookings, lifecycle editing, auditing, and localized
  durable notifications.
- Enforce employee, room, and device overlap protection in shared booking logic and PostgreSQL.
- Persist canonical weekly hours on each employee, batch-resolve working dates, crop shared
  day/week grids to the selected employees' open-time union, and disable unavailable picker dates.
  Scheduling time controls expose open covered slots only; the hours editor retains a full-day
  override and out-of-hours legacy appointments remain visible in an exception row.

## Timma-style calendar and internal blocks (owner-approved, 2026-07-21) ✅ implemented

- Rework `/admin/kalenteri` into a dense full-height day/week/month workspace with generated
  employee filters, sticky axes, bilateral time labels, union-of-working-hours cropping, month
  overflow, responsive horizontal scrolling, and persisted three-level zoom.
- Add a desktop draggable internal-service palette and mobile horizontal tray with selection plus
  click placement as the touch/keyboard fallback.
- Add localized `CalendarBlockTemplate`, `CalendarBlockSeries`, `CalendarBlock`,
  `CalendarBlockItem`, and `CalendarBlockParticipant` Prisma models and seed the five approved
  60-minute templates separately from clinical services.
- Implement the localized Booking info modal, sequential items and duration math, optional single
  room/device reservation, weekday recurrence, occurrence preview, 12-month/500-occurrence
  limits, admin multi-employee and staff-own-only permissions.
- Add atomic block create/update/cancel APIs with occurrence/future scope, soft cancellation,
  optimistic versions, audit logging, and admin-only template configuration.
- Centralize appointment/block employee, room, and device conflict checks and PostgreSQL advisory
  locks; apply them to public and internal appointment creation and rescheduling paths.
- Cover recurrence, snapping, durations, localization, limits, RBAC, concurrency, availability,
  automatic practitioner roster population, responsive interaction, lint, typecheck, and build.

## Client account and integration observability expansion (owner-approved, 2026-07-19)

- Redesign `/oma-tili` into overview, appointments, orders, addresses, and profile views; expose
  verified identity details, audited profile edits, paginated history, and secure order ownership.
- Add reusable Finland saved addresses and authenticated booking/checkout prefilling. Preserve an
  immutable order address snapshot and never write Stripe's final address back to the address book.
- Render rich localized booking emails with appointment, practitioner, clinic, policy, map,
  calendar, pay-at-clinic, and secure management details.
- Add redacted durable request/response attempt logs for messaging, Stripe, Anthropic, and
  Cloudinary, an admin viewer, and a daily 30-day cleanup command.

## Superseded public specialist selection removal (owner-approved, 2026-07-17)

The public wizard is **Service -> Time -> You**. Contextual links and valid homepage
handoffs open directly at Time; service changes retain the chosen date, clear the slot, and
reload availability. Public slot lookup and appointment creation ignore legacy
practitioner values and resolve the exact **Mone Beauty Clinic** scheduling resource
server-side, connecting it to the requested bookable service when needed. Practitioner IDs
remain stored only as an internal persistence relation for availability and overlap
prevention. The obsolete practitioner endpoint and every practitioner selector are removed;
historical appointment relations remain intact. No Prisma migration is required.

## Themed form controls (owner-approved, 2026-07-18)

All form dropdowns use the shared themed listbox, and all date/time selection uses the
booking-style calendar and time chips. Compact admin, staff, and homepage fields open the
calendar in a popover; the main booking calendar remains inline. Native select/date/time
controls are not used in application forms.

## Homepage reference match (owner-approved, 2026-07-12)

The localized homepage uses `index.html` as its superseding visual/content specification,
including its owner-approved medical and licensing language. It retains the production cart,
localized routes, booking handoff, legal links, and GDPR/AI chat beneath that presentation.

## Finnish public route migration (owner-approved, 2026-07-17)

Use the same Finnish path segments in FI/EN/RU for every user-facing route. Move public pages
to the canonical Finnish IA, permanently redirect the legacy English IA, migrate Prisma
service/technology `publicPath` values, and update navigation, content links, notifications,
SEO, sitemap, and revalidation. Keep `/api`, `/admin`, dynamic product/article slugs, record
IDs, and booking query values stable. The header cart links to `/ostoskori` and displays the
persisted total quantity.

> Binding build roadmap. Pairs with [`REQUIREMENTS.md`](./REQUIREMENTS.md). Phases run in
> order; each builds on the last. **Commit after each phase.** Key direction: the app
> realizes the **client brief** (`SCOPE.md` = **Mone Beauty Clinic**, aesthetic medicine);
> `SCOPE.md` governs brand/positioning/IA/features, the design handoff supplies visual
> styling + structure, and **existing-page copy, images, and video come from
> `scraped_content/`**. **Prisma + custom admin (no Payload)**; **e-commerce is in scope**.
> **Current operations milestone: admin Orders + Appointments.** The dashboard and sidebar
> route to dedicated Finnish-segment queues, lifecycle actions are audited, checkout/booking
> receipts are distinct from clinic confirmation, and Resend/Sinch delivery attempts plus
> custom transactional messages are retained per record.
>
> **Current completed milestone: Stripe website payments.** Hosted Checkout, webhook payment
> reconciliation, vouchers, pickup/shipping, refunds, and notifications are implemented;
> live Stripe Dashboard configuration remains a deployment task.

## Phase 9 — localized admin and database-owned content (in progress)

- Split locale routes into public and admin groups so the admin has its own HTML/application
  shell and never inherits public chrome, cart, chatbot, consent, or analytics.
- Use Finnish admin segments across FI/EN/RU: `asiakkaat`, `ajanvaraukset`, `tilaukset`,
  `palvelut`, `teknologiat`, `sisalto`, `tuotteet`, `hinnasto`, `artikkelit`,
  `keskustelut`, `kirjaudu`, and `uusi`.
  Permanently redirect legacy English admin URLs.
- Add the localized responsive admin sidebar/drawer, persistent desktop icon-rail collapse,
  `Admin` translations, context-preserving locale switcher, dashboard
  warnings/metrics/audits/quick actions, and localized CRUD.
- Evolve Prisma with `PublicationStatus`, strict per-locale publication, dedicated
  `Technology` content, localized pricing, archive metadata, extended service/product
  metadata, and deletion guards. Every mutation is authorized, validated, audited, and
  revalidated; media is restricted to `/media/**`.
- Replace runtime generated-registry reads with shared Prisma repositories for public pages,
  homepage, catalog, booking, pricing/blog consumers, notifications, and chatbot knowledge.
  Generated JSON becomes bootstrap/import-only. Routine sync is insert-only; `--force`
  explicitly refreshes existing imported records.
- Backfill existing localized content and real media. Verify migrations/seed, legacy
  redirects, locale isolation, CRUD/archive/delete/anonymization, booking/cart regressions,
  390/768/899/900/desktop sidebar access and persisted collapse, lint, type-check, tests, and
  production build.
- Migrate every public page to its canonical Finnish route, add locale-preserving 308 legacy
  redirects, and centralize paths so public navigation, SEO, email/chat links, and Prisma
  `publicPath` values cannot drift.

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
    (admin)/admin/                  # localized Finnish-path custom admin + CRM
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
Service         id, slug, publicPath, category, duration, bookable, priceFrom, images,
                order, archivedAt; locale TreatmentContent has DRAFT/PUBLISHED status
TreatmentContent serviceId, locale, h1, shortDesc, whatItIs, suitableFor[], benefits[],
                 processSteps[], safety, preCare, postCare, contraindications[],
                 sessions, results, faq[{q,a}], seo{title,description,ogImage}
Technology      id, slug, publicPath, images, order, relatedServiceId?, archivedAt;
                TechnologyContent(locale, name, specification, body, SEO, status)
Product         id, slug, size, price, currency, images[], category, order, archivedAt;
                ProductContent(locale, copy, image alt, SEO, status)
Cart / CartItem  cartId, productId, qty
Order / OrderItem id, clientId?, items[], totals, status, consent, createdAt
Practitioner    id, name, role, services[]
StaffUser       id, userId, practitionerId, workingHours, daysOff
Availability    practitionerId, date, slots[{start,end,status(open|closed|booked)}]
Appointment     id, clientId, practitionerId, serviceId, start, end,
                status(booked|confirmed|completed|cancelled|rescheduled), channel,
                notes, procedureIndex?, procedureTitle?, procedurePrice?, history[]
Client (CRM)    id, fullName, phone, email, appointments[], orders[], notes,
                contraindications(sensitive), consent{gdpr,marketing}, cancelHistory[]
Article         id, slug, cover, order, archivedAt; ArticleContent(locale, body, SEO, status)
PricingItem     serviceId?, category, price, order; PricingContent(locale,label,unit,status)
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

Canonical Finnish shop routes are used: `/verkkokauppa`, `/verkkokauppa/[slug]`,
`/ostoskori`, `/kassa`, `/tilaus/[id]`. The 31 products + images come from
`scraped_content` via the generated
registry. Cart state is client-side (`localStorage`), checkout captures GDPR consent,
server-side totals are recalculated from the product registry, and Prisma persists `Client`,
`Product`, `Order`, `OrderItem`, and `Consent`. Stripe payment capture, refunds, vouchers,
shipping/pickup, and paid-order notifications are completed in the Stripe milestone above.
**Verify:** browse → add to cart → checkout → order persists + confirmation page;
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
- **Upgraded in Phase 3**: `Availability`-aware slots and lightweight reschedule/cancel
  endpoints while the public flow retains automatic clinic assignment. Email/SMS
  confirmations and reminders are
  implemented in Phase 6. **Verify:** e2e a booking persists; double-book rejected; 390px
  first.

## Phase 3 — Booking (client wizard) ✅ implemented

Booking data model (Practitioner, Availability, Appointment, Client). Public wizard:
treatment → date/time (open slots only) → details (create/match client) → confirm + consent
→ confirmation. New public bookings use the exact **Mone Beauty Clinic** practitioner;
specialist selection and provider details are not exposed to customers.
Slot lookup uses `Availability.slots` when present, falls back to generated business-hours
slots while staff UI is absent, and rejects appointment overlaps. Lightweight
cancel/reschedule endpoints move actively rescheduled appointments onto the shared clinic
schedule and use the appointment reference + matching contact detail. **Verify:** slot generation, forced default
assignment despite forged practitioner input, double-booking prevention, e2e booking,
cancel, and reschedule.

### Dedicated booking routing and procedure context

- Route every active public Book/Book Online CTA to localized `/booking`; generic actions
  open service selection, service/technology actions pass `service`, and procedure cards pass
  a one-based `procedure` index.
- Centralize parsing of procedures from localized published service content. Resolve URL and
  API context against that shared source, never browser-supplied display values.
- Show the selected service/procedure summary above the wizard and preserve valid context on
  locale changes. Changing service clears procedure context and updates the booking URL.
- Hand the retained homepage form into the wizard once through expiring, versioned,
  tab-scoped storage; never place personal data in a URL.
- Persist nullable procedure index/title/price snapshots on `Appointment` and surface them in
  confirmation, staff schedule, CRM history, email/SMS reminders, and staff alerts, with
  service-only fallback for existing appointments.
- Verify generic/service/procedure/invalid URL paths, EN/FI/RU switching, 390px and desktop
  context cards, one-time/expired form handoff, server validation, migration, legacy
  appointments, formatting, lint, types, tests, and production build.

## Phase 4 — Staff schedule (`/staff`) ✅ implemented

Internal staff schedule area: themed date selector, daily schedule view, working-hours
range editor, open/closed slot controls, and booked appointment details. Staff edits persist
to canonical `Practitioner.workingHours` plus generated `Availability.slots` and are reflected
in the client booking wizard. Calendars and scheduling pickers suppress non-working choices;
explicit per-date availability overrides weekly hours.
Staff/admin auth and role gating are implemented in Phase 5; staff new-booking
alerts are implemented in Phase 6.
**Verify:** staff edits availability → reflected in client wizard.

## Phase 5 — CRM + custom admin + auth ✅ implemented

Custom Prisma-backed auth uses `User.passwordHash` plus durable `Session` rows and an
HTTP-only session cookie. Admin/staff roles are enforced: `/admin` is admin-only, `/staff`
and `/api/staff/schedule` require staff/admin, and staff users are limited to their linked
`Practitioner`. `/admin` includes CRM client search/profile editing, audited
contraindication access/edits, service/product/pricing/blog management, and editable
`ContentPage` overrides seeded from generated scraped content. Public pages and catalog
prefer Prisma edits with generated JSON fallback. Staff-account creation automatically creates
and links the employee calendar profile. Admins can list all staff, reveal newly entered
temporary passwords, reset passwords, revoke sessions or access, reactivate accounts, inspect
audit history, and delete credentials without deleting clinical/calendar history. **Verify:** role gating enforced;
medical-field access audited; admin edits appear on site after migration + content sync.

## Phase 6 — Notifications + reminders ✅ implemented

Email (Resend/Postmark) + SMS (Twilio/FI gateway). Booking confirmations (email + SMS,
SMS preferred) + reminders at 24h and 2h via a scheduled job; staff new-booking alerts;
order confirmations. Implemented with `lib/notifications.ts`, provider env configuration,
non-blocking booking/checkout notification sends, `AuditLog` delivery records, and
`npm run notifications:reminders` for cron/PM2 scheduling. Paid-order and refund messages
are extended by the Stripe website-payment milestone.
**Verify:** confirmation + scheduled reminder fire; consent respected.

Admin confirmation sends localized email and SMS for orders and appointments. Resend requests
use idempotency keys; Sinch Conversation API uses production OAuth. Outbound message content
and every provider attempt are stored for channel-specific retry without duplicating accepted
sends. Customer reschedule/cancellation and scheduled reminders share this history.

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

### Owner-approved homepage editorial redesign (2026-07-12)

Replace the original homepage composition with the `index.html`-inspired sequence: hero,
Standard of Care, clinical services, alternating technologies, product tabs, booking picker,
and clinic standard/contact. Use server-rendered sections with small tab and picker client
islands. Preserve real localized content/media, cart, booking, JSON-LD, shell, and a11y.
Verify at 390, 768, 900, and 1280 pixels.

- Match the prototype precisely (exact tokens; reference the PNGs) — this is hi-fi.
- **Mobile-first** — verify at 390px first.
- **No invented medical content** — structure + `[CLINIC TO PROVIDE]` placeholders; seed from
  scraped copy as draft for clinic review.
- EU/GDPR for personal + medical data; strict access control.
- Performance — keep marketing pages SSG/SSR and lean; lazy-load images.
- Use real NAP from `scraped_content`; keep brand name in one config constant.

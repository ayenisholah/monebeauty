# Requirements — Mone Beauty

## Owner-approved shared calendar and employee assignment (2026-07-19)

The admin sidebar exposes `/admin/kalenteri` in every interface locale. The calendar follows
the supplied Timma Pro reference: day/week/month navigation, all active employees visible in
separate columns, availability at a glance, and appointment cards showing client, procedure,
room, and time. Admins may move active appointments in time, change rooms, or reassign them
to qualified employees after confirmation; staff see every column but edit only their own.

Public booking remains **Service -> Time -> You**. Every bookable service has one fixed
primary employee, so service selection directly determines the employee schedule without a
customer-facing employee picker. Optional qualified backups are available only for internal
reassignment. Rooms and physical devices are separate resources and every active appointment
must be rejected if it overlaps its employee, room, or required device. This section
supersedes the 2026-07-17 single-clinic-resource decision below.

## Superseded public booking assignment (2026-07-17)

The public booking wizard is **Service -> Time -> You**. Contextual booking links and valid
homepage handoffs open directly at Time. Customers do not choose or see an individual
provider; the server assigns every new public booking to the exact **Mone Beauty Clinic**
clinic scheduling resource and ignores client-supplied practitioner IDs. Practitioner
choices and provider identity are not exposed in customer or operational interfaces;
historical relations remain stored for integrity.

## Owner-approved themed controls (2026-07-18)

Every form dropdown must use the application-themed custom listbox. Date and time selection
must use the booking-style month grid and time chips; compact forms use popovers while the
booking wizard keeps its calendar inline. Controls must be keyboard accessible, localized,
mobile-safe, and use the existing design tokens.

## Owner-approved admin operations (2026-07-18)

The admin sidebar exposes `/admin/ajanvaraukset` and `/admin/tilaukset` in every interface
locale. Orders follow Pending -> Confirmed -> Fulfilled or Cancelled. Appointments follow
Booked -> Confirmed -> Completed or Cancelled; a customer reschedule returns a confirmed
appointment to Booked for clinic reconfirmation. Confirmation, rescheduling, and cancellation
use localized transactional email/SMS with durable provider-attempt history and safe retry.

## Owner-approved homepage direction (2026-07-12)

Reproduce root `index.html` as the homepage visual and content reference. Its medical,
diagnostic, evidence-based, and licensing language is owner-approved for this page: centered real-video hero and
three facts, Standard of Care, clinical services with explicit missing-medical-content stubs,
alternating technologies, accessible AROSHA/DIXIDOX tabs, compact one-click booking handoff,
and clinic standard/contact. Preserve localization, generated content/media, cart, booking,
chatbot, SEO, and the global shell. This supersedes older homepage section-order language.

## Owner-approved Finnish public routes (2026-07-17)

All user-facing routes use Finnish path segments in every locale. FI has no prefix; EN and RU
use `/en` and `/ru`. Canonical bases are `/klinikka`, `/laitehoidot`, `/palvelut`,
`/verkkokauppa`, `/ostoskori`, `/kassa`, `/tilaus`, `/ajanvaraus`, `/hinnasto`,
`/artikkelit`, `/tietosuojaseloste`, `/kayttoehdot`, `/evastekaytanto`, and `/henkilosto`.
Legacy English public paths permanently redirect. API/admin paths and dynamic product/article
slugs remain unchanged.

> **This document is binding.** It is the distilled, authoritative requirements spec for
> the project. Together with [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) it is the
> contract the build must follow. Do not deviate without updating these documents first.
> See the guardrails in [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md).

## 0. Source-of-truth hierarchy

The app realizes the **client brief** (`SCOPE.md` = **Mone Beauty Clinic**), an
aesthetic-medicine clinic. On conflict, resolve:

| Source                                                                       | Authoritative for                                                                                 | Strictness        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| [`SCOPE.md`](./SCOPE.md)                                                     | **Brand, positioning, IA/structure, product features** (booking, CRM, admin, chatbot, shop, GDPR) | Binding — wins    |
| [`design_handoff_mone_beauty_clinic/`](./design_handoff_mone_beauty_clinic/) | **Visual design system** (tokens, type, spacing, radii, shadows, components) + page structure     | Strictly followed |
| [`scraped_content/`](./scraped_content/)                                     | **Existing-page copy, images, video, real NAP/media** (3 locales)                                 | Reused as content |

Where `SCOPE.md` conflicts with `scraped_content/` (brand name, positioning, homepage
structure), **`SCOPE.md` wins**. The user's explicit technical direction (Prisma + Postgres)
**overrides** any conflicting handoff recommendation (e.g. the handoff's Payload CMS).

### Content-sourcing rule (binding)

- **Brand, positioning, and IA/structure come from `SCOPE.md`.** Existing-page **copy,
  images, and video come from `scraped_content/`** — reuse real media; **no gradient
  placeholders where real media exists.**
- **No invented medical claims.** Services/copy called for by `SCOPE.md` but absent from
  `scraped_content` (e.g. Injectable Aesthetic Medicine, Medical Consultation) are stubbed
  `[CLINIC TO PROVIDE]` for clinic review.
- Content is baked into committed registries by `scripts/gen-content.mjs`
  (`content/generated/*.json`); media by `scripts/copy-media.mjs` (`public/media/**`).
  `scraped_content/` stays git-ignored — re-run both scripts to refresh.

### Locked decisions

- **Brand: Mone Beauty Clinic** — real `public/logo.svg` + `app/favicon.ico`.
- **E-commerce is IN scope** — AROSHA/DIXIDOX catalog (`/verkkokauppa`,
  `/verkkokauppa/[slug]`, `/ostoskori`);
  Phase 2 cart/checkout persists order requests through Prisma. Payment capture is deferred.
- **Custom admin on Prisma — no Payload CMS.**
- **Stack is locked** (§2).

---

## 1. Overview & brand

- **Name:** **Mone Beauty Clinic** (per `SCOPE.md`; renamed from the old "Club"). Kept in a
  single config constant (`content/site.ts`); the header/footer render the real `logo.svg`.
- **Positioning:** an aesthetic-medicine clinic in Helsinki — "Next-Generation Aesthetic
  Medicine; a comprehensive approach to beauty, skin health, and the natural harmony of face,
  body, and hair." Real services (endospheres, laser, RF lifting, trichology, facial & body
  care) plus AROSHA products; SCOPE's additional medical services are `[CLINIC TO PROVIDE]`.
- **Visual language:** luxury minimalism / Scandinavian medical-beauty. Milky-white, cream,
  beige, sand, taupe, soft-brown surfaces with subtle-gold accents; editorial serif
  (Cormorant Garamond) + clean grotesque sans (Jost).
- **Avoid:** neon colors, salon-pink, clinical white-and-blue, heavy-black backgrounds,
  cheap stock photography, overloaded layouts.
- **Real contact details** (from `scraped_content/`, override handoff placeholders):
  - Address: **Solvikinkatu 5, 00990 Helsinki, Finland**
  - Phone: **+358 40 129 3800** · Email: **info@monebeauty.fi**
  - Socials: Instagram, Facebook, WhatsApp · Hours: by appointment.

## 2. Tech stack & global constraints (LOCKED)

- **Framework:** Next.js (App Router) + **TypeScript** — SSR/SSG for SEO-critical pages.
- **Styling:** **Tailwind CSS**, theme generated from `01-design-system.md` tokens (CSS
  variables for switchable `accent` + `--radius`).
- **Fonts:** `next/font` — Cormorant Garamond (400/500/600 + italic), Jost (300/400/500/600).
- **Icons:** `@phosphor-icons/react`, **thin** weight throughout.
- **ORM/DB:** **Prisma + PostgreSQL** (EU-hosted for GDPR).
- **Auth:** role-based — `admin`, `staff`, `client` (Auth.js/NextAuth or custom on Prisma).
- **i18n:** `next-intl`, locales **ru / fi / en**, locale-prefixed routes + `hreflang`.
- **AI:** **Anthropic Claude API** (latest model) for the chatbot.
- **Email/SMS:** transactional email (Resend/Postmark) + SMS (Twilio or FI gateway).
- **Analytics:** GA4 + Google Search Console; `next-sitemap`.
- **Non-functional:** SSL everywhere; **mobile-first** (verify at 390px first); accessible
  (WCAG AA, `prefers-reduced-motion`); fast (image optimization, lazy-load, lean JS on
  marketing pages); EU data residency.

## 3. Internationalization (RU / FI / EN)

- Language switcher in the header (`EN ▾` style dropdown).
- All public pages localized with locale-prefixed routes and `hreflang` alternates.
- Locale detection + persisted choice.
- Content authored **per-locale** in the admin — **do not auto-translate** medical or legal
  copy; each language is clinic-approved. `scraped_content/{fi,en,ru}/` provides starting copy.

## 4. Site map / pages (Finnish segments, locale-prefixed en/fi/ru)

**Content pages** (real copy from `scraped_content`, rendered via `react-markdown`):

- `/` Home — real hero video + serif brand heading, 3 featured services, AROSHA product grid
- `/klinikka` About Us (incl. real Club Rules / cancellation / return copy)
- `/laitehoidot/{endospheres,laserkarvanpoisto,mikroneula-rf}`
- `/trikologia`, `/arosha`
- `/palvelut` (index) + `/palvelut/{kasvohoidot,vartalohoidot,endospheres-terapia,
laserkarvanpoisto,mikroneula-rf,trikologia,kulmat-ja-ripset,hoitopaketit,lahjakortit,
injektiohoidot,konsultaatio}`

**Shop:** `/verkkokauppa` (31 AROSHA/DIXIDOX products, grouped by category),
`/verkkokauppa/[slug]` (product detail: image, price, size, real description, related),
`/ostoskori` (real cart), `/kassa`, `/tilaus/[id]` confirmation.

**App / authenticated:** `/ajanvaraus` (booking), `/henkilosto` (staff), `/admin`.

**Legal (footer):** `/tietosuojaseloste`, `/kayttoehdot`, `/evastekaytanto`.

**Global elements:** sticky blurred header (real logo, dropdown nav for Instrumental &
Services, cart, language switcher, Book time); footer (nav + contacts + opening hours "By
agreement" + socials); chat FAB; SEO `<head>` (title, meta, OG, hreflang, JSON-LD).

## 5. Design system requirements

Reproduce `01-design-system.md` **exactly**, expressed as design tokens — never hand-repeat
hex values across components.

- **Colors:** page `#FBF8F3`, alt `#F5EFE4`, card `#FCFAF6`, dark CTA `#2A2520`, footer
  `#221E1B`; accent `#97785A` (+ alt theme options); text primary `#3A322B` (never pure
  black), body `#6B6056`, muted `#8A7E70`; the full border/footer/dark palettes in the spec.
- **Type:** fluid `clamp()` scales with the **exact** min/max endpoints from the spec.
- **Spacing/layout:** max width 1280px (Technologies 1100px); section padding clamps;
  responsive breakpoint **900px** (desktop nav → hamburger + slide-down).
- **Radii:** `--radius` 16px (Soft) default / 4px (Minimal) option; buttons 4px.
- **Shadows:** warm brown-tinted only (`rgba(58,42,28,…)`) — never neutral grey/black.
- **Motion:** documented transitions/hover lifts; honor `prefers-reduced-motion`.
- **Components (reuse, do not re-style ad hoc):** Button (primary/outline/primaryOnDark/
  textLink), Eyebrow, SectionHeading, Card (treatment), FeatureItem, ImageSlot
  (`next/image`), Header/Navbar, MobileMenu, Footer, CTABand, ChatWidget FAB,
  LanguageSwitcher. Build a `/styleguide` page demonstrating all of them.

## 6. Service & content pages (SEO)

Service/content pages mirror the live site and render **real per-locale copy** from
`scraped_content` via a shared `ContentPage` + `react-markdown` (title + markdown body,
images resolved from `public/media/**`). No invented content.

**Instrumental cosmetology:** `/instrumental/endosphere`, `/instrumental/laser`,
`/instrumental/mikroneulanrf`.
**Services:** `/services` index + `/services/{face, body, tricho, laser, mikroneulanrf,
eyebrows, packages, gift-cards}`.
**Standalone:** `/trichology`, `/arosha`.

Each: `content/generated/pages.json` (from `scripts/gen-content.mjs`) keyed by slug × locale.
**SEO per page:** `title` + `metaDescription` (excerpt) + `hreflang`. Product pages also emit
`MedicalProcedure`/`Service` JSON-LD; the homepage emits `MedicalClinic` JSON-LD (Helsinki NAP).

## 7. E-commerce — AROSHA shop

- **Catalog** of the **31 products** captured in `scraped_content/*/catalog/` with real
  images from `scraped_content/assets/`.
- **Categories:** AROSHA body line and DIXIDOX / De Luxe trichology line.
- **Product detail:** images, name, size (ml / pack), price (band ≈ €39–€85), description,
  related products, add-to-cart.
- **Cart + checkout:** GDPR-compliant checkout (consent capture), order creation,
  order confirmation page. Email confirmation, payment capture, and order visibility in
  `/account` and `/admin` are deferred.
- Built with the **same design system**; mobile-first.

## 8. Online booking

All active public **Book** and **Book Online** CTAs open the localized dedicated `/ajanvaraus`
flow. Generic CTAs open service selection; service and technology CTAs use
`/ajanvaraus?service=<service-slug>`; procedure cards additionally use a validated, one-based
`procedure` index. The ordinary Consultation navigation link may remain an in-page anchor.
Locale switching preserves valid booking context.

The compact homepage booking form remains as a safe handoff. It transfers name, phone,
email, notes, preferred date, and service through a versioned tab-scoped `sessionStorage`
record with a 30-minute expiry. Personal data must never be placed in the URL; the booking
wizard consumes and removes the record once. Contextual URLs advance directly to Time, while
changing service clears procedure context, reloads availability for a retained valid date,
and updates the URL.

Booking context is resolved only from the requested locale's published Prisma service
content. The booking page shows a concise approved-content service/procedure summary. Unknown
services become generic booking visits; invalid/stale procedure indices fall back to the
validated parent service. `POST /api/booking` accepts an optional `procedureIndex`, resolves
it again server-side, and persists nullable procedure index/title/price snapshots separately
from client notes. Confirmation, staff/CRM views, confirmation/reminder messages, and staff
notifications show the procedure snapshot when present and otherwise fall back to the parent
service.

> **First iteration (lean) — implemented at reduced scope.** A friction-free, one-click
> booking: a 3-step wizard **Service → Time → You** where tapping a service selects it and
> advances; service cards and pages deep-link `/booking?service=<key>` to preselect. Steps:
> pick date/time (open slots only, single shared default practitioner) → client details
> (create/match CRM `Client`) → **GDPR consent** → **on-screen confirmation**, persisted via
> Prisma (`Appointment` + `Consent`). The clinic scheduling relation remains internal for
> persistence, conflict prevention, reschedule/cancel, and Phase 6 email/SMS
> confirmations + reminders.
> Mobile-first; 44px+ tap targets; clear progress indicator.

**Client wizard (24/7):** select treatment → choose date/time (only open slots) → client
details (create/match CRM client) → confirm + GDPR consent → on-screen confirmation. New
public bookings always resolve the exact **Mone Beauty Clinic** practitioner server-side;
legacy practitioner query/body values never control assignment. Provider identity is not
returned in public slot or confirmation responses. Shared-clinic availability and lightweight
cancel/reschedule endpoints remain implemented internally. Email + SMS
confirmations, reminders at 24h + 2h, and staff alerts are implemented through the Phase 6
notification layer; richer cutoff policy remains deferred to a future admin policy pass.
Mobile-first; 44px+ tap targets; clear three-step progress indicator; accent selected-state
calendar.

**Staff flow (`/staff`):** implemented as an internal shared-clinic schedule surface with a
custom date picker, working-hour range application, open/closed slot controls, and appointment
details (client + treatment + notes). Auth/RBAC and new-booking
notifications are implemented. Fully responsive.

## 9. CRM / client database

Client profile: full name, phone, email; appointment history (treatments, dates, status);
free-text notes; **contraindications / medical comments — flagged,
high-visibility, treated as special-category data**; cancellation/reschedule history.
Quick search by name / phone / email. Admin can create/edit clients and add notes.

## 10. Custom admin / CMS (Prisma)

User-friendly admin panel (custom, Prisma-backed) to edit text, images, pricing, services,
products, and blog without a developer. Hosts the CRM and the chatbot handoff queue.
**Roles:** admin (full), staff (own schedule + own appointments), client (account only).
Access control + **audit logging** on medical fields.

### 10.1 Localized admin IA and application shell

- The admin uses the same Finnish path segments in every locale. Finnish has no prefix;
  English and Russian use `/en` and `/ru`. Canonical modules are `/admin`,
  `/admin/kirjaudu`, `/admin/asiakkaat`, `/admin/ajanvaraukset`, `/admin/tilaukset`,
  `/admin/palvelut`, `/admin/teknologiat`,
  `/admin/sisalto`, `/admin/tuotteet`, `/admin/hinnasto`, `/admin/artikkelit`, and
  `/admin/keskustelut`; creation uses `/uusi` and records use `/[id]`.
- Existing English admin paths permanently redirect to the matching Finnish path.
- The desktop admin has a permanent left sidebar. Below desktop it becomes an accessible
  off-canvas drawer with overlay, focus containment, Escape close, and 44px controls.
- Admin navigation, forms, validation, confirmations, status and empty-state labels, login,
  dashboard, and dates are localized through the `Admin` message namespace. Locale changes
  preserve the Finnish path, record id, query string, and editor context.
- Public and admin route groups have separate shells. Admin never loads the public header,
  footer, cart, chatbot, cookie banner, or analytics.

### 10.2 Database content ownership and publication

- `Service` (clinical service), `Technology` (clinical technology), and `Product`
  (professional product) are separate Prisma entities with global operational fields and
  locale-specific content rows.
- Every locale-specific page, treatment, technology, product, price label, and article has a
  `DRAFT` or `PUBLISHED` state. Public queries return only the requested locale's published
  content; missing/draft translations are omitted or produce a localized 404. There is no
  translation generation and no fallback to English or another locale.
- Services own slug/path/category/duration/booking/price/media/order/practitioner/archive
  fields. Technologies own path/media/order and an optional related booking service.
  Products own price/currency/size/media/category/order/archive fields. Pricing keeps numeric
  values and relationships global while labels and units are localized.
- Services and products referenced by appointments or orders cannot be hard-deleted; they are
  archived. Historical appointment relations and order-item snapshots remain intact.
- All mutations require admin authorization, validate input, write `AuditLog`, and revalidate
  affected public and admin paths. Media inputs are restricted to existing `/media/**` paths.
- Homepage sections, service and technology pages, catalog, pricing, blog, booking,
  notifications, and chatbot retrieval use shared Prisma repositories at runtime.
- `content/generated/*.json` is import/bootstrap input only. Routine synchronization creates
  missing rows without overwriting admin-owned values; an explicit force option is required
  to refresh existing records.

## 11. AI chatbot

Floating FAB on every page (design in homepage spec). Answers questions, explains
procedures, helps choose treatments, gives pre/post-care **from approved content only**,
assists booking (launches the wizard), and **hands off to a human admin**. Languages:
**RU / FI / EN** (match locale). Implemented with the **Claude API**, system prompt grounded
in CMS content (retrieval) so it never fabricates medical claims. Log transcripts with consent.

## 12. SEO

Dedicated page per treatment; per-page SEO title + meta description; image `alt` everywhere;
correct heading order (single `h1`, ordered `h2/h3`); fast loading; blog for content
marketing; **local SEO — Helsinki** (`LocalBusiness`/`MedicalClinic` JSON-LD with NAP +
hours + geo); GA4 + Search Console; XML sitemap + robots.txt.

## 13. GDPR / security

SSL everywhere; cookie-consent banner; privacy/terms/cookies pages; lawful-basis + consent
capture at booking and checkout (granular marketing consent); right to access/erase/export;
medical notes encrypted at rest with strict RBAC + audit logging; EU data residency.

## 14. Non-deviation

Read `SCOPE.md`, this file, and `IMPLEMENTATION_PLAN.md` before any build work. Any scope,
stack, or design change must update these documents first. Full guardrails are mirrored in
`CLAUDE.md` and `AGENTS.md`.

# Requirements — Mone Beauty

## Owner-approved Stripe website payments (2026-07-19)

Website-originated purchases use Stripe-hosted Checkout with signature-verified,
idempotent webhooks as the authority for payment and refund state. Published physical
products, fixed-value balance gift cards, and explicitly configured single-use treatment
vouchers may be purchased online. Physical orders offer free clinic pickup or one
Dashboard-managed Finland shipping rate; digital-only orders require neither. Paid-order,
fulfilment, voucher, refund, and localized customer/staff notifications are durable and
audited. Stripe events that are not tied to a known Mone Beauty website order are ignored.
Stripe's Checkout return link securely expires the open Session, and the resulting signed
expiry webhook is authoritative for customer cancellation. Admin order lists/details label
open unpaid website orders Awaiting payment and support filtering by that derived state.

Appointment booking remains Service -> Time -> You and never takes online payment. Clients
pay for in-person appointments at the clinic by credit card, and no Stripe invoice or
post-appointment charge is created. Listed EUR prices are charged as gross totals; Stripe
Tax remains disabled until accountant-approved registrations and per-item tax rules exist.

## Owner-approved accounts, staff RBAC, and audit trail (2026-07-19)

Clients may self-register at `/oma-tili` using email verification. Accounts are optional for
booking: authenticated bookings attach directly to the account and guest bookings may be
claimed only through a hashed single-use link delivered to the booking email. The account
shows only that client's past/upcoming procedures and submits cancellation/reschedule
requests; requests never change an appointment until an admin approves them after repeating
all employee, room, device, availability, and overlap checks.

Admin, staff, and client login surfaces are separate. Creating a staff account automatically
creates and links its one-to-one employee calendar profile; no employee selector is exposed in
the account form. Admin-created and reset temporary passwords must be non-empty and at most
128 characters, while the required first-login replacement retains the normal 12-character
minimum. Admins can view every staff account, reset passwords, revoke sessions, revoke or
restore access, inspect audit history, and permanently delete credentials after confirming the
staff email. Credential deletion retains the employee calendar profile, appointments, and
audit records. Staff receive no account confirmation email and must replace the temporary
password at first login. Staff see their assigned employee calendar and may reveal appointment
contact details, booking notes, and contraindication warnings through audited access. Staff
may create, edit, confirm, complete, cancel, and availability-validate reschedule appointments
for their linked employee. They may change only their own working hours and
open/closed availability. Website content, pricing, services, rooms/devices, staff accounts,
CRM administration, and other clinic configuration remain admin-only.

The admin exposes staff management and immutable audit views. Audit security/authentication,
password/session events, sensitive staff appointment-detail access, denied mutations, and
admin staff-account actions with actor, outcome, target, time, IP/user-agent, and safe
metadata. Audit data has filtering/export but no application deletion or automatic purge.

## Owner-approved shared calendar and employee assignment (2026-07-19)

The admin sidebar exposes `/admin/kalenteri` in every interface locale. The calendar follows
the supplied Timma Pro reference: day/week/month navigation, all active employees visible in
separate columns, availability at a glance, and appointment cards showing client, procedure,
room, and time. Admins may create appointments, update active appointment details, change
rooms/devices, and move appointments in time or between qualified employees. Staff may perform
those operations only for appointments assigned to their linked employee. A Create
appointment button is always available, and selecting an empty available time in day/week view
prefills its employee, date, and time. Staff may edit only their own availability and cannot
change calendar setup or other clinic configuration.

Staff-created appointments search or create a CRM client, require recorded GDPR acknowledgement,
start as confirmed, and send the localized durable email/SMS confirmation. Creation, detail
changes, lifecycle actions, schedule moves, sensitive access, and denied mutations are audited.
Existing-client selection uses an accessible dropdown with 300 ms debounced lookup by name,
phone, or email; no separate search action is required. It initially lists the 20 most recently
updated non-archived clients and supports clearing with Backspace/Delete. Name, phone, and email
are always visible, are populated from a selected client, and remain editable. Appointment saves
persist those values as an immutable-to-CRM booking contact snapshot used by calendar/detail views,
email, SMS, reminders, and claim delivery; edits do not update the linked CRM client record.

### Timma-style internal calendar reservations (owner-approved, 2026-07-21)

The calendar must provide dense day, full Monday-first seven-day week, and month views inside the existing
localized admin shell. Its toolbar includes All/Working and generated employee filters, view and
date navigation, a themed date picker, Create appointment, zoom, refresh, and setup. Day/week
hours use the selected employees' open-time union plus a separate out-of-hours exception row,
48 px/hour by default, sticky headers and bilateral time labels. Past weekdays remain visible.
Every employee/day column renders visible one-hour rows even without appointments or configured
availability; an otherwise empty grid falls back to 10:00–19:00. Invisible 15-minute hit targets
retain exact placement but become visible only on hover or as the active drop target. Zoom persists locally at compact,
default, or expanded density. Week headings use initials at high density and full names for a
narrow selection. Month uses a seven-column grid, compact event rows, and `+N more`. The mobile
layout changes the internal-service palette to a horizontal tray and preserves sticky axes while
the grid scrolls horizontally. Pointer, touch, and keyboard users must retain equivalent actions.
Day/week grids have no nested vertical scrollbar; their full height participates in page scrolling.
Every month date is navigable, including empty future dates. Empty day/week quarter-hour targets
support vertical selection locked to the starting date/employee column. Selected cells render as
one continuous shaded range without internal borders and immediately open Create appointment on
release, using the complete selected duration. Internal blocks and availability remain available
through their dedicated drag/drop and toolbar controls. The toolbar uses magnifying-glass zoom
icons with localized hover/focus tooltips and replaces quarter-slot Open / closed times with
tooltiped Add workday and Remove workday actions.

`CalendarBlockTemplate` is distinct from clinical `Service` and stores EN/FI/RU labels, default
duration, Mone-compatible color, active state, and display order. Generate the complete Finnish
catalog and drag aliases from `internal-services.txt`; retain the first four internal entries as
the default shortcuts, leave all remaining entries unselected, and allow at most 24 locally
selected shortcuts. Admins alone manage
templates. Active templates may be dragged or selected then placed at a 15-minute position inside
an hourly row. Dragging shows a floating preview and highlights the hovered future vacant target. The Booking info
modal contains date/start/end, a primary item, ordered additional items, target employee, at most
one optional room or device, notes, and recurrence/add-to-others. Items are sequential; their
durations determine the end, and an edited end changes the final item duration.

Recurrence accepts selected weekdays and an inclusive end date no more than 12 months ahead.
Admins may target multiple active employees; staff may target only their linked employee. The UI
previews the occurrence count. A request may generate at most 500 concrete occurrences and saves
atomically: any active appointment/block conflict for an employee, room, or device rejects the
whole request and identifies the conflicting date/resource. Editing and soft cancellation support
the current occurrence or all future occurrences in a series, use optimistic `version` checks,
and are audited without customer notifications.

`CalendarBlockSeries`, `CalendarBlock`, `CalendarBlockItem`, and `CalendarBlockParticipant`
persist recurrence metadata, concrete time/resource reservations, ordered duration/label
snapshots, participants, status, and version. `GET /api/calendar` returns localized active
templates and expanded occurrences. Authenticated create/update/cancel endpoints enforce RBAC.
Every appointment create/reschedule/move and block mutation uses shared conflict checks covering
active appointments and blocks plus transaction-scoped PostgreSQL advisory locks for affected
employee/resource/day keys; existing appointment exclusion constraints remain. Public
availability omits internally reserved time. Blocks never change working hours or availability.

Working-time visibility (owner-approved, 2026-07-19): normalized
`Practitioner.workingHours` is the canonical weekly schedule and explicit per-date
`Availability.slots` override it. Day/week calendars crop to the visible employees' earliest-to-
latest open-time union; closed gaps are not selectable. Date pickers keep unavailable dates in
place but disable them, and scheduling time pickers contain only valid open starts. The authorized
working-hours editor alone may select the full day so hours can be expanded. Existing appointments
outside current availability remain visible in a separate out-of-hours exception row. Add workday
replaces one employee/date override with an exact 15-minute-aligned open range; Remove workday
persists an empty override without changing recurring weekly hours. Admins may select any active
employee while staff remain restricted to their linked employee. Past dates and changes that
would place active appointments outside the resulting workday are rejected and audited.

The verified client account is a localized dashboard with overview, appointments, orders, saved
addresses, and profile sections. Verified email is visible and read-only; name and phone are
editable. Exact-email guest orders are linked after verification only when they are not owned by a
different verified account. Authenticated booking and checkout reuse the exact linked Client rather
than matching identity from submitted email. Finland shipping checkout can select or create a saved
address; Stripe's final address updates only the order snapshot.

Appointment confirmations include service/procedure, employee, localized Helsinki date/time and
duration, pay-at-clinic details, clinic contact/location and map links, Google/Apple/Outlook calendar
actions, the published 24-hour cancellation policy, and a secure account-based cancel/reschedule
action. Cancellation remains an admin-reviewed request until approved.

Every server-side email, SMS, Stripe, Anthropic, and Cloudinary request records an admin-visible,
redacted integration attempt with provider operation, outcome, HTTP status, provider/request ID,
latency, safe response metadata, retry number, and related entity. Logs expire after 30 days and
must exclude secrets, authorization data, raw payment data, and unnecessary personal content.

Public booking remains **Service -> Time -> You**. Every bookable service has an ordered set of
qualified employees and no customer-facing employee picker. Public availability combines their
resource-safe slots; creation assigns the first conflict-free employee in calendar display order
inside the locked transaction. Rooms and physical devices are separate resources and every active appointment
must be rejected if it overlaps its employee, room, or required device. This section
supersedes both the fixed-primary and 2026-07-17 single-clinic-resource decisions below.

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
  Prisma-backed hosted Stripe Checkout captures website purchases and webhooks reconcile
  payment/refund state without affecting clinic-paid appointments.
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
- **Cart + checkout:** GDPR-compliant checkout (consent capture), Stripe-hosted payment,
  webhook-authoritative order/refund state, pickup or Finland shipping for physical goods,
  automatic gift/treatment vouchers, localized notifications, and order confirmation in
  the public order page and `/admin`.
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
- The desktop admin has a left sidebar that collapses to a 76px icon rail and remembers the
  preference across visits. Below desktop it becomes an accessible off-canvas drawer with
  overlay, focus containment, Escape close, and 44px controls.
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

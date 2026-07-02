# Requirements — Mone Beauty

> **This document is binding.** It is the distilled, authoritative requirements spec for
> the project. Together with [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) it is the
> contract the build must follow. Do not deviate without updating these documents first.
> See the guardrails in [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md).

## 0. Source-of-truth hierarchy

The app realizes the **client brief** (`SCOPE.md` = **Mone Beauty Clinic**), an
aesthetic-medicine clinic. On conflict, resolve:

| Source                                                                       | Authoritative for                                                                            | Strictness        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| [`SCOPE.md`](./SCOPE.md)                                                     | **Brand, positioning, IA/structure, product features** (booking, CRM, admin, chatbot, shop, GDPR) | Binding — wins    |
| [`design_handoff_mone_beauty_clinic/`](./design_handoff_mone_beauty_clinic/) | **Visual design system** (tokens, type, spacing, radii, shadows, components) + page structure | Strictly followed |
| [`scraped_content/`](./scraped_content/)                                     | **Existing-page copy, images, video, real NAP/media** (3 locales)                            | Reused as content |

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
- **E-commerce is IN scope** — AROSHA/DIXIDOX catalog (`/catalog`, `/catalog/[slug]`, `/basket`);
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

## 4. Site map / pages (mirrors the live site, locale-prefixed en/fi/ru)

**Content pages** (real copy from `scraped_content`, rendered via `react-markdown`):

- `/` Home — real hero video + serif brand heading, 3 featured services, AROSHA product grid
- `/about` About Us (incl. real Club Rules / cancellation / return copy)
- `/instrumental/endosphere`, `/instrumental/laser`, `/instrumental/mikroneulanrf`
- `/trichology`, `/arosha`
- `/services` (index) + `/services/{face,body,tricho,laser,mikroneulanrf,eyebrows,packages,gift-cards}`

**Shop:** `/catalog` (31 AROSHA/DIXIDOX products, grouped by category), `/catalog/[slug]`
(product detail: image, price, size, real description, related), `/basket` (real cart),
`/checkout`, `/order/[id]` confirmation.

**App / authenticated (later phases):** `/booking` (lean booking implemented), `/account`,
`/staff`, `/admin`.

**Legal (footer):** `/privacy-policy`, `/terms-of-use`, `/cookies-policy`.

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

> **First iteration (lean) — implemented at reduced scope.** A friction-free, one-click
> booking: a 3-step wizard **Service → Time → You** where tapping a service selects it and
> advances; service cards and pages deep-link `/booking?service=<key>` to preselect. Steps:
> pick date/time (open slots only, single shared default practitioner) → client details
> (create/match CRM `Client`) → **GDPR consent** → **on-screen confirmation**, persisted via
> Prisma (`Appointment` + `Consent`). Deferred to the full spec below: email/SMS
> confirmation + reminders, practitioner selection + per-practitioner availability,
> reschedule/cancel. Mobile-first; 44px+ tap targets; clear progress indicator.

**Client wizard (24/7):** select treatment → select practitioner (or "no preference",
name + role only, no public bio) → choose date/time (only open slots) → client details
(create/match CRM client) → confirm + GDPR consent → on-screen confirmation. The upgraded
Phase 3 flow is implemented with practitioner-aware availability and lightweight
cancel/reschedule endpoints. Email + SMS confirmations, reminders at 24h + 2h, and richer
cutoff policy remain deferred to notification/admin phases. Mobile-first; 44px+ tap targets;
clear progress indicator; accent selected-state calendar.

**Staff flow (`/staff`):** implemented as an internal schedule surface with practitioner/date
selection, working-hour range application, open/closed slot controls, and appointment details
(client + treatment + notes). Auth/RBAC, own-schedule restriction, and new-booking
notifications remain deferred to Phase 5/6. Fully responsive.

## 9. CRM / client database

Client profile: full name, phone, email; appointment history (treatments, dates,
practitioner); free-text notes; **contraindications / medical comments — flagged,
high-visibility, treated as special-category data**; cancellation/reschedule history.
Quick search by name / phone / email. Admin can create/edit clients and add notes.

## 10. Custom admin / CMS (Prisma)

User-friendly admin panel (custom, Prisma-backed) to edit text, images, pricing, services,
products, and blog without a developer. Hosts the CRM and the chatbot handoff queue.
**Roles:** admin (full), staff (own schedule + own appointments), client (account only).
Access control + **audit logging** on medical fields.

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

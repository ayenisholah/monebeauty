# Requirements — Mone Beauty

> **This document is binding.** It is the distilled, authoritative requirements spec for
> the project. Together with [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) it is the
> contract the build must follow. Do not deviate without updating these documents first.
> See the guardrails in [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md).

## 0. Source-of-truth hierarchy

Three source documents feed this spec. On conflict, resolve in this order:

| Source | Authoritative for | Strictness |
|---|---|---|
| [`SCOPE.md`](./SCOPE.md) | **What** to build (scope, features, priorities) | Binding |
| [`design_handoff_mone_beauty_clinic/`](./design_handoff_mone_beauty_clinic/) | **How it looks/works** (design system, IA, page specs, templates) | Strictly followed |
| [`scraped_content/`](./scraped_content/) | **Real assets & copy** (images, text, contact details, products) | Source of real content |

The user's explicit technical direction (Prisma + Postgres, full e-commerce) **overrides**
any conflicting recommendation in the design handoff (e.g. the handoff's Payload CMS).

### Locked decisions
- **E-commerce is IN scope** — build the clinic marketing site **and** a working AROSHA
  product shop (catalog, product pages, cart, checkout, orders).
- **Custom admin on Prisma — no Payload CMS.** Wherever the handoff says "Payload,"
  substitute custom Prisma models + a custom admin UI.
- **Full roadmap, MVP flagged** (see implementation plan).
- **Stack is locked** (§2).

---

## 1. Overview & brand

- **Name:** Mone Beauty Clinic (primary brand per SCOPE/handoff). The live site currently
  brands as "Mone Beauty **Club**." Use the **Clinic** positioning; keep the display name in
  a single config constant — **final name to be confirmed by the client.**
- **Positioning:** Next-Generation Aesthetic Medicine — a medically credible, comprehensive
  approach to the beauty and health of face, body, and hair. A licensed **medical clinic**,
  not a beauty salon.
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

## 4. Site map / pages

**Marketing** (SSG/SSR):
- `/` Home (long-form, per `03-homepage-spec.md`)
- `/about` About the Clinic
- `/services` Services index (grid of the 9 treatments)
- `/services/[slug]` — the **9 treatment pages** (§6)
- `/pricing` Pricing (admin-editable table per category)
- `/blog`, `/blog/[slug]` Blog / articles
- `/contact` Contact (form + map + hours + GDPR consent)
- `/privacy-policy`, `/terms-of-use`, `/cookies-policy` Legal

**Shop** (§7): `/shop` (catalog), `/shop/[category]`, `/shop/product/[slug]`, `/cart`,
`/checkout`, `/order/[id]` confirmation.

**App / authenticated:** `/booking` (client wizard), `/account` (client: appointments,
order history, profile), `/staff` (staff schedule), `/admin` (CMS + CRM).

**Global elements on every public page:** sticky blurred header w/ language switcher; footer;
AI chatbot FAB; cookie-consent banner; consistent SEO `<head>` (title, meta, OG, hreflang,
JSON-LD). **No "Specialists" page** (explicitly excluded).

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

## 6. The 9 treatment pages (most important SEO requirement)

Each treatment gets its **own** SEO page at `/services/[slug]`. All 9 share **one template**
(from `04-service-page-template.md`) with these 13 blocks in order: hero (h1 + breadcrumb +
sticky Book Online) → what it is → who it's for → benefits/concerns → procedure steps → why
it's safe → pre-care → post-care → contraindications → recommended sessions (stat block) →
expected results → FAQ accordion → booking CTA band. Related-treatments grid at the bottom.

**Treatments (slugs):** `aesthetic-device-treatments`, `laser-hair-removal`,
`endospheres-therapy`, `microneedling-rf`, `facial-treatments`, `body-treatments`,
`injectable-aesthetic-medicine`, `trichology`, `medical-consultation`.

**SEO per page:** `title`, `metaDescription`, `h1`, `ogImage`, per-image `alt`; JSON-LD
(`MedicalProcedure`/`Service` + `FAQPage` + `BreadcrumbList`); `hreflang` for ru/fi/en.

**Content rule — no invented medical claims.** Seed copy from `scraped_content/` where it
maps, as a **draft for clinic review**, and mark every gap `[CLINIC TO PROVIDE]`:

| Treatment page | Seed source in `scraped_content/` |
|---|---|
| `endospheres-therapy` | `*/instrumental-endosphere.md` |
| `laser-hair-removal` | `*/instrumental-laser.md`, `*/services-laser.md` |
| `microneedling-rf` | `*/instrumental-mikroneulanrf.md`, `*/services-mikroneulanrf.md` |
| `trichology` | `*/trichology.md`, `*/services-tricho.md` |
| `facial-treatments` | `*/services-face.md` |
| `body-treatments` | `*/services-body.md` |
| `aesthetic-device-treatments` | umbrella — `instrumental-*` + `services-*` |
| `injectable-aesthetic-medicine` | `[CLINIC TO PROVIDE]` (not on live site) |
| `medical-consultation` | `[CLINIC TO PROVIDE]` |

## 7. E-commerce — AROSHA shop

- **Catalog** of the **31 products** captured in `scraped_content/*/catalog/` with real
  images from `scraped_content/assets/`.
- **Categories:** AROSHA body line and DIXIDOX / De Luxe trichology line.
- **Product detail:** images, name, size (ml / pack), price (band ≈ €39–€85), description,
  related products, add-to-cart.
- **Cart + checkout:** GDPR-compliant checkout (consent capture), order creation,
  order confirmation page + email confirmation; orders visible in `/account` and `/admin`.
- Built with the **same design system**; mobile-first.

## 8. Online booking

**Client wizard (24/7):** select treatment → select practitioner (or "no preference",
name + role only, no public bio) → choose date/time (only open slots) → client details
(create/match CRM client) → confirm + GDPR consent → confirmation (on-screen + **email** +
**SMS, preferred**). Reminders at 24h + 2h. Reschedule/cancel with a cutoff window.
Mobile-first; 44px+ tap targets; clear progress indicator; accent selected-state calendar.

**Staff flow (`/staff`):** daily/weekly calendar; manage recurring working hours; open/close
slots, breaks, days off; view own appointments (client + treatment + notes); new-booking
notifications; fully responsive. Staff see only their own schedule.

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

# AGENTS.md

## Rules

1. Commits should be authored by me only. Do not add Anthropic or Claude Code as a
   co-author, author, or contributor on any commit. Do not include
   `Co-Authored-By: Claude` trailers or "Generated with Claude Code" lines in
   commit messages.

## Project: Mone Beauty website rebuild

We are rebuilding the Mone Beauty website. Two reference sources sit in this repo:

- **`design_handoff_mone_beauty_clinic/`** — design system, page templates, layout,
  IA proposal, and tech-stack recommendation **only**. This is the look/structure.
- **`scraped_content/`** — the **actual copy/content** of the current live site
  (`monebeauty.fi`), scraped on **2026-06-30** in all three locales. This is the
  content to migrate into the new templates.

> Note: the live site's information architecture (captured in `scraped_content/`)
> differs from the idealized IA in
> `design_handoff_mone_beauty_clinic/02-information-architecture.md`. Treat the
> handoff IA as the target and the scraped routes as the current source of truth
> for existing copy.

## Live Site Reference — monebeauty.fi (scraped 2026-06-30)

### Locales

The site serves three locales off one domain, distinguished by URL prefix:

| Locale            | Base URL                    | Prefix   | Scrape folder         |
| ----------------- | --------------------------- | -------- | --------------------- |
| Finnish (default) | `https://monebeauty.fi/`    | _(none)_ | `scraped_content/fi/` |
| English           | `https://monebeauty.fi/EN/` | `EN/`    | `scraped_content/en/` |
| Russian           | `https://monebeauty.fi/RU/` | `RU/`    | `scraped_content/ru/` |

Every route below exists in **all three** locales (FI = no prefix, EN = `EN/…`, RU = `RU/…`).

### Routes → scraped Markdown files

(Relative to each locale base; output file lives under `scraped_content/<locale>/`.)

| Live path                      | Output file                     | Notes                                                  |
| ------------------------------ | ------------------------------- | ------------------------------------------------------ |
| `/`                            | `home.md`                       | Landing page: featured services + AROSHA product strip |
| `/about/`                      | `about.md`                      | About the clinic                                       |
| `/instrumental/endosphere/`    | `instrumental-endosphere.md`    | Endospheres therapy                                    |
| `/instrumental/laser/`         | `instrumental-laser.md`         | Laser hair removal                                     |
| `/instrumental/mikroneulanrf/` | `instrumental-mikroneulanrf.md` | Microneedle RF lifting                                 |
| `/trichology/`                 | `trichology.md`                 | Trichology                                             |
| `/arosha/`                     | `arosha.md`                     | AROSHA brand/product line                              |
| `/services/`                   | `services-index.md`             | Services index                                         |
| `/services/face/`              | `services-face.md`              | Facial treatments                                      |
| `/services/body/`              | `services-body.md`              | Body treatments                                        |
| `/services/tricho/`            | `services-tricho.md`            | Trichology services                                    |
| `/services/laser/`             | `services-laser.md`             | Laser hair removal services                            |
| `/services/mikroneulanrf/`     | `services-mikroneulanrf.md`     | Microneedle RF services                                |
| `/services/eyebrows/`          | `services-eyebrows.md`          | Eyebrow & lash care                                    |
| `/services/packages/`          | `services-packages.md`          | Service packages                                       |
| `/services/gift-cards/`        | `services-gift-cards.md`        | Gift cards                                             |
| `/catalog/`                    | `catalog-index.md`              | Product catalog (e-commerce)                           |
| `/booking/`                    | `booking.md`                    | Online booking (app page)                              |
| `/basket/`                     | `basket.md`                     | Shopping cart (app page)                               |

That's **19 routes × 3 locales = 57** content/route pages.

### Product detail pages (`/catalog/<slug>.html`)

**31 products**, saved under `scraped_content/<locale>/catalog/<slug>.md` (slugs identical
across locales → **31 × 3 = 93** product pages):

```
AROSHA body line:
  stretch-marks-200ml-1   518-b-tone-100ml-3        cellulite-200ml-4
  lipolytic-200ml-5       peeling-120ml-6           nio-drain-9
  516-cellunight-200ml-night-10   breast-amp-decollete-11
  521-silhouette-pants-refill-14  521-nio-drain-pans-refill-15
  brush-home-16           sugargel-scrub-17         leginsi-34
  522-upamptone-leginsi-35        body-slim-36      body-slim-nude-37
  521-silhouette-pants-sm-38      520-nio-drain-pants-39
  522-upntone-pants-50    502-drain-bio-shock-51    509-body-lift-53
  514-texture-52
DIXIDOX / trichology line:
  1-1-dixidox-de-luxe-41          1-3-dixidox-de-luxe-peeling-42
  2-1-dixidox-de-luxe-shampoo-43  2-4-dixidox-de-luxe-lotion-44
  3-1-dixidox-de-luxe-shampoo-45  3-4-dixidox-de-luxe-lotion-46
  3-4-2-crexepil-de-luxe-classic-47   3-4-5-science-7-de-luxe-lotion-48
  3-4-3-fresh-cells-de-luxe-concentrate-49
```

**Grand total: 150 Markdown pages** (50 per locale).

### `scraped_content/` folder layout

```
scraped_content/
  _raw/{fi,en,ru}/*.html          # verbatim HTML archive (source of truth)
  _raw/media-by-page.json         # page -> media URLs map
  _tool/convert.js                # HTML->Markdown converter (turndown + node-html-parser)
  {fi,en,ru}/*.md                 # readable Markdown per route
  {fi,en,ru}/catalog/<slug>.md    # product detail pages
  assets/<original url path>/...  # 186 downloaded media files (~59 MB)
  media-manifest.csv              # media URL -> local asset path -> referencing pages
```

Each `.md` has YAML front-matter (`source_url`, `locale`, `route`, `scraped`, `title`),
the page content, and a trailing `## Media` section listing that page's images/media with
both their live URL and local `assets/…` path.

### Media

- **187** unique media references; **186** downloaded into `scraped_content/assets/`
  (images, fonts `.woff2`, one `.mp4` hero video). Paths mirror the live URL structure
  (`assets/files/land/…`, `assets/images/photo/…`, `assets/fonts/…`, `assets/i/logo.svg`).
- **1 broken reference** on the live site itself (404): `https://monebeauty.fi/i/icon__slider-next.svg`
  — kept in `media-manifest.csv` with no local file.
- Full inventory: **`scraped_content/media-manifest.csv`**.

### Brand / contact facts (from the live site)

- **Name:** Mone Beauty Clinic — aesthetic-medicine clinic, Helsinki. Positioning:
  "Next-Generation Aesthetic Medicine — a comprehensive approach to beauty, skin health,
  and the natural harmony of face, body, and hair." (The prior live site branded itself
  "Mone Beauty Club" / instrumental cosmetology; per `SCOPE.md` the brand is now **Clinic**.)
- **Address:** Solvikinkatu 5, 00990 Helsinki, Finland.
- **Phone:** +358 40 129 3800 · **Email:** info@monebeauty.fi
- **Hours:** by appointment (FI: "Ma–Su: Sopimuksen mukaan").
- **Socials:** Instagram, Facebook, WhatsApp.
- **Product brands:** AROSHA (body), DIXIDOX / De Luxe (trichology). Price band ≈ €39–€85.
- To refresh the scrape: re-download via `_raw`, re-run `scraped_content/_tool/convert.js`.

## Project Guardrails — do not deviate

The build is governed by these binding docs. **Read them before any build work**, and do
not deviate without updating them first:

- `SCOPE.md` — product scope/features (booking, CRM, admin, chatbot, e-commerce, GDPR).
- `REQUIREMENTS.md` — distilled, authoritative requirements.
- `IMPLEMENTATION_PLAN.md` — phased build roadmap.

**Source-of-truth hierarchy:**

- **`SCOPE.md` is the authoritative client brief** — it governs **brand, positioning, IA
  structure, and product features**. Where it conflicts with `scraped_content/` (e.g. brand
  name, aesthetic-medicine positioning, homepage structure), **`SCOPE.md` wins**.
- **`design_handoff_mone_beauty_clinic/` is the visual design system** (color tokens, type
  scale, spacing, radii, shadows, component styling) — and the reference for page structure.
- **`scraped_content/` supplies the existing per-locale copy, images, and video** for pages
  that already exist (services, products, about) and the real NAP/media — but no longer
  dictates brand or IA where `SCOPE.md` says otherwise.
- The user's explicit stack governs tech.

**Content-sourcing rule (do not violate):**

- **Brand, positioning, and IA/structure come from `SCOPE.md`.** Existing-page **copy,
  images, and video come from `scraped_content/`** (all 3 locales) — reuse real media; **no
  gradient placeholders where real media exists.**
- **No invented medical claims.** Where `SCOPE.md` calls for services or copy not in
  `scraped_content` (e.g. Injectable Aesthetic Medicine, Medical Consultation), stub them as
  `[CLINIC TO PROVIDE]` for clinic review — never fabricate procedure/medical text.
- Content is baked into committed registries by `scripts/gen-content.mjs`
  (`content/generated/*.json`) and media by `scripts/copy-media.mjs` (`public/media/**`);
  `scraped_content/` itself stays git-ignored. Re-run both scripts to refresh content/media.
- Brand is **Mone Beauty Clinic** (real `public/logo.svg` + `app/favicon.ico`); real NAP
  (Solvikinkatu 5, 00990 Helsinki · +358 40 129 3800 · info@monebeauty.fi); hours "By agreement".

**Locked decisions:**

- **Brand: Mone Beauty Clinic** (renamed from "Club"), aesthetic-medicine positioning per
  `SCOPE.md`.
- **Lean service booking is implemented at reduced scope** — one-click service selection →
  simplest possible flow (service picker → date/time → details + GDPR consent → on-screen
  confirmation, Prisma-persisted). Email/SMS, reminders, practitioner selection,
  reschedule/cancel are the full Phase 3 completion.
- **Current completed milestone: Phase 2 e-commerce cart/checkout** — product add-to-cart,
  `/basket`, `/checkout`, Prisma `Order`/`OrderItem` persistence, GDPR consent, and
  `/order/[id]` confirmation are implemented. Payment capture and confirmation email remain
  deferred.
- **Current completed milestone: Phase 3 booking upgrade** — booking now supports
  Service → Specialist/no preference → Time → You, availability-backed slots, overlap
  rejection, Prisma appointment persistence, and lightweight cancel/reschedule endpoints.
  Staff schedule editing UI is the next milestone.
- **Current completed milestone: Phase 4 staff schedule** — `/staff` now exposes an internal
  practitioner/date schedule editor, working-hour range application, open/closed slot
  controls, booked appointment details, and persistence to `Availability.slots`.
- **Current completed milestone: Phase 5 CRM/custom admin/auth** — custom Prisma auth now
  uses `User.passwordHash`, durable `Session` rows, and an HTTP-only session cookie.
  `/admin` is admin-only; `/staff` and `/api/staff/schedule` require staff/admin and staff
  users are restricted to their linked `Practitioner`. Admin includes CRM client search and
  profiles, audited contraindication view/edit events, services, generated content-page
  overrides, products, pricing, and blog management. Run `npm run db:migrate`,
  `npm run db:seed` with `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and `npm run db:sync-content` when
  preparing a target database.
- **Phase 6 notifications/reminders are intentionally skipped/deferred** per user direction.
  Booking/order confirmations, reminders, staff alerts, and email/SMS provider integration
  remain future work.
- **Current completed milestone: Phase 7 AI chatbot** — the public ChatWidget now uses
  Anthropic Claude with approved-content retrieval, EN/FI/RU locale matching, GDPR consent,
  transcript persistence in `ChatSession`, booking deep-links, and human handoff. Admin
  handoff review lives at `/admin/chat`. Set `ANTHROPIC_API_KEY` and optionally
  `ANTHROPIC_MODEL`; run `npm run db:migrate` before relying on the new chat fields.
- **UX priority (SCOPE.md):** a visitor should select a service in **one click** and book
  with minimal friction; keep the homepage focused (avoid over-long pages) with an obvious
  "select a service" + **Book Online** path.
- **Stack is locked:** Next.js (App Router) + TypeScript + Tailwind + **Prisma** + PostgreSQL
  - `next-intl` (en/fi/ru) + `@phosphor-icons/react` (thin) + `next/font` (Cormorant Garamond
  - Jost) + `react-markdown` + Anthropic Claude API.
- **No Payload CMS.** The admin/CMS/CRM is **custom-built on Prisma**.
- **E-commerce is in scope** — the AROSHA/DIXIDOX catalog (`/catalog`, `/catalog/[slug]`,
  `/basket`, `/checkout`, `/order/[id]`) uses generated scraped product content and Prisma
  order persistence.
- **Live IA** (mirrors `monebeauty.fi`): `/`, `/about`, `/instrumental/{endosphere,laser,
mikroneulanrf}`, `/trichology`, `/arosha`, `/services` (+ 8 subpages), `/catalog` (+ products),
  `/booking`, `/basket`. Legal pages kept for GDPR.
- **Three locales** (EN/FI/RU), header language switcher, `hreflang`.

**Design fidelity:** reproduce `design_handoff_mone_beauty_clinic/01-design-system.md` tokens
**exactly** as design tokens; **mobile-first — verify at 390px first**; warm shadows only;
honor `prefers-reduced-motion`.

**Other:** GDPR/EU, accessibility (WCAG AA), and SSG/SSR performance are required throughout;
medical/personal data is special-category (encryption + RBAC + audit).

Keep `CLAUDE.md` and `AGENTS.md` byte-identical below line 1.

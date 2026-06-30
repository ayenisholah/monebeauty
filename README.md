# Mone Beauty

> Tri-lingual (🇫🇮 / 🇬🇧 / 🇷🇺) website & operational platform for **Mone Beauty Clinic** —
> a next-generation aesthetic-medicine clinic in Helsinki.

**Repository:** https://github.com/ayenisholah/monebeauty.git

> **Status: planning / spec stage.** The application has not been scaffolded yet. The
> binding specification lives in [`SCOPE.md`](./SCOPE.md), [`REQUIREMENTS.md`](./REQUIREMENTS.md),
> and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Read those before writing code.

---

## About

Mone Beauty Clinic is a licensed medical clinic (not a beauty salon) offering a comprehensive,
evidence-based approach to the beauty and health of face, body, and hair. This project is both
the **marketing website** and the **operational platform** behind it: SEO pages per treatment,
an AROSHA product shop, online booking for clients and staff, a client CRM, a custom admin/CMS,
and an AI chatbot — all tri-lingual and mobile-first.

The visual language is **luxury minimalism / Scandinavian medical-beauty**: milky-white and
beige surfaces, soft-brown and subtle-gold accents, an editorial serif (Cormorant Garamond)
paired with a clean sans (Jost). No neon, no salon-pink, no clinical white-and-blue, no heavy
black.

## Features

- **Marketing site** — long-form homepage, About, Pricing, Blog, Contact, legal pages.
- **9 SEO treatment pages** — one template, full medical content structure + JSON-LD.
- **AROSHA shop** — product catalog, product pages, cart, checkout, orders.
- **Online booking** — 24/7 client wizard + staff schedule management.
- **CRM** — client database with appointment history & flagged contraindications.
- **Custom admin / CMS** — edit content, pricing, products, blog; role-based access.
- **AI chatbot** — Claude-powered, grounded in clinic content, RU/FI/EN, human handoff.
- **Tri-lingual** — Russian, Finnish, English with `hreflang`.
- **GDPR-compliant** — consent, data rights, EU residency, audited medical data.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS (tokens from `01-design-system.md`) |
| Fonts / Icons | `next/font` (Cormorant Garamond + Jost) · `@phosphor-icons/react` (thin) |
| Database / ORM | PostgreSQL + **Prisma** |
| i18n | `next-intl` (ru / fi / en) |
| Auth | Role-based (admin / staff / client) |
| AI | Anthropic Claude API |
| Email / SMS | Resend or Postmark · Twilio or FI gateway |
| Analytics / SEO | GA4 · Search Console · `next-sitemap` |

> **Note:** the CMS/admin is **custom-built on Prisma** — Payload CMS (suggested in the design
> handoff) is intentionally **not** used.

## Repository structure

```
.
├── SCOPE.md                          # client brief — authoritative scope
├── REQUIREMENTS.md                   # distilled binding requirements
├── IMPLEMENTATION_PLAN.md            # phased build roadmap (MVP flagged)
├── CLAUDE.md / AGENTS.md             # agent guardrails (do-not-deviate rules)
├── design_handoff_mone_beauty_clinic/# design system, IA, page specs, prototype
└── scraped_content/                  # current live site captured as Markdown + media
    ├── {fi,en,ru}/                   # 50 pages per locale (routes + product pages)
    ├── assets/                       # 186 downloaded media files
    └── media-manifest.csv            # media inventory
```
The Next.js app (`app/`, `components/`, `lib/`, `prisma/`, `messages/`) will be scaffolded in
Phase 0 — see the implementation plan.

## Getting started

> These steps describe the intended setup once the app is scaffolded (Phase 0).

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (EU region for GDPR)

### Setup
```bash
git clone https://github.com/ayenisholah/monebeauty.git
cd monebeauty
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate dev      # create schema
npm run db:seed             # seed services, 31 AROSHA products, sample content
npm run dev                 # http://localhost:3000
```

### Environment variables
```ini
DATABASE_URL=postgresql://user:pass@localhost:5432/monebeauty
ANTHROPIC_API_KEY=sk-ant-...           # AI chatbot
AUTH_SECRET=...                        # session/auth
EMAIL_API_KEY=...                      # Resend/Postmark
SMS_API_KEY=...                        # Twilio / FI gateway
NEXT_PUBLIC_GA_ID=G-...                # Google Analytics 4
```

### Scripts (planned)
| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed the database |
| `npm run test` | Run tests (booking/availability logic) |

## Internationalization

Three locales — **Russian, Finnish, English** — via `next-intl` with locale-prefixed routes
and `hreflang`. Medical and legal copy is authored per-locale and **never auto-translated**.
Starting copy for each locale is captured in `scraped_content/{fi,en,ru}/`.

## Design system

The design is **strictly** defined by
[`design_handoff_mone_beauty_clinic/01-design-system.md`](./design_handoff_mone_beauty_clinic/01-design-system.md)
— its colors, fluid type `clamp()` scales, spacing, radii, warm shadows, thin Phosphor icons,
and component inventory are reproduced as design tokens. **Tokens are law**; reuse the shared
components rather than re-styling per page. A `/styleguide` page showcases them.

## Documentation index

| Document | Purpose |
|---|---|
| [`SCOPE.md`](./SCOPE.md) | Client brief — what to build |
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Binding, distilled requirements |
| [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) | Phased build roadmap |
| [`design_handoff_mone_beauty_clinic/`](./design_handoff_mone_beauty_clinic/) | Design system, IA, specs, prototype |
| [`scraped_content/`](./scraped_content/) | Real images & copy from the live site |
| [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) | Guardrails for AI agents |

## Roadmap

| Phase | Scope | |
|---|---|---|
| 0 | Scaffold + design tokens + Prisma + i18n | |
| **1** | **UI primitives, layout, homepage, 9 service pages, marketing — MVP** | ⭐ |
| 2 | E-commerce (AROSHA shop: catalog, cart, checkout) | |
| 3 | Online booking (client wizard) | |
| 4 | Staff schedule | |
| 5 | CRM + custom admin + auth | |
| 6 | Email/SMS notifications + reminders | |
| 7 | AI chatbot | |
| 8 | SEO + GDPR finalize | |

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for details and per-phase verification.

## Deployment

Target an **EU region** (e.g. Vercel EU / Hetzner / Fly EU) to keep personal and medical data
in the EU. SSL everywhere; Postgres EU-hosted.

## Contributing & commit policy

**Commits must be authored by the repository owner only.** Do not add Anthropic or Claude Code
as a co-author, author, or contributor; do not include `Co-Authored-By: Claude` trailers or
"Generated with Claude Code" lines in commit messages. Before any build work, read `SCOPE.md`,
`REQUIREMENTS.md`, and `IMPLEMENTATION_PLAN.md` and follow the guardrails in `CLAUDE.md` /
`AGENTS.md` — do not deviate without updating those documents first.

## License

Proprietary — © 2026 Mone Beauty Clinic. All rights reserved.

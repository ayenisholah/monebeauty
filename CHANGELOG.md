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

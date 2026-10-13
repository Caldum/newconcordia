# Concordia · project memory

A persistent multiplayer strategy game in the browser. Every player is a citizen of a real country: they
work, train, fight for real regions, vote and govern. This file is the summary; the detail lives in `docs/`.

## At the start of a session

1. Read `docs/progress.md`, `docs/roadmap.md` and the open PRs. Continue from the last pushed point.
2. If the task touches rules or screens, read the matching source of truth (below).
3. Read the matching `SKILL.md` in `.claude/skills/` before each kind of task (see «Skills»).

## Sources of truth (the higher one wins)

1. `docs/spec.md`: the owner's consolidated specification v3.1 (ADR 0014). Where it is silent, the sources
   below still apply. Work plan: `docs/roadmap.md`.
2. `docs/brief.md`, especially section 3 (decisions made after the GDD).
3. Screen canvas: `docs/design/canvas/*.dc.html` (visual and behavioral reference, not code). Index:
   `docs/design/README.md`.
4. Atlas design system: `docs/design/atlas/` (`tokens.json`, `README.md`, `components/*`).
5. Game design document: `docs/gdd.md` (rules and balance where the specification is silent).
6. Map: `data/map/` (`scripts/regions_map.py`, `world-regions.json`).

Interface copy: `docs/voice.md`. Game terms ↔ code names: `docs/glossary.md`. Decisions: `docs/adr/`.

## Decisions in force (specification v3.1 first)

- Business time is UTC: the game day changes at 00:00 UTC; elections follow the monthly UTC calendar
  (president day 5, party leaders day 15, Congress day 25).
- Player: civil level L at 100 × L² XP (level 0 at start, 1 GOLD per new level, once); health 0–100 with no
  passive regeneration; energy up to 100 (recharge 10 per hour kept from the GDD) plus automatic Q1–Q5 food
  every 5 minutes; military strength, XP and ranks (Novice + 15 ranks × I–V, threshold 100 × n²).
- Sign-up grant: 5 GOLD, 100 national currency, 10 Q1 food. Money in hundredths; issuance only by law or an
  explicit system reward; escrow for buy orders, bills and war authorizations.
- Companies N1–N5 (10/25/50/100/200 GOLD; civil level 5/10/20/30/40); 15 resources by region; extractors only
  where the resource exists; production formulas of spec section 5.
- Market: sell and buy orders with locked funds, partial fills, price-time priority, export tax; FX through
  GOLD pairs.
- Government: president and vice president on a monthly joint ticket; five ministries and a Central Bank
  governor; Congress of `max(8, floor(A/50))` seats by D'Hondt; bills with budget escrow; succession is atomic.
- War: authorization law with 50 GOLD escrow, only the president launches; battles of 9 rounds of 1 hour, first
  to 5; damage `floor((10 + F) × HP/100 × (1 + 0.2 Q) × (1 + 0.05 min(n, 75)))`; resistance with 10 organizers.
- Health: kits Q1–Q5; one public hospital per region (N1–N5) holding kits only; stock private to Health and
  the presidency.
- Kept from the brief: adaptive desktop web (up to 1320 px, usable from 360 px), Spanish with *tú* and
  English (ADR 0005), WCAG 2.2 AA, no keyboard shortcuts, no dark mode; immediate citizenship with a 7-day
  adaptation period; sign-up with email, password, unique immutable citizen name and country, Turnstile and
  Google; waitlists and citizenship changes (72 h, every 30 days).
- `PENDING` items of the specification (exploration, Liberating Hero, travel and license prices) ship as
  configuration with the feature off; never invent their values.

## Non-negotiable engineering rules

- **The database is the authority.** Rules live in PL/pgSQL functions (`security definer`,
  `set search_path = ''`, qualified names). RLS on every table, deny by default. The client has no
  `insert/update/delete` on tables: only `execute` on public functions. The browser never decides balances,
  damage, votes or permissions.
- One action = one transaction, validating permissions, rate limits and state, with an idempotency key.
- Money in a double-entry ledger, `bigint` hundredths, no negative balances.
- Time in `timestamptz` UTC. The game day (fixed GMT−3) comes only from `game.game_day()`. The clock is
  injectable for tests (`game.now()`).
- No magic numbers: balance parameters live in `game.balance_params`.
- Every admin action is audited (who, what, when, before and after).
- Secrets only in GitHub Secrets or Wrangler. The secret / `service_role` key never reaches the client.
- Forward-only migrations, reviewed with squawk, with the way back written in the header.

## Stack

pnpm workspaces · Node 24 LTS (`.nvmrc`) · strict TypeScript 6 (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`) · React 19 + Vite (SPA) · TanStack Router and Query · CSS Modules with Atlas
tokens · typed i18n catalogs (es, en) · zod at the edges · d3-geo + topojson-client · Supabase (Postgres,
Auth, Realtime, Edge Functions) · Cloudflare Workers (web with assets and `apps/clock` with Cron) · Resend ·
Sentry.

```text
apps/web/              React: landing, game and admin panel
apps/clock/            Cloudflare Worker with the scheduled jobs
supabase/migrations/   tables, functions and permissions, in SQL
supabase/tests/        pgTAP tests
supabase/functions/    Edge Functions (email)
supabase/seed.sql      local development fixtures
packages/db-types/     types generated from the database
packages/atlas/        Atlas tokens, base styles and components
data/map/              map scripts and TopoJSON
docs/                  brief, GDD, voice, design, ADRs, plans, progress, setup, runbook
```

## Language

Everything in the repository is in English: files, folders, identifiers, tables, columns, commits
(Conventional Commits), comments and documentation (ADR 0004). Interface copy is the exception: it lives in
per-screen message catalogs with Spanish (source) and English, never scattered in components (ADR 0005).

## Commands

```bash
pnpm install                 # dependencies (Node 24, pnpm 10)
pnpm lint                    # ESLint + Prettier, zero warnings
pnpm typecheck               # tsc in every package
pnpm test                    # Vitest in every package
pnpm build                   # production build
pnpm db:start                # local Supabase (Docker)
pnpm db:test                 # pgTAP: supabase test db
pnpm db:lint                 # squawk on the migrations
pnpm db:types                # regenerates packages/db-types from the local database
pnpm db:test:native          # pgTAP on native PostgreSQL 17, fresh database each run (no Docker, ADR 0011)
pnpm db:types:native         # regenerates packages/db-types from that native database
pnpm --filter @concordia/web e2e   # Playwright + axe
```

## Way of working

- Branches (ADR 0001): `main` is production (do not touch). `develop` is integration. Each D module on its
  own `feat/dNN-name` branch from `develop`, PR into `develop`, squash merge.
- Push early and often; draft PR from the first push; `docs/progress.md` updated on every push.
- Every game rule gets its test before its screen (TDD). Every PR: short plan (`docs/plans/`), migrations,
  functions, tests, screens, docs and the GDD acceptance test.
- Merge only with green CI and a review without open findings. Never merge destructive data changes,
  permission changes that open access, secrets or production infrastructure: leave those PRs to the owner.
- Ambiguous decision: take the most reasonable option and record it in an ADR (`docs/adr/NNNN-title.md`).
- Anything that depends on the owner's accounts goes into `docs/setup.md` as a concrete step.

## Skills (`.claude/skills/`, origin in each `SOURCE.md`, index in `docs/skills.md`)

- Starting each module: `writing-plans`; for each rule: `test-driven-development`.
- Before SQL: `supabase-postgres-best-practices` and `supabase`.
- Before the Worker or Wrangler: `workers-best-practices`, `wrangler`, `cloudflare`.
- Before each screen: `game-ui-design`, `react-best-practices`, `composition-patterns`, `accessibility`.
  When closing it: `web-quality-audit`. Landing: `seo`, `core-web-vitals`.
- Before each PR: `verification-before-completion`, `requesting-code-review`, `differential-review`.
  When adding dependencies: `supply-chain-risk-auditor`.
- On any failure: `systematic-debugging` before changing code.
- Copy: `humanizer` together with `docs/voice.md`.

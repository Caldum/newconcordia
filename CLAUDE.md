# Concordia · project memory

A persistent multiplayer strategy game in the browser. Every player is a citizen of a real country: they
work, train, fight for real regions, vote and govern. This file is the summary; the detail lives in `docs/`.

## At the start of a session

1. Read `docs/progress.md` and the open PRs. Continue from the last pushed point.
2. If the task touches rules or screens, read the matching source of truth (below).
3. Read the matching `SKILL.md` in `.claude/skills/` before each kind of task (see «Skills»).

## Sources of truth (the higher one wins)

1. `docs/brief.md`, especially section 3 (decisions made after the GDD).
2. Screen canvas: `docs/design/canvas/*.dc.html` (visual and behavioral reference, not code). Index:
   `docs/design/README.md`.
3. Atlas design system: `docs/design/atlas/` (`tokens.json`, `README.md`, `components/*`).
4. Game design document: `docs/gdd.md` (rules, balance, D01–D30 plan).
5. Map: `data/map/` (`scripts/regions_map.py`, `world-regions.json`).

Interface copy: `docs/voice.md`. Game terms ↔ code names: `docs/glossary.md`. Decisions: `docs/adr/`.

## Decisions in force that override the GDD

- Adaptive desktop web only (up to 1320 px, usable from 360 px). No mobile app.
- Interface in neutral Spanish with *tú* (never *voseo*) and English (ADR 0005). No keyboard shortcuts.
  No dark mode. WCAG 2.2 AA.
- Citizenship is immediate at sign-up. 7-day adaptation period: damage at 50 % and no vote in elections.
- Sign-up: email, password, citizen name (unique, immutable) and country. Turnstile and Google.
- Country not in play: per-country waitlist + choose another country to start; when it opens, the player
  can move keeping level, strength, Gold, items and companies.
- Citizenship change: requested from the other country; automatic or reviewed by its Interior minister by
  law; approved automatically after 72 h without an answer. Loses offices and seat. At most once every 30 days.
- Laws: only the 20 members of Congress vote, for 24 h; passes with more for than against. Tie: the vice
  president has 12 h and their vote decides on the spot; if they do not vote, the law falls. The president
  never votes.
- Citizens vote in elections every 15 days, alternating Congress and presidency; 30-day terms.
- Economy: founding a company costs 20 Gold. Ration = 1 wheat + 2 points; weapon Q = Q iron + Q points;
  fuel = 1 oil + 0.5 points. Region without a deposit 50 %, +15 % per level.
- Banks by tender (2 licenses per round). Score = collateral/10 + 20 × deposit rate − 10 × loan rate.
- Damage = 50 × (1 + √strength/10) × (1 + 0.03 × rank) × weapon × bonuses. Test case: 633 per hit.
- Battles of up to 5 rounds of 4 h; whoever wins 3 wins.
- Daily missions: work, train, 5 hits, read an article. 1 Gold; 7 days in a row, 3 extra Gold.

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

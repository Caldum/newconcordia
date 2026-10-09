# Concordia · Development brief

Version 1.1 · October 9, 2026 · Prepared for the cloud session that builds the game.
Version 1.1 translates the original Spanish brief (version 1, October 8, 2026) into English and adds two
owner decisions taken on October 9: the whole repository is in English, and the web app supports several
languages (Spanish and English to start). See ADR 0004 and ADR 0005.

Concordia is a persistent multiplayer strategy game played in the browser. Every player is a citizen of a
real country: they work, train, fight for real regions, vote in elections and govern. The game design, the
interface and the visual system are done. Your job is to build it in the **Caldum/newconcordia** repository
with the standard of a senior team with more than 10 years of experience in web development, databases and
infrastructure.

---

## 1. Sources of truth and priority order

When two sources disagree, the higher one wins:

1. **This brief**, especially section 3 (decisions made after the game design document).
2. **Interface canvas** "Concordia – App design": 52 adaptive desktop screens. https://claude.ai/artifact/E9HTeZ6v7FEpX6goibq1k9
3. **Concordia Atlas design system**: tokens, components, brand and illustrations. https://claude.ai/artifact/XPws22DAhLW4kjGiDxDvg1
4. **Game design document** (rules, balance, architecture and the D01–D30 plan). https://claude.ai/artifact/8wyzu8V8avR2hxJFKtWKUr (copy in the repo: `docs/gdd.md`)
5. **Concordia map** (TopoJSON by region and landing prototype). https://claude.ai/artifact/LaFKVR97EpeqUDEjbTj9Ug

**Handoff kit.** Everything above, plus the map scripts and the voice guide, was published as files under
`kit/` in the "Concordia · Kit de traspaso" artifact. It now lives in the repository with English names:

| In the kit | What it is | Where it lives in the repo |
| --- | --- | --- |
| `BRIEF.md` | This document | `docs/brief.md` |
| `docs/gdd.md` | Full game design document | `docs/gdd.md` |
| `docs/voz.md` | Voice and interface copy guide | `docs/voice.md` |
| `design/canvas/*.dc.html`, `canvas.json` | The 52 screens (HTML with inline styles and the logic of each state) | `docs/design/canvas/` (English file names, see `docs/design/README.md`) |
| `design/atlas/` | `tokens.json`, `README.md` (brand manual), `components/*` and `bundle.css` | `docs/design/atlas/` (English token, class and component names) |
| `design/assets/` | Logo (3 SVG), 7 section illustrations, 21 silhouettes, 58 icons | `docs/design/assets/` (originals); copies in `apps/web/src/assets/` when used |
| `mapa/` | Python scripts that build the TopoJSON from Natural Earth, `regions_map.py` (active countries and regions with a fixed code) and the generated `world-regions.json` | `data/map/` |
| `tools/flags.py` | Simplified flags used in the country picker | `docs/design/tools/` (reference for a `Flag` component) |

The `.dc.html` screens are the visual and behavioral reference, not code to copy: they use inline styles
because the editor required it. Rebuild them as React components with the Atlas tokens.

---

## 2. Role and standard

Act as a senior team: tech lead, frontend engineer, database engineer, SRE and accessibility specialist.
Every change must hold up in a demanding code review.

- **Correct before fast.** Every game rule gets its test before its screen.
- **Simple and readable.** Clear names, short functions, single-responsibility modules, no speculative
  abstractions. Code reads like technical prose.
- **Secure by default.** The server is the authority. The browser never decides balances, damage, votes or
  permissions.
- **Measurable.** Performance, coverage and accessibility budgets are checked in CI, not promised.
- **Reversible.** Forward-only migrations with a written way back, deployments with rollback, nothing
  destructive without the owner's approval.
- **Documented where it is used.** An ADR per important decision, a README per package, comments only when
  the *why* is not obvious.

---

## 3. Decisions made after the game design document (they override the GDD)

These rules were set while designing the screens. When the GDD says otherwise, this list wins. Update the
GDD in `docs/gdd.md` in the same PR that implements each rule.

**Platform and language**
- Adaptive desktop web only: content goes up to 1320 px and reflows into columns as the window shrinks.
  There is no dedicated mobile version or native app. It must stay usable from 360 px, but it is not
  designed for phones.
- The interface defaults to **neutral Spanish with *tú*** (never *voseo* or regionalisms). See
  `docs/voice.md`, which includes rules so that copy does not sound AI-written. English is the second
  supported language (ADR 0005); its copy follows the same voice rules.
- **No keyboard shortcuts.** Everything is reachable with Tab and focus is always visible, but no action has
  its own key.

**Sign-up and citizenship**
- Citizenship is immediate at sign-up: no approval and no resident status.
- The first 7 days are an adaptation period: war damage counts at 50 % and the player cannot vote in
  elections. Everything else is available from day one.
- Sign-up asks for email, password, citizen name (unique and immutable) and country. It uses Turnstile and
  offers Google.
- If the chosen country is not in play, a second step says so and puts the player on that country's
  **waitlist**. We email them when it opens. Meanwhile they pick another country to start and, when theirs
  opens, they can move keeping level, strength, Gold, items and companies.
- Later citizenship changes are requested from the other country. Depending on its laws, the request is
  approved automatically or reviewed by its Interior minister. If there is no answer within 72 hours it is
  approved automatically. On leaving, the player loses offices and their congressional seat. At most one
  change every 30 days.
- The country picker is a container with a search box and a grid of **flags** with the name below.

**Politics**
- Laws are voted **only by the 20 members of Congress**, for 24 hours. A law passes with more votes in favor
  than against.
- If there is a tie at the close, the **vice president** has 12 hours to break it. As soon as they vote, the
  law is passed or rejected. If they do not vote within that time, the law **falls**.
- **The president never votes.**
- Members of Congress and ministers propose laws, each in their own area. The president can propose war and
  peace.
- The president appoints the vice president, ministers and ambassadors, and can replace them during the term.
- Citizens vote in elections (every 15 days, alternating Congress and presidency; 30-day terms).

**Economy**
- Founding a company costs 20 Gold.
- Recipes: ration = 1 wheat + 2 work points; weapon of quality Q = Q iron + Q points; fuel = 1 oil + 0.5 points.
- Yield of a region without a deposit: 50 %. Each deposit level adds 15 %.
- Private banks by **tender** from the Central Bank: 2 licenses per round. Score = collateral / 10 + 20 ×
  deposit rate − 10 × loan rate. Each bank can take deposits up to 5 times its collateral and pay at most
  3 % per week. If it fails, its collateral is split among depositors in proportion to their balances.

**War**
- Damage per hit = 50 × (1 + √strength / 10) × (1 + 0.03 × rank) × weapon × bonuses (GDD formula, module 6).
  The screens use as an example strength 1,840, rank factor 1.36, resistance bonus 1.1 and a Q3 weapon ×1.6,
  which give 633 per hit. Use that case as a test.
- A battle has up to 5 rounds of 4 hours; whoever wins 3 wins.

**Retention**
- Four daily missions: work, train, land 5 hits and read an article (no longer "vote", because citizens do
  not vote on laws). Completing them gives 1 Gold; 7 days in a row give 3 extra Gold.

---

## 4. Architecture and stack

The GDD architecture (module 11) stays: a **modular monolith** with Supabase for data, accounts and
real time, and Cloudflare to serve the web and trigger jobs. Initial budget: US$ 0. These are the senior
adjustments on top of that base:

| Layer | Choice | Notes |
| --- | --- | --- |
| Monorepo | pnpm workspaces, Node LTS pinned in `.nvmrc` and `engines` | No Turborepo until CI time justifies it |
| Language | TypeScript `strict` (plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`) and SQL | Database types generated with `supabase gen types` in `packages/db-types` |
| Web | React 19 with Vite as a SPA | Routes with TanStack Router (typed, with per-route loading and code splitting) |
| Data on the web | TanStack Query on top of `supabase-js` | No extra global state unless needed; the database is the source |
| Styles | CSS Modules with the Atlas tokens as CSS variables | A script generates `tokens.css` from `tokens.json`. No Tailwind or visual component libraries |
| Components | Our own, following the Atlas READMEs | Accessible by construction (roles, ARIA states, focus) |
| Internationalization | Typed message catalogs per screen, Spanish and English (ADR 0005) | Spanish is the source language; a missing translation is a type error |
| Validation | zod at the edges (forms, RPC responses) | Schemas do not duplicate business rules, which live in the database |
| Map | SVG with d3-geo and topojson-client, in an isolated component | The TopoJSON is served as a static, hashed file with immutable caching |
| Game rules | PL/pgSQL functions called through RPC | One action = one transaction. `SECURITY DEFINER` with `set search_path = ''` and qualified names |
| Permissions | RLS enabled on every table, deny by default | The client has no `insert/update/delete` on tables; only `execute` on public functions |
| Money | Double-entry ledger | Amounts in `bigint` hundredths. Constraints that prevent negative balances and unbalanced entries |
| Time | `timestamptz` in UTC | The game day (fixed GMT−3, `Etc/GMT+3`) comes from a single function. Injectable clock for tests |
| Real time | Supabase Realtime, one channel per battle | Scoreboard aggregated every few seconds, not per hit |
| Jobs | Cloudflare Worker `apps/clock` with Cron Triggers | Calls idempotent functions: a runs table with a unique key per job and slot |
| Accounts | Supabase Auth with Turnstile CAPTCHA and Google | Own SMTP with Resend for Auth emails |
| Game emails | Edge Function + Resend | Waitlist, notices |
| Production web | Cloudflare Workers with static assets and SPA fallback | Security headers (strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) |
| Errors | Sentry on the web and the Worker | No personal data in events |
| Backups | Daily GitHub Action with encrypted `pg_dump` | Stored in Cloudflare R2; restore tested once a month |

Repository layout (English names, ADR 0004):

```text
apps/web/              React: landing, game and admin panel
apps/clock/            Cloudflare Worker with the scheduled jobs
supabase/migrations/   tables, functions and permissions, in SQL
supabase/tests/        pgTAP tests of the rules
supabase/functions/    Edge Functions (emails)
supabase/seed.sql      local development fixtures
packages/db-types/     types generated from the database
packages/atlas/        Atlas tokens, base styles and components
data/map/              map scripts and generated TopoJSON
docs/                  brief, GDD, voice, design, ADRs and progress
```

**Language.** Everything in the repository is in English: file and folder names, identifiers, tables and
columns, commits, comments and documentation. The only exception is interface copy, which lives in the
message catalogs of each screen (Spanish and English), never scattered through components, and the design
references in `docs/design/` whose content is the Spanish interface itself. Keep the mapping between game
terms in Spanish and code names in `docs/glossary.md` (Oro → `gold`, Crédito → `credit`, ración → `ration`,
golpe → `hit`, banca → `seat`…).

---

## 5. Engineering standards

**Code**
- ESLint (flat config) with `typescript-eslint` `strictTypeChecked`, `eslint-plugin-react-hooks`,
  `eslint-plugin-jsx-a11y` and import ordering. Prettier for formatting. Zero warnings in CI.
- No `any`. Expected errors are modeled as typed results, not generic exceptions.
- Small, presentational components; data logic in hooks per domain (`useWork`, `useBattle`…).
- No dead code, no TODO without an issue, no unused dependencies. Every new dependency is justified in its PR.

**Database**
- Changes only through versioned migrations in the repo, reviewed with `squawk` (or equivalent) and tested
  in the staging project before production.
- Foreign keys, `check`, `not null` and `unique` express every rule that can be expressed. Indexes for every
  frequent query, justified with `explain`.
- A balance parameters table (GDD module 12); no magic numbers in functions.
- Every player action validates permissions, rate limits and state in the same function, and accepts an
  idempotency key.
- Every admin action is logged: who, what, when, before and after.
- Energy and the day change are computed when the player arrives; no job walks over every player.
- Follow the GDD rules to stay within the free plan (damage aggregated per player and battle, real time only
  in battles).

**Security**
- OWASP ASVS level 2 as a checklist. Secrets only in GitHub Secrets and Wrangler; never in the repo or the
  browser (the `service_role` key never reaches the client).
- Review every `SECURITY DEFINER` function and every RLS policy with pgTAP tests that try to bypass them.
- Dependencies with Dependabot or Renovate, `pnpm audit` and CodeQL in CI. GitHub Actions pinned by SHA,
  with least privilege.

**Accessibility (WCAG 2.2 AA)**
- Semantic HTML first; ARIA only where HTML falls short.
- Visible focus (3 px `info` ring with a white halo), logical order, touch targets of at least 44 px and
  56 px for primary buttons.
- Color is never the only signal. Contrast of 4.5:1 for text and 3:1 for control borders.
- `prefers-reduced-motion` respected; no animation lasts longer than 500 ms.
- Notices in `aria-live` regions, forms with errors tied to their field.
- Automated tests with `@axe-core/playwright` on every screen and manual review with keyboard and screen
  reader on the critical flows.
- `<html lang>` always matches the active language.

**Performance**
- Budgets in CI: initial app JavaScript ≤ 170 kB compressed; landing with LCP < 2.5 s, INP < 200 ms and
  CLS < 0.1 in Lighthouse CI with a slow mobile profile.
- The map (0.9 MB) loads lazily with immutable caching. Fonts load with `font-display: swap` and a Latin subset.
- Every web query asks only for the columns it uses and is paginated.

**Tests**
- pgTAP for every database function and policy (including abuse cases).
- Vitest and Testing Library for hooks and components.
- Playwright for the full journeys of each D module, plus the acceptance test the GDD defines for that module.
- Simulated clock for everything that depends on time (rounds, 72 hours, energy recharge).
- Minimum coverage: 90 % for rule SQL functions, 80 % for the web.

**CI/CD (GitHub Actions)**
- On every PR: install with cache, lint, types, unit tests, pgTAP against local Postgres (Supabase CLI),
  build, size budgets, Playwright with axe, migration review and CodeQL.
- On merge to `develop`: migrations and deployment to staging. Production from `main` with manual approval
  on a protected *environment* (ADR 0001).
- Jobs that need secrets are skipped with a clear notice while the secret does not exist, so CI stays green
  while the owner creates the accounts.

**Operations**
- Structured logging in the Worker; a job runs table with duration and result; a health route.
- Basic alerts: a failing scheduled job, new errors in Sentry, a database close to the plan limits.
- `docs/runbook.md` with how to deploy, roll back, restore a backup and rotate secrets.

---

## 6. Interface: implement Atlas faithfully

- The tokens in `docs/design/atlas/tokens.json` are the only source of colors, type, spacing, radii and
  shadows. Generate `packages/atlas/tokens.css` from that file with a script and a test that fails if they
  drift apart.
- Typography: Archivo (titles 800 at 112 to 122 % width, figures 800 at 124 % and tabular) and EB Garamond
  italic only for place names.
- Surfaces: `land` for everyday content, `ink` for decisions and scoreboards, `nation` for what belongs to
  the player, `sea-deep` for the map. Flat panels with a 1 px inner border and no shadow.
- The Atlas components (`Button`, `Status`, `Scoreboard`, `Silhouette`, `Track`, `Field`, `CountryPicker`,
  `Option`, `Segmented`, `Note`, `Steps`, `Panel`, `Stage`, `CountryBar`, `Document`, `SectionHeader`) are
  built first, with example stories and accessibility tests.
- Every canvas screen is rebuilt with those components. Use their example states (the `data-props`
  attributes and the `renderVals` logic) as test cases.
- Logo: a circular map of eight regions with one in dispute (red, or the player's country color inside the
  game). Section illustrations only appear in the SectionHeader component.
- Copy: take it from the canvas, which is already reviewed. Every new text follows `docs/voice.md`, and gets
  its English version in the same change.
- No dark mode. No keyboard shortcuts.

---

## 7. Skills you must use

They are installed in `.claude/skills/` (each in its folder, with its `LICENSE` and a `SOURCE.md` with the
source repository and commit), so future sessions have them too. Index: `docs/skills.md`. Read the matching
`SKILL.md` before each kind of task, even if the session does not load it on its own.

| For | Skills | Source (reviewed commit) |
| --- | --- | --- |
| Way of working: planning, TDD, debugging, verifying before calling something done, code review | `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | [obra/superpowers](https://github.com/obra/superpowers) @ 8ca22db (MIT) |
| Postgres and Supabase: schema, RLS, indexes, functions, Auth, Realtime, Edge Functions | `supabase-postgres-best-practices`, `supabase` | [supabase/agent-skills](https://github.com/supabase/agent-skills) @ c9be0e9 (MIT) |
| Cloudflare: Workers, Wrangler, Cron, Turnstile, Durable Objects (if Realtime falls short), web performance | `workers-best-practices`, `wrangler`, `cloudflare`, `turnstile-spin`, `durable-objects`, `web-perf` | [cloudflare/skills](https://github.com/cloudflare/skills) @ a18ffe2 |
| React: performance, component composition, interface guidelines | `react-best-practices`, `composition-patterns`, `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) @ 063bee9 (the Next.js parts do not apply: this is a Vite SPA) |
| Web quality: accessibility, Core Web Vitals, best practices, audit | `accessibility`, `performance`, `core-web-vitals`, `best-practices`, `web-quality-audit`, `seo` (landing only) | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) @ afa8da9 (MIT) |
| Game interface and visual design | `game-ui-design`, `frontend-design` | [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) @ e8dcf4e (Apache 2.0) and [anthropics/skills](https://github.com/anthropics/skills) @ 683bc88 |
| Browser testing of the web | `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) @ 683bc88 |
| Security: diff review, dangerous APIs, supply chain, static analysis | `differential-review`, `sharp-edges`, `supply-chain-risk-auditor`, `semgrep` | [trailofbits/skills](https://github.com/trailofbits/skills) @ 82fe822 (CC BY-SA 4.0: keep attribution and license) |
| Interface copy | `humanizer`, together with `docs/voice.md` | [blader/humanizer](https://github.com/blader/humanizer) @ 225a6f3 (MIT) |

When to use each group:
- At the start of each D module: `writing-plans`, then `test-driven-development` for each rule.
- Before writing SQL: `supabase-postgres-best-practices`. Before touching the Worker or Wrangler:
  `workers-best-practices` and `wrangler`.
- Before each screen: `game-ui-design`, `react-best-practices` and `accessibility`. When closing the
  screen: `web-quality-audit`.
- Before opening each PR: `verification-before-completion`, `requesting-code-review` and
  `differential-review`. When adding dependencies: `supply-chain-risk-auditor`.
- On any failure: `systematic-debugging` before changing code.

---

## 8. Way of working

1. **Start.** Request write access to `Caldum/newconcordia` with `add_repo` (`access: "push"`), clone it and
   call `register_repo_root`. Read the kit and the skills.
2. **Project memory.** `CLAUDE.md` at the root summarizes this brief (priorities, section 3 decisions,
   stack, standards, commands, way of working) in fewer than 200 lines and points to `docs/` for detail.
   `docs/progress.md` holds the D01–D30 table and is kept up to date.
3. **Branches (ADR 0001).** `main` is production and only changes with the owner's approval. `develop` is the
   integration branch. Every D module gets its own `feat/dNN-name` branch from `develop` and returns through
   a squash-merged PR.
   - **Push early and often.** The session can stop at any time (for example, a usage limit) and anything not
     on GitHub is lost. Push the module branch after every step with green tests and open the PR as a draft
     from the first push. Update `docs/progress.md` on every push so another session can pick up from there.
   - **When resuming**, read `docs/progress.md` and the open PRs first, and continue from the last pushed
     point instead of starting over.
4. **One D module per branch and PR**, in the GDD dependency order. Each PR includes: a short plan,
   migrations, functions, tests, screens, updated documentation and the GDD acceptance test passing.
   Conventional Commits.
5. **Merge it yourself** (squash) when CI is green, the review with the section 7 skills leaves no open
   findings and the acceptance test passes. **Do not merge** and leave the PR for the owner if it includes:
   deleting or rewriting data, permission or RLS changes that open access, changes to secrets or production
   infrastructure, or a dependency without a permissive license.
6. **ADR** in `docs/adr/` for every decision that changes the architecture or departs from this brief, with
   context, options and consequences.
7. **When something depends on the owner**, do not invent it or skip it silently: get it as far as possible
   without credentials, write it down in `docs/setup.md` as a concrete step and carry on with whatever does
   not depend on it.

**What the owner needs** (written in `docs/setup.md`, with exact text of what to copy and where to paste it):
- Two Supabase projects (staging and production): URL, publishable key, secret key, database password and
  project ref.
- A Cloudflare account: account ID, API token with Workers and R2 permissions, Turnstile site key and secret.
- A Resend account with a verified domain, or the free subdomain meanwhile.
- A Sentry project (DSN) and Google OAuth credentials.
- Protection for `main` and `develop`, and the `production` *environment* with manual approval on GitHub.

---

## 9. Scope of this first session

Move forward in this order and get as far as possible with full quality. A half-finished module is not merged.

1. Phase 0: **D01** (repository and automated delivery) and **D02** (clock and game day).
2. **Atlas in code**: `packages/atlas` with tokens, base styles and the section 6 components, with
   accessibility tests.
3. Phase 1: **D03** (world: 13 countries and 78 regions with a fixed code from `regions_map.py`), **D04**
   (map), **D05** (accounts, with the landing, sign-up, sign-in and password recovery from the canvas),
   **D06** (citizenship with the section 3 rules, including the waitlist) and **D07** (admin panel).

At the end of the session (or if something only the owner can solve stops you), leave:
- `docs/progress.md` updated: what is merged, what is in a PR and what comes next.
- `docs/setup.md` with the owner's pending steps.
- A short final summary with the open or merged PRs, what can be tested and what is missing.

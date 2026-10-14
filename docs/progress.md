# Progress

Last update: 2026-10-29.

Branches: `main` (production, changes only with the owner's approval) · `develop` (integration) ·
`feat/dNN-*` (one per module, PR into `develop`).

## Status per module

| Code | Module | Phase | Status | PR |
| --- | --- | --- | --- | --- |
| D01 | Repository and automated delivery | 0 · Base | Merged | [Caldum/newconcordia#1](https://github.com/Caldum/newconcordia/pull/1) |
| D02 | Clock and game day | 0 · Base | Merged | [Caldum/newconcordia#3](https://github.com/Caldum/newconcordia/pull/3) |
| — | Atlas in code (`packages/atlas`) | 0 · Base | Merged | [Caldum/newconcordia#4](https://github.com/Caldum/newconcordia/pull/4) |
| D03 | World: countries, regions and owners | 1 · World and accounts | Merged | [Caldum/newconcordia#5](https://github.com/Caldum/newconcordia/pull/5) |
| D04 | Game map | 1 · World and accounts | Merged | [Caldum/newconcordia#6](https://github.com/Caldum/newconcordia/pull/6) |
| D05 | Accounts | 1 · World and accounts | Merged | [Caldum/newconcordia#7](https://github.com/Caldum/newconcordia/pull/7) |
| D06 | Citizenship | 1 · World and accounts | Merged | [Caldum/newconcordia#8](https://github.com/Caldum/newconcordia/pull/8) |
| D07 | Admin panel | 1 · World and accounts | Merged | [Caldum/newconcordia#9](https://github.com/Caldum/newconcordia/pull/9) |
| D08 | Profile and energy | 2 · Basic economy | In review | `feat/d08-profile` |
| D09 | Ledger and currencies | 2 · Basic economy | In review | `feat/d09-ledger` (on D08) |
| D10 | Companies and work | 2 · Basic economy | In review | `feat/d10-companies` (on D09) |
| D11 | Market | 2 · Basic economy | In review | `feat/d11-market` (on D10) |
| D12 | Products and consumption | 2 · Basic economy | In review | `feat/d12-products` (on D11) |
| D13 | Daily missions | 2 · Basic economy | Pending | — |
| D14 | Training | 3 · War | Pending | — |
| D15 | Battles and rounds | 3 · War | Pending | — |
| D16 | Combat and damage | 3 · War | Pending | — |
| D17 | Live battle | 3 · War | Pending | — |
| D18 | Conquest and hospitals | 3 · War | Pending | — |
| D19 | Parties and elections | 4 · Politics | Pending | — |
| D20 | Government offices | 4 · Politics | Pending | — |
| D21 | Laws and votes | 4 · Politics | Pending | — |
| D22 | Resources and deposits | 5 · Advanced economy | Pending | — |
| D23 | Banks and partnerships | 5 · Advanced economy | Pending | — |
| D24 | Currency exchange and issuance | 5 · Advanced economy | Pending | — |
| D25 | Press and news | 6 · Society and retention | Pending | — |
| D26 | Messages and notifications | 6 · Society and retention | Pending | — |
| D27 | Tutorial and achievements | 6 · Society and retention | Pending | — |
| D28 | Fair play | 7 · Closed beta | Pending | — |
| D29 | Operations and monitoring | 7 · Closed beta | Pending | — |
| D30 | Beta launch | 7 · Closed beta | Pending | — |

## Log

- 2026-10-09 · Initial commit on `main`: brief, GDD, voice, canvas, Atlas, assets, map and skills.
- 2026-10-09 · D01 opened as a draft PR: monorepo, web shell, security baseline migration, CI, CodeQL, deployment (skipped without credentials).
- 2026-10-09 · [Caldum/newconcordia#2](https://github.com/Caldum/newconcordia/pull/2) merged. The owner asked for the whole repository in English and for i18n (Spanish and English): `chore/english-repository` renames and translates the handoff kit (ADR 0004, ADR 0005).

- 2026-10-09 · D01 merged. D02: game clock, game day, idempotent jobs and the clock Worker, verified end to end against local Supabase.

- 2026-10-09 · D02 merged. Atlas: tokens, base styles, 16 components plus Icon, Flag and Brand, gallery with axe, contrast, 360 px and keyboard checks.
- 2026-10-09 · Atlas merged.
- 2026-10-09 · D03: fixed region codes, world.json (250 countries, 78 regions), countries and regions tables with public reads.

- 2026-10-09 · D04: map route with owners and colors from the database, keyboard search, zoom buttons, CSP with the exact Supabase origin, e2e acceptance against local Supabase.
- 2026-10-09 · D04 merged. D05: Supabase Auth with email and Google, Turnstile through Auth, citizen created with the sign-up (unique, immutable name; reservations), bilingual email templates, landing, sign-up, sign-in, recovery and verification screens, e2e journeys reading the local mailbox.
- 2026-10-09 · D05 merged. D06: citizen numbers and capital residence, 7-day adaptation rules, waitlist at sign-up, citizenship changes with review by the Interior minister or president and the hourly 72-hour job, welcome document.
- 2026-10-09 · D06 merged. D07: admins table, country and region switches applied at the day change, append-only action log, admin panel, inactive countries gray on the map.
- 2026-10-09 · D07 merged. Phase 1 complete.
- 2026-10-09 · D08: balance parameters table, player stats, energy computed on arrival (10 per hour up to
  100) and spent under a lock, level and rank derived (ADR 0009), energy in the game bar, profile screen.
  The web now uses auth-js and postgrest-js instead of supabase-js (initial JS 167.7 → 147.2 kB), auth
  errors no longer call every server failure «no connection», and `.gitattributes` keeps LF on Windows.
- 2026-10-09 · D09: double-entry ledger (currencies, accounts, append-only postings, idempotent posting),
  welcome grant of 5 Gold and 50 Credit after confirmation, transfers between citizens, balances in the bar
  and the account screen (ADR 0010). Local development without Docker: pgTAP on native PostgreSQL
  (`pnpm db:test:native`) and the web against a hosted development project (ADR 0011).
- 2026-10-09 · D10: goods and recipes, country policies, companies with cash, stock, level and quality, jobs
  and the daily workday with wage and work tax in one transaction (ADR 0012). Database types now generate
  from native PostgreSQL (`pnpm db:types:native`).
- 2026-10-09 · D11: player inventories, one market per country with VAT included, tariff on imports and the
  1 % fee leaving the game, offers that hold their units, purchases into the inventory or a company's depot
  (ADR 0013).
- 2026-10-09 · D12: rations to eat (10 energy each, up to 200 from food per game day), weapon multipliers,
  goods between depots and inventories, the account becomes «Inventario y cuenta».
- 2026-10-13 · The owner's specification v3.1 becomes the source of truth (`docs/spec.md`, ADR 0014). It
  redefines rules D02 and D08–D12 implemented and replaces D13–D30 with the stages of `docs/roadmap.md`. The
  development project `concordia-dev` runs D01–D12.
- 2026-10-13 · R1: the game day is UTC (day change at 00:00 UTC, dates on the web in UTC); health 0–100;
  civil level at 100 × L² from level 0 with 1 GOLD per new level, paid once; military XP and the rank ladder
  Novice → General V; starting strength 0; the profile shows health and the rank with its XP bar (ADR 0015).
  The clock Worker tests run in one workerd process.
- 2026-10-13 · R2: holds in escrow accounts with capture and release, minting only for listed reasons,
  every mint and burn recorded, sign-up grant of 5 GOLD, 100 national currency and 10 rations (Q1 food),
  held money on the account, and the statement fixed for company counterparties (ADR 0016).
- 2026-10-13 · R3: the spec's goods (food, military and medical raw; food, weapons and kits Q1–Q5),
  holders, inventory lots with an immutable origin taken oldest first, an append-only movement log, offers
  with one origin, and the old goods mapped and retired (ADR 0017).
- 2026-10-13 · R4: automatic food every 5 minutes on a UTC grid, lowest sufficient quality, up to +10 per
  interval, caught up on arrival without jobs; manual eating and the daily cap removed (ADR 0018).
- 2026-10-13 · D08 to R4 merged into `develop` at the owner's request. Web architecture (ADR 0019): every
  component in its own file and free of database calls (ESLint enforces it), actions through
  `useGameAction`, a `game` layout route with `useCurrentCitizen()`, shared name lookups, pure rules in
  tested modules. The development project runs R1 to R4.
- 2026-10-14 · R5: 15 resources across the 78 regions, national bonus, companies N1–N5 (extractors on their
  resource, quality = level), regular, second and management shifts, the output formulas with health and
  bonus, no production without inputs, foreign owners with the host surcharge (ADR 0020).
- 2026-10-14 · R6: buy orders that lock limit × quantity in an escrow, price-time matching at the offer's
  price with the difference refunded, partial fills, cancellation, the export tax to the production country,
  foreign market licenses configured off; a «Buy orders» market tab (ADR 0021).
- 2026-10-14 · R6 amended by the owner: buy orders removed; foreign market licenses cost 10 GOLD (5 to the
  market country, 5 burned), are permanent and required; Buy and Sell choose among the own and licensed
  markets, and a sale abroad shows the export tax (ADR 0022).
- 2026-10-15 · R7: personal medical kits (5 × Q HP up to 100, usable at zero health, the whole kit spent,
  refused at full health) and the Stage 1 journey: work → produce a kit → sell → buy → consume, with the
  ledger balanced (ADR 0023). Stage 1 is complete.
- 2026-10-16 · G1: parties (50 GOLD burned), membership, donations into party accounts, and the monthly party
  leaders' election on day 15 with an immutable snapshot, secret ballots, validation and proclamation on day
  16 at 12:00 (generic elections reused by G2); a «Politics» section (ADR 0024).
- 2026-10-17 · G2: the presidential ticket (day 5) and Congress by D'Hondt (day 25) with seats
  max(8, floor(A/50)), snapshot when candidacies close, party fees, mandates, offices, term limit and
  rewards; an Elections tab (ADR 0025).
- 2026-10-18 · G3: five ministries and the Central Bank governor appointed by the president, one national office
  per person, atomic succession with the exceptional rule, seats passed down the list, Congress motions for
  resignation, removal for inactivity and impeachment, minister rewards; a Government tab (ADR 0026).
- 2026-10-19 · G4: bills with initiative limits per term, 24-hour votes, quorum and simple majority with the vice
  president's tie-break (also on resignations), budget escrow from presentation, atomic execution or approved but
  not executed; tax and Gold transfer laws; presidential decrees; a Laws tab (ADR 0027).
- 2026-10-20 · G5: ministry and Central Bank accounts, budgets for ministries and currency issuance by law,
  ministerial payments and purchases within competences, the public audit of institutional money, ministry stock
  private to its minister and the president; a Finances tab (ADR 0028).
- 2026-10-21 · G6: FX offers of every national currency against GOLD with locked funds and partial takes, the
  Central Bank funded by law and trading through its governor, its transfers to the Treasury and single-use
  authorizations for companies; an Exchange tab in the market. Stage 2 complete (ADR 0029).
- 2026-10-22 · H1 + H2: personal training centers Basic, Advanced and Elite N1–N5 with one session per UTC day,
  burned fees and upgrades, strength and civil XP, injuries after the gains, the game dice, zero health blocks
  training; a Military section with the training page (ADR 0030).
- 2026-10-23 · H3: public hospitals per region built and upgraded with Health's GOLD, kits only, the lowest
  sufficient compatible kit, care policies with their log, stock private to Health and the presidency; a
  Hospital tab. Stage 3 complete (ADR 0031).
- 2026-10-24 · W1: war authorization laws locking 50 GOLD until the president launches (burned) or 24 hours pass
  (refunded), cancellation by the president, enemy designation by law (ADR 0032).
- 2026-10-25 · W2 + W3: battles for regions in hourly rounds, first to 5, ties to the defender, cooldown and
  annexation; attacks with the damage formula, weapons with uses, additive XP bonuses for the enemy and the
  priority battle, injuries after the gains; battle pages with a live score (ADR 0033).
- 2026-10-26 · W4: resistance in occupied regions with ten organizers burning 2 GOLD each, an immediate battle
  with the occupier defending, the region returned and 5 GOLD to each organizer on victory (ADR 0034).
- 2026-10-27 · W5: alliances by laws of both nations, broken relations, economic and arms embargoes enforced on
  the market, peace, allies fighting remotely and treated by «allies» hospitals, travel shipped off until PD-03
  (ADR 0035).
- 2026-10-28 · W6: the independence war as an audited sandbox (off until PD-02): nationals against an NPC until an
  admin-set target or 7 days, and the Liberating Hero title. Stage 4 complete (ADR 0036).
- 2026-10-29 · L1: a write rate limit for every action through PostgREST's pre-request hook (HTTP 429), hourly
  anti-abuse signals (shared addresses, self-trading, large transfers, inconsistent holds, ledger imbalance) for
  admins to review (ADR 0037).

## Next step

Stages 1 to 4 (R1–R7, G1–G6, H1–H3, W1–W6) are on `develop` and in the development project. Next, Stage 5
of `docs/roadmap.md`:

1. L2–L5: notifications and telemetry, backups and compensating entries, onboarding
   and daily missions, terms and closed beta.
2. Deploy the clock Worker again: it has a new cron (`5 * * * *`, elections).
3. The owner's pending steps in `docs/setup.md` (environments, Supabase, Cloudflare, Turnstile, Resend,
   Google, legal texts) to see the game in staging.

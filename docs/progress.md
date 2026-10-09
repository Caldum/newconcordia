# Progress

Last update: 2026-10-09.

Branches: `main` (production, changes only with the owner's approval) · `develop` (integration) ·
`feat/dNN-*` (one per module, PR into `develop`).

## Status per module

| Code | Module | Phase | Status | PR |
| --- | --- | --- | --- | --- |
| D01 | Repository and automated delivery | 0 · Base | Merged | [Caldum/newconcordia#1](https://github.com/Caldum/newconcordia/pull/1) |
| D02 | Clock and game day | 0 · Base | Merged | [Caldum/newconcordia#3](https://github.com/Caldum/newconcordia/pull/3) |
| — | Atlas in code (`packages/atlas`) | 0 · Base | Merged | [Caldum/newconcordia#4](https://github.com/Caldum/newconcordia/pull/4) |
| D03 | World: countries, regions and owners | 1 · World and accounts | Merged | [Caldum/newconcordia#5](https://github.com/Caldum/newconcordia/pull/5) |
| D04 | Game map | 1 · World and accounts | In PR | `feat/d04-map` |
| D05 | Accounts | 1 · World and accounts | Pending | — |
| D06 | Citizenship | 1 · World and accounts | Pending | — |
| D07 | Admin panel | 1 · World and accounts | Pending | — |
| D08 | Profile and energy | 2 · Basic economy | Pending | — |
| D09 | Ledger and currencies | 2 · Basic economy | Pending | — |
| D10 | Companies and work | 2 · Basic economy | Pending | — |
| D11 | Market | 2 · Basic economy | Pending | — |
| D12 | Products and consumption | 2 · Basic economy | Pending | — |
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

## Next step

D04 in review. Next: D05 (accounts) on `feat/d05-accounts`.

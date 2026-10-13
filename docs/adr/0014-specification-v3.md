# 0014 · Specification v3.1 becomes the source of truth

Date: 2026-10-13 · Status: Accepted

## Context

On 2026-10-12 the owner delivered the consolidated functional specification (GDD + SRS) v3.1, now
`docs/spec.md`. Its section 0 says recent decisions take precedence. It redefines rules that modules D01–D12
already implemented from the brief and the GDD (levels, sign-up grant, food, companies, market, the game day)
and specifies the modules still to build (government, health, war, diplomacy) differently from the GDD.

## Decisions

1. **Order of the sources of truth:** `docs/spec.md` first; then `docs/brief.md`, the canvas, Atlas, the GDD and
   the map data as before. Where the specification is silent, the earlier sources still apply.
2. **The stack stays.** Section 8 calls Next.js, NestJS and Redis a suggestion, «not a functional decision». The
   current stack (PostgreSQL as the only source of truth with rules in PL/pgSQL, Supabase Auth and PostgREST,
   Cloudflare Workers and Cron, React SPA) meets every requirement the specification states: ACID transactions,
   idempotency keys, UTC timestamps, versioned rules and an audit trail. Real time for battles and markets uses
   Supabase Realtime instead of a custom WebSocket server.
3. **Business time is UTC** (section 12.1, invariant 6). The game day changes at 00:00 UTC instead of 03:00 UTC
   (GMT−3). Elections follow the section 3 calendar in UTC.
4. **What D01–D12 must change** (realignment, Stage 1 of `docs/roadmap.md`):

   | Built | Was | Specification |
   | --- | --- | --- |
   | Game day (D02) | GMT−3 | UTC |
   | Levels (D08) | 10 × (n − 1)² experience, level 1 at start | Civil level L at 100 × L² XP, level 0 at start, 1 GOLD per new level, once |
   | Player (D08) | Energy, strength, damage, influence | Adds health 0–100 (no passive regeneration), military XP and the 76-step rank ladder; strength from training centers |
   | Sign-up grant (D09) | 5 Gold, 50 Credit | 5 GOLD, 100 national currency, 10 Q1 food |
   | Ledger (D09) | Postings, issuer and sink | Adds holds (escrow) for buy orders and bills, explicit mint and burn records, public audit of institutional money |
   | Goods (D10–D12) | Wheat, iron, oil, ration, weapons Q1–Q5, fuel | 15 resources by region into 3 generic raw materials (food, military, medical); food, weapons and medical kits Q1–Q5; inventory lots with immutable origin country |
   | Companies (D10) | 20 Gold, levels 1–3, 10 points per workday | N1–N5 (10/25/50/100/200 GOLD, civil level 5/10/20/30/40), 5–25 paid shifts per day, extractors only where the resource exists, `floor(150 × efficiency × health/100 × (1 + bonus))`, manufacturing outputs and inputs per quality, owner management shift per company, second shifts by authorization, foreign owners with a construction surcharge |
   | Market (D11) | Sell offers only | Sell and buy orders, money locked by buy orders, partial fills, price-time priority, export tax, foreign market licenses, embargoes |
   | Food (D12) | Manual rations, 200 per day | Q1–Q5 food (10–50 energy) consumed automatically every 5 minutes, up to +10 per interval |
   | Weapons (D12) | One spent per hit | Equipped manually, Q uses, +20 % × Q damage |

5. **Rules the specification does not mention stay** as decided in the brief and GDD, marked as such in each
   module's ADR: energy recharge of 10 per hour up to 100, the 7-day adaptation period, citizenship changes,
   work tax, VAT, import tariff and the 1 % market fee, daily missions, private banks by tender. They are
   revisited only if the owner says so.
6. **Superseded and not built:** the GDD's field hospitals, 4-hour rounds, best of 5, the damage formula with
   rank factor 0.03 and the 633-per-hit test case, 15-day alternating elections, the 20-seat Congress and
   training once a day for +10. The specification's versions replace them.
7. **Pending values stay off.** Exploration (PD-01), the Liberating Hero (PD-02), travel and license prices
   (PD-03) and other `PENDING` items get their configuration and contracts with the feature disabled; no value is
   invented as confirmed.
8. **Migrations stay forward-only.** The realignment changes D08–D12 with new migrations, never by editing
   applied ones (the development project already runs them).

## Consequences

- `docs/roadmap.md` replaces the D13–D30 list of the GDD's development plan with the specification's stages.
- Branches D08–D12, still in review, carry rules the specification replaces; the realignment branches build on
  them and change those rules forward.
- `CLAUDE.md` lists the decisions in force from the specification.

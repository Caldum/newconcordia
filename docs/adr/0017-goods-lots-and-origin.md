# 0017 · Goods catalog, inventory lots and origin

Date: 2026-10-13 · Status: Accepted

## Context

Specification v3.1 replaces the GDD's goods (wheat, iron, oil, rations, fuel, weapons) with three generic raw
materials and three product lines in Q1–Q5: food, weapons and medical kits (section 5). Inventories are
separate per holder (citizen, company, ministry, hospital) with logged transfers (section 1), and embargoes
work by country of origin, recorded immutably on production lots so origin cannot be laundered (section 5).
D10–D12 kept one quantity per player and good, and one per company and good, with no origin.

## Decisions

1. **Catalog.** `food_raw`, `military_raw`, `medical_raw`; `food_q1–5` (Q food raw per unit, 10 × Q energy),
   `weapon_q1–5` (10 × Q military raw, damage ×(1 + 0.2 Q)), `kit_q1–5` (5 × Q medical raw, heals 5 × Q).
   Production per shift keeps D10's points until R5 brings the formulas of section 5.
2. **Old goods are mapped and retired, not deleted.** Wheat → food raw; iron and oil → military raw; rations
   → Q1 food (same 10 energy). Fuel has no counterpart in the specification and stays as a retired good: its
   companies stop producing and its units can only be moved or withdrawn from an offer. History (trades,
   offers) keeps working.
3. **Holders.** `game.holders` names the owner of every inventory; ministries and hospitals are already
   allowed so Stages 2 and 3 only add their rules.
4. **Lots by holder, good and origin.** A lot is the quantity a holder has of a good from one origin country.
   Origin is set when goods are produced (the company's country) or granted (the citizen's country), and a
   trigger refuses changing it. Moving goods takes the oldest lots first and the units keep their origin at
   the destination.
5. **One origin per offer.** An offer takes its units from a single origin (the oldest lot that covers the
   quantity, or one the seller picks), so the tariff and future embargo checks follow the goods, not the
   seller's nationality. Buying and withdrawing put the units back with that origin.
6. **Movement log.** Every arrival, move and departure is an append-only row with kind, origin, quantity,
   from and to holders, and a reference (an offer, a company, a meal).
7. **Existing data** becomes lots of the holder's country (purchases had no recorded origin), logged as
   `migration`; the old tables and helpers are dropped in the same migration.

## Consequences

- Embargoes (Stage 4) filter offers and trades by `origin_country_code` without new data.
- R4 automatic food reads the food lots by quality; R5 production replaces points with the spec formulas.
- Rollback: header of `20261013110000_goods_and_lots.sql`.

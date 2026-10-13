# 0020 · Resources, companies N1–N5 and shifts

Date: 2026-10-14 · Status: Accepted

## Context

Specification v3.1 section 5 replaces D10's company model (20 Gold, three levels, points, a yield of 50 %
without a deposit, a separate quality upgrade for weapons) with: fifteen resources by region, extractors only
where their resource exists, companies N1–N5 (10/25/50/100/200 GOLD, civil level 5/10/20/30/40, 5–25 paid
shifts a day, extractor efficiency +0 to +100 %, manufacturing quality = level), one paid shift per employee
and day plus an authorized second one, one unpaid management shift per own company and day, the production
formulas, a national bonus of +5 % per distinct active resource (at most +25 %), foreign owners with a host
construction surcharge, and no production without inputs.

## Decisions

1. **Which region has which resource.** The specification and the GDD say "the resources it has in
   reality" without a list. Each of the 78 regions gets two to four of the fifteen after its best-known real
   production (copper in the Andes and Sonora, oil in Patagonia, the Gulf of Mexico and Alberta, wheat in the
   Pampas and Prairies…), seeded in `game.region_resources` (migration `20261014090000`). The owner can
   change any row; it is data, not code.
2. **"Active" resource** for the national bonus: present in an enabled region the country owns. Exploration
   and deposit states are `PENDING` in the specification and stay off.
3. **Output.** Extractors: `floor(150 × efficiency(N) × HP/100 × (1 + bonus))` of their category's raw
   material. Manufacturers: `floor(base(line, Q) × HP/100 × (1 + bonus))` with the base of section 5; the
   bonus and health apply to both ("before bonuses and health"). One rounding per shift.
4. **Inputs are checked before anything happens.** A manufacturer shift computes its output, requires the
   exact inputs (`output × Q`, `10Q` or `5Q`) in the depot, and refuses the whole shift otherwise
   (`inputs_missing`), so nothing is ever produced without inputs and energy is not spent.
5. **Shifts.** `game.work_shifts` records every shift. Regular and second shifts count against the company's
   paid shifts of the day (5 × N); the owner's management shift does not. The second shift needs the
   employer's individual authorization with its own wage (`employments.second_shift_wage`, at least the
   minimum wage). Zero health refuses any shift. Civil XP from work is `PENDING` in the specification and is
   not granted.
6. **Foreign owners.** Companies can be founded in any enabled region of a country in play. They belong to
   the host country (wages, cash and taxes in its Credit). A foreigner pays the base price, which is burned,
   plus the host's `foreign_construction_surcharge` (0–100 %, default 0, set by its government from Stage 2),
   which goes to the host treasury. The same applies to upgrades.
7. **Quality is the level.** A manufacturer founded at Q1 becomes Q2 at N2, and so on; the separate quality
   upgrade is removed. `kind` and `category` are derived from the good by a trigger.
8. **Existing companies** keep their level (raised to their quality where it was higher); fuel companies
   become military extractors. Hiring is capped by the paid shifts per day.

## Consequences

- R6 sells what extractors and manufacturers make; R7 shows the whole chain.
- Stage 2 lets governments set the surcharge; exploration stays off until its values exist.
- Rollback: header of `20261014090000_companies_and_shifts.sql`.

# 0031 · Public hospitals

Date: 2026-10-23 · Status: Accepted

## Context

Specification v3.1 section 7: at most one public hospital per region, N1–N5; building 50 GOLD and upgrades
75/100/125/150 from Health's institutional GOLD; hospitals hold no money, only kits; a level-N hospital uses
Q ≤ N; each treatment consumes exactly one kit, chosen as the lowest compatible quality sufficient for the missing
health, otherwise a lower available one for partial recovery; care is free, without a daily limit, for citizens
in the hospital's region; the Health minister moves kits instantly between hospitals and sets the care policy
(universal; nationals only; nationals plus non-enemy countries; nationals plus allies) with a log; detailed stock
is visible only to the Health ministry and the presidency.

## Decisions

1. **Ownership.** A hospital belongs to its region and is run by the Health ministry of the region's current
   owner. Construction and upgrades are paid by Health's GOLD and burned (no recipient is named).
2. **Kits move** between Health's store (the ministry's inventory, filled by `ministry_buy`) and the country's
   hospitals, keeping their origin; no transport.
3. **Treatment** locks the hospital (advisory lock) so two patients never take the same last kit; the kit is
   taken and the health added in one transaction, idempotent by key. «In the region» means the citizen's
   current region (`citizens.region_code`).
4. **Policies.** Enemies (W1) and alliances (W5) do not exist yet: `non_enemies` admits everyone and `allies`
   admits nationals until those modules refine `game.care_allowed`. The default policy is universal.
5. **Privacy.** Anyone sees which regions have a hospital and its level; the stock per hospital and in Health's
   store is read only by the Health minister and the president. A refusal for lack of a compatible kit tells the
   patient no more than that.

## Consequences

- The Military section has a Hospital tab: treatment, the country's hospitals, Health's tools and the private
  stock.
- Stage 3 is complete: a player trains, ranks up, gets injured, uses a kit or a hospital.
- Rollback: header of `20261023090000_hospitals.sql`.

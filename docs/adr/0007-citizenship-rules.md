# 0007 · Citizenship: numbers, adaptation, waitlist and changes

Date: 2026-10-09 · Status: Accepted

## Context

The brief (section 3) replaces the GDD's approval-based citizenship with immediate citizenship, a 7-day
adaptation, a waitlist for countries not in play and changes requested from the other country. Offices,
laws and notifications arrive in later modules, so D06 needs a few interim decisions.

## Decisions

1. **Residence is the capital region.** The brief and the canvas say where the citizen lives («Vives en
   Buenos Aires»). Each country in play gets `capital_region_code` (the region with its capital). Moving
   between regions is a later feature.
2. **Two clocks.** War damage at half depends on the account's age (`joined_at` + 7 days): it eases new
   players in. Voting in elections depends on the current citizenship (`citizen_since` + 7 days): the canvas
   shows «Tras el cambio, vota en elecciones a los 7 días».
3. **The first change has no 30-day wait.** «At most one change every 30 days» counts from the last change.
   A player who waited for a country can move the day it opens.
4. **Waitlist players move at once** when their country opens, whatever its mode: the brief promises they can
   move keeping everything.
5. **Mode per country** (`automatic` or `review`, default `review`) lives on the country until laws (D21)
   set it. Reviewers are the president and the Interior minister in `game.offices`; until elections (D19)
   and appointments (D20) fill it, requests are approved by the 72-hour rule.
6. **The 72 hours are checked hourly** by `citizenship_timeouts` on the clock Worker (`0 * * * *`), so an
   approval can arrive up to an hour late. The job is idempotent per slot like every other job.
7. **Leaving a country leaves every office** the player holds (`game.offices`). Congress seats arrive with
   D19 and join the same rule.
8. **The document shows the flag** instead of the country silhouette with the region: drawing the silhouette
   needs the 0.9 MB map geometry, which only the map route loads. A light per-country silhouette is a
   follow-up for the design system.
9. **The welcome gift (5 Oro, 50 Crédito) and «Tu primer día»** in the Welcome canvas wait for the ledger
   (D09) and missions (D13).

## Consequences

- D07 (activating a country) only has to flip `is_active`; waitlisted players then move with one request.
- D16 and D19 must call `game.war_damage_factor` and `game.can_vote_in_elections` instead of re-deriving the
  rules.

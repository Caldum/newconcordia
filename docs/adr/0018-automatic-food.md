# 0018 · Automatic food, settled on arrival

Date: 2026-10-13 · Status: Accepted

## Context

Specification v3.1 (section 1, assumption 6): every five minutes the system automatically consumes the
lowest-quality sufficient food and restores up to 10 energy; the unit is consumed whole and any excess is
lost; at 100 energy nothing is consumed; unexecuted intervals are handled with the server clock, without
per-player processes. D12 had manual eating of rations with a 200-per-day cap from the GDD.

## Decisions

1. **A 5-minute UTC grid.** Intervals start at :00, :05, :10… UTC (`game.food_tick`), the same for every
   player, so the result does not depend on when anyone looks.
2. **Settled on arrival.** `game.settle_food` replays, in order, every interval since the last one settled
   (`player_stats.food_at`), together with the hourly recharge: at each interval, if energy is below 100 and
   the player holds food, one unit is eaten and energy rises by `min(10, missing)`. It stops at the first
   interval with a full bar (nothing can lower energy without the player acting, and every action settles
   first) or without food, so a long absence costs at most about ten iterations.
3. **"Lowest sufficient quality".** The lowest-energy food whose energy covers `min(10, missing)`; since Q1
   already gives 10, that is the lowest quality held. The rule is written in full so a future change of
   values keeps the meaning.
4. **Who settles.** Spending and adding energy, and reading the profile or the inventory. Those two reads
   become volatile functions that write; the web refetches the profile every 5 minutes.
5. **Manual eating and the daily cap are removed**, as the specification has neither. Their tables stay as
   history. Energy no longer rises above 100 from food.
6. **Log.** Every meal is an `automatic_food` inventory movement with a reference to its interval.

## Consequences

- Energy shown is always what the rules have produced, including meals while the player was away.
- Kits (Stage 3) reuse the same pattern for health where they apply automatically; hospitals do not.
- Rollback: header of `20261013120000_automatic_food.sql`.

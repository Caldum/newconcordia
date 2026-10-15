# 0047 · Energy only from food, a minute at a time

Date: 2026-11-08 · Status: Accepted

## Context

The owner asked for three changes to energy. Every training session costs 10, in any center. Energy rose by 1
point at a time even without food: that was the hourly recharge (10 per hour) the GDD kept and ADR 0018 combined
with automatic food. The owner considers it a bug: without food energy must not rise. Food gives 2 energy per
quality level (Q1 2 to Q5 10). Energy fills 2 per minute. A meal bigger than that waits: a Q2 needs 4 built up and
4 missing, never a Q2 spent to fill 2. The bar shows the filling live, and fainter when there is no food.

## Decisions

1. **No passive recharge.** `energy_per_hour`, `game.recharged_energy` and `game.next_energy_at` are removed.
   Energy changes only by spending, food or an explicit reward. `energy_at` remains as the last change.
2. **Appetite.** `player_stats.food_appetite` builds up `food_energy_per_interval` (2) on each 1-minute UTC
   interval. It is capped at `food_appetite_max` (10) and at the energy missing, and is 0 while the bar is full.
3. **Meals.** Once the appetite covers the lowest-quality food held, that unit is eaten whole and its energy is
   subtracted from the appetite. The player never jumps to a higher quality, so the cheapest food goes first.
   With the cap at what is missing, nothing is wasted. A player at 98 with only a Q2 stays at 98 until spending.
   At most one meal per interval, so at most 2 per minute in the long run.
4. **Settled on arrival**, as in ADR 0018:
   - Reading the profile or the inventory and spending or adding energy all catch up the missed intervals.
   - The loop is bounded: a full bar or a lack of food ends it at once, and the bar fills within 50 meals.
   - `game.put_goods` settles a citizen's meals before food reaches them. Food bought now is never eaten in
     minutes already past.
5. **Training** costs 10 energy in every center (`training_energy_*`).
6. **The bar.**
   - `get_my_profile` returns the appetite, its cap, the rate, the last interval and what the next meal gives.
   - The web fills the appetite smoothly after the energy, in a paler shade: 1-second steps with a CSS width
     transition, and the transition is off with reduced motion.
   - The shade is fainter still when no meal is coming.
   - The profile is read again one second after the next meal, so the bar moves as soon as food is eaten.

## Consequences

- Specification v3.1 kept the GDD's hourly recharge. This owner's decision replaces it, and `CLAUDE.md` says so.
- A player without food stays without energy: the market and the sign-up food (10 Q1, now 20 energy) matter more.
- Rollback: header of `20261108090000_energy_from_food.sql`.

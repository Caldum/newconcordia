# R4 · Automatic food

**Acceptance (roadmap R4):** intervals catch up after absence; nothing is eaten at 100 energy.

## Design (ADR 0018)

- 5-minute UTC grid (`game.food_tick`); `player_stats.food_at` records the last interval settled.
- `game.settle_food(user)`: replays every interval since `food_at` with the hourly recharge; below 100 and
  with food, eats one unit of the lowest sufficient quality and adds `min(10, missing)`; stops at a full bar
  or without food. Parameters `food_interval_minutes` (5) and `food_energy_per_interval` (10).
- Settled by `game.spend_energy`, `game.add_energy`, `public.get_my_profile` and `public.get_my_inventory`.
- Removed: `public.eat_rations`, `public.get_my_food_today`, the `food_energy_daily_max` parameter.
- Web: the inventory explains automatic food; no eating form; the profile refetches every 5 minutes.

## Tests

- pgTAP `150_automatic_food.test.sql`: the grid, nothing eaten at 100, one interval, catching up after an
  absence, lowest quality first, excess lost, no food, settling through the profile and inventory.
- `070` runs without food to keep testing the recharge alone; `110` and `140` drop manual eating.
- Vitest: the inventory with and without food. e2e: meals caught up on arrival.

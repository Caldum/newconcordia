# D12 · Products and consumption

**Acceptance test (GDD):** recovering more than 200 energy from food on the same day is rejected.

## Design

- **Rations** give 10 energy each (`ration_energy`), up to 200 per game day from food
  (`food_energy_daily_max`). Eating more than the day allows is refused whole, never half eaten. Food may
  take energy above 100; recharge then waits until it drops below (ADR 0009).
- **Weapons** record their damage multiplier, ×(1 + 0.2 × Q) (GDD module 4), for combat (D16). **Fuel** is
  used by the country to open battles (D15).
- **Moving goods:** owners move units between a company's depot and their inventory («Pasar a mi
  inventario», Company canvas), in both directions.
- **Screens:** the account becomes «Inventario y cuenta» with the player's goods, what each is for, eating
  rations and today's food energy; the company depot gets «Pasar a mi inventario».

## Tests

- pgTAP (`110_products.test.sql`): acceptance, energy from rations with recharge settled first, rations
  missing, idempotency, the next game day, weapon multipliers, moving goods both ways and permissions.
- Vitest: the inventory panel (eating, the daily counter, errors) and moving goods from a depot.
- Playwright: a player eats rations and sees the energy rise in the bar.

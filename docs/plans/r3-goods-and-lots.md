# R3 · Goods catalog, inventory lots with origin, holders and the movement log

**Acceptance (roadmap R3):** stock never negative; origin survives every movement.

## Design (ADR 0017)

- **Catalog (spec section 5):** raw `food_raw`, `military_raw`, `medical_raw`; products `food_q1`–`food_q5`
  (input Q food raw, 10 × Q energy), `weapon_q1`–`weapon_q5` (input 10 × Q military raw, damage ×(1 + 0.2 Q)),
  `kit_q1`–`kit_q5` (input 5 × Q medical raw, heals 5 × Q). Goods gain `category`, `energy`, `heal` and
  `active`. The D10 goods are mapped (wheat → food raw; iron and oil → military raw; ration → food Q1) and
  retired; fuel has no place in the specification and is retired as it is.
- **Holders:** `game.holders` gives every inventory an owner of kind citizen, company, ministry or hospital
  (the last two used from Stage 2 and 3), created on first use.
- **Lots:** `game.inventory_lots` holds a quantity per holder, good and origin country. The origin is set
  when goods are produced or granted and can never change (trigger). Taking goods consumes the oldest lots
  first and carries their origin to the destination.
- **Movement log:** `game.inventory_movements`, append-only: kind, good, origin, quantity, from and to
  holders, reference.
- **Core functions:** `game.put_goods`, `game.take_goods` (FIFO, optional single origin, optional
  destination), `game.holder_quantity`.
- **Rewired:** production (company origin), offers (one origin per offer, taken from the lots; buying and
  withdrawing keep it), moving goods, eating (Q1 food, energy from the catalog), the sign-up grant (10 Q1
  food of the citizen's country), founding (active goods, Q1 only) and quality upgrades (any Q line).
- **Data:** inventories and depots become lots (origin: the holder's country), open offers are mapped;
  the old tables and helpers are dropped in the same migration.
- **Web:** names of the new goods, Q1 food to eat, founding choices, quality upgrades for every line.

## Tests

- pgTAP `140_goods_and_lots.test.sql`: catalog values, FIFO across origins, never negative, immutable
  origin, append-only log, origin through offer, purchase, withdrawal and moves, production with inputs.
- Existing suites move to lots and the new codes.
- Vitest: goods names, the inventory and founding screens with the new codes.

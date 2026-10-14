# 0023 · Personal medical kits

Date: 2026-10-15 · Status: Accepted

## Context

R7 closes Stage 1 with a citizen consuming the kit another one made. Specification v3.1 sections 1 and 7: a
citizen at zero health can still use personal medical kits; kits Q1–Q5 heal 5/10/15/20/25 HP up to 100; the
whole unit is consumed even if HP is wasted. Hospitals (Stage 3) use the same kits but are out of scope here.

## Decisions

1. `public.use_kit(good, key)` takes one kit from the player's inventory (oldest lot first), heals
   `min(goods.heal, health_max − health)` and records it in `game.kit_uses` (good, origin, healed, health
   after), once per idempotency key.
2. **Zero health is allowed**; the excess over 100 is wasted and the kit spent anyway.
3. **At full health the kit is refused** (`health_full`): the specification only says the excess is wasted;
   spending a kit that heals nothing is a misclick, not a choice.
4. Only personal kits from the citizen's inventory; company depots must move them first.

## Consequences

- The inventory shows a «Use one» button on kits, off at full health.
- Stage 1 has nothing that hurts yet: battles and training injuries arrive in Stage 3. Tests lower health
  directly.
- Rollback: header of `20261015090000_personal_kits.sql`.

# W2 + W3 · Battles and attacks

**Acceptance (roadmap W2, W3):** battles of 9 rounds of 1 hour, first to 5, tie to the defender, one battle per
region, 24-hour cooldown, annexation; attacks with the damage formula, weapons with uses, XP with additive
bonuses, injuries, the priority battle order; a live scoreboard.

## Design (ADR 0033)

- Migration `20261025090000_battles.sql`: `game.battles`, `game.battle_rounds`, `game.battle_attacks`,
  `game.region_owner_changes`, `game.battle_orders`, `game.equipped_weapons`; `game.settle_battle`,
  `game.settle_battles`, `game.finish_battle`, `game.battle_round_now`, `game.allied`; the hourly job settles
  battles; public `launch_offensive`, `equip_weapon`, `get_my_weapon`, `attack`, `set_battle_order`,
  `list_battles`, `get_battle`, `list_battle_rounds`, `battle_ranking`, `list_launch_targets`.
- Web: `/battles` and `/battles/$battleId` (Military → Battles), polling every 5 seconds.

## Tests

- pgTAP `280_battles.test.sql` (48): who launches and where, cooldown, one battle per region, idempotent launch,
  eligibility (own country, foreigners in the region), the damage formula (unarmed, Q5, strength, health, rank),
  enemy and order XP bonuses, weapons and their uses, injuries after the gains, energy and zero health, rounds
  by hour with ties to the defender, five rounds win at the end of round 7, annexation and its record, the
  ranking, the ledger, privileges.
- Vitest: the damage and XP formulas; the battles list; a battle's live score, an attack and equipping.

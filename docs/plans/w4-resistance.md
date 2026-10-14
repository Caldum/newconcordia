# W4 · Resistance

**Acceptance (roadmap W4):** resistance with 10 organizers, 2 GOLD burned each, rewards on victory.

## Design (ADR 0034)

- Migration `20261026090000_resistance.sql`: `game.resistance_drives`, `game.resistance_organizers`,
  `game.occupation`; `game.finish_battle` closes drives and pays rewards; public `join_resistance`,
  `list_occupied_regions`.
- Web: the Resistance panel on `/battles`.

## Tests

- pgTAP `290_resistance.test.sql` (20): only occupied regions, distinct organizers, the fee burned, the tenth
  starts the battle at once with the occupier defending, no joining while it fights, victory returns the region
  and pays 5 GOLD to each organizer exactly once, the ledger.
- Vitest: the battles page lists the resistance.

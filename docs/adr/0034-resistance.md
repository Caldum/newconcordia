# 0034 · Resistance

Date: 2026-10-26 · Status: Accepted

## Context

Specification v3.1 section 6: resistance needs 10 distinct organizers of any citizenship, each paying 2 GOLD,
burned; it starts at once if the region is occupied and has no other active battle; 9 rounds of 1 hour, first to
5; a tied round goes to the occupying country, which defends. If the resistance wins, the region returns at once
to the country that held it just before the last occupation, and each of the ten organizers receives 5 GOLD from
the system, with no limit or cooldown beyond regional restrictions.

## Decisions

1. **Occupied** means the region's owner is not its home country and took it by a recorded change; the drive
   restores it to that change's previous owner (`game.occupation`).
2. **Drives.** One open drive per region gathers organizers; each pays 2 GOLD (burned) and joins once. The tenth
   starts a `resistance` battle at once, ignoring the ordinary 24-hour cooldown, with the restoring country
   attacking and the occupier defending, so the battle rules (ties to the defender) apply unchanged.
3. **Outcome.** `game.finish_battle` closes the drive; on victory the region changes owner like any annexation
   and every organizer is paid 5 GOLD by the system (mint reason `resistance_reward`), once per organizer and
   drive by ledger key.
4. **Fighting.** Organizers have no special right to fight: nationals of either side fight remotely, others from
   the region (ADR 0033).

## Consequences

- The battles page lists occupied regions with their organizers and a button to join.
- Rollback: header of `20261026090000_resistance.sql`.

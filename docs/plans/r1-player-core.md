# R1 · Player core: UTC day, health, civil levels, military XP and ranks

**Acceptance (spec section 11):** rising from Novice to Militia I requires 100 total military XP, the second step
400 and General V 562,500; after that XP keeps accumulating without further rank bonus. A civil level reward is
paid once per level (spec section 1, invariant 10).

## Design (ADR 0015)

- **UTC game day:** `game.game_day` and `game.game_day_start` use UTC; `day_change` runs at 00:00 UTC (cron
  `0 0 * * *`); the web shows game time in UTC.
- **Health** 0–100 per player, starting at 100, no passive regeneration (kits and hospitals arrive in Stage 3).
- **Civil level** L needs 100 × L² XP, level 0 at start. `game.add_civil_xp` credits XP and pays 1 GOLD from the
  GOLD issuer per new level, idempotent per level (`level_reward:<user>:<level>`), so a level is never paid
  twice even if XP is credited again.
- **Military XP and ranks:** step n needs 100 × n² military XP, capped at 75 (General V). Novice is step 0; steps
  1–75 are 15 ranks × levels I–V. Each step adds 5 % damage (used by combat in Stage 4). `game.add_military_xp`
  credits it; XP past the cap keeps counting as a statistic.
- **Starting strength 0** (spec damage `10 + F`); existing citizens keep theirs. The GDD's rank by damage and its
  parameters are removed; accumulated damage stays as a statistic.
- **Profile:** level and XP to the next level, health, strength, rank name with the military XP bar, energy.

## Tests

- pgTAP (`120_player_core.test.sql`): UTC day boundaries, health at sign-up, level thresholds and rewards paid
  once, rank steps and the acceptance thresholds, the cap; updated `010`, `020` and `070` for the new rules.
- Clock Worker: the 00:00 UTC trigger maps to the day change.
- Vitest: UTC dates, the profile with health and ranks in both languages.

# 0015 · Player core: UTC day, health, civil levels and military ranks

Date: 2026-10-13 · Status: Accepted

## Context

Specification v3.1 (ADR 0014) changes the player model that D02 and D08 built from the GDD: business time is
UTC instead of fixed GMT−3, civil level L needs 100 × L² XP from level 0 and pays 1 GOLD per new level, health
0–100 appears, and the rank comes from military XP (Novice plus 15 ranks × I–V, step n at 100 × n²) instead of
accumulated damage. The damage formula `10 + F` implies that a new citizen's strength is 0.

## Decisions

1. **The game day is the UTC date.** `game.game_day` and `game.game_day_start` use UTC, `day_change` runs at
   00:00 UTC (cron `0 0 * * *`) and the web shows dates and times in UTC, labelled «Hora del juego: UTC».
2. **Civil level** is derived from XP (`floor(sqrt(xp / 100))`), never stored. `game.add_civil_xp` is the
   only way to credit XP and pays the reward of every new level from the GOLD issuer with the key
   `level_reward:<user>:<level>`, so a level is paid once even if XP arrives in pieces or twice.
3. **Health** is a column 0–100, starting at 100, with no passive regeneration; kits and hospitals arrive in
   Stage 3 (H1–H3). The cap is `health_max` in `balance_params`.
4. **Military XP and ranks.** The rank step is derived from military XP and capped at 75 (General V); XP past
   the cap still counts. The web maps a step to a name: step 0 is Novice, step n ≥ 1 is rank
   `floor((n − 1) / 5) + 1` at level `(n − 1) mod 5 + 1`. The 5 % damage per step is a parameter for Stage 4.
5. **Starting strength 0** for new citizens; existing citizens keep theirs. The GDD's rank by damage and its
   parameters are removed; total damage stays as a statistic on the profile.
6. **Existing XP is reread, not migrated.** Development data only has XP from tests; the new formula applies
   to whatever is stored, and no level reward is paid retroactively.

## Consequences

- Every future source of civil XP (work, training, missions) must call `game.add_civil_xp`, and every source
  of military XP `game.add_military_xp`.
- The profile shows level, health, strength, military rank with its XP bar, total damage, influence and
  energy. Rank names live in `features/profile/rankMessages.ts` for reuse in battles.
- Rollback: restore the GMT−3 functions and the GDD profile from migrations `20261009143336` and
  `20261009183000` (header of `20261013090000_player_core.sql`).

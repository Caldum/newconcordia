# 0040 · Daily missions, first steps, press and messages

Date: 2026-11-01 · Status: Accepted

## Context

Brief section 3: four daily missions — work, train, land 5 hits and read an article; completing them gives
1 GOLD and 7 days in a row 3 extra GOLD. GDD D25–D27: newspapers and articles, messages between players, a new
citizen tutorial. Specification PD-15: tutorial and onboarding are UX pending, to be designed and tested in the
vertical slice. The specification issues money only by law or an explicit system reward.

## Decisions

1. **Missions are read, not tracked.** Progress comes from what the player did that UTC day (shifts, training
   sessions, attacks in battles or the independence war, articles read). Claiming all four mints 1 GOLD (system
   reward `daily_missions`) once per day; every seventh consecutive day mints 3 GOLD more (`mission_streak`).
   A missed day restarts the streak.
2. **First steps** are a checklist read from the player's state (work, buy, train, read, join a party, fight),
   each linked to where it is done, hidden once complete. The full tutorial stays pending (PD-15).
3. **Press.** One newspaper per citizen, free, with a unique name, in their country's press; articles are public,
   reading one is an action (it counts for the mission once). Subscribers and votes are not built. Articles can
   be hidden by moderation (L5) and stay recorded.
4. **Messages** are private between two citizens, with an hourly sending limit; reading a conversation marks the
   other's messages read. Friends and country chat are not built.

## Consequences

- Home shows today's missions and the first steps; a Society section has the press and messages.
- Rollback: header of `20261101090000_society.sql`.

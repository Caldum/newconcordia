# 0046 · The independence war, live, and a war simulator

Date: 2026-11-05 · Status: Accepted

## Context

The owner asked to start Argentina's liberation war with simulated players who train, work and fight, and for an
interactive war screen that shows the fighting in real time. The independence war (ADR 0036) only had a progress
line and an attack button. ADR 0033 kept Realtime out because its channels need readable tables; the battle page
polls every 5 seconds. The canvas `Battle.dc.html` shows the reference: the scoreboard, the strike with «5 golpes
seguidos», the latest strikes and the round's heroes.

## Decisions

1. **Screen.** `/battles/independence` shows the country's war: the Atlas scoreboard with the country's map filling
   from the bottom as damage reaches the target, the countdown, the player's strike (one or five in a row), the latest
   strikes of everyone (new ones slide in), the player's share and place, the damage per minute of the last half hour
   and the ten heroes. The battles page links to it.
2. **Live by polling every 2 seconds.** Same reason as ADR 0033; three read functions keep each poll small:
   `independence_feed` (latest strikes, at most 50, public like the ranking), `independence_pulse` (per minute,
   30 minutes) and `get_my_independence`. A Realtime broadcast can replace the polling later.
3. **Five in a row** are five ordinary attacks one after another, each with a key derived from the burst's, so a
   retry repeats the same strikes; the burst stops at the first refusal and says why.
4. **Simulator.** `supabase/scripts/simulate-war.js` (development only, `SIM_DB_URL`) creates bots as new citizens
   through the sign-up trigger, each naming `SIM_REFERRER` as who invited them; turns the sandbox on and opens the
   war with `SIM_TARGET` damage, both logged as «Simulación» in the admin log; gives four founders civil level 5
   by XP (the level rewards pay their GOLD) to found one N1 company each. Then every bot plays through the public
   functions with its own JWT claims: hiring and jobs, training, a shift a day and strikes at a human pace.

## Consequences

- The simulator's founders get XP they did not earn in play, and their level rewards count toward the referrer's
  rewards (ADR 0043). It is a development tool; never run it against production.
- `pg` is a root development dependency, used only by the simulator.
- Rollback: header of `20261107090000_independence_live.sql`; delete the bots' auth users to remove them.

# War live review

Review of `feat/independence-live` against `docs/plans/war-live.md`.
Size: medium; strategy: what the new reads expose, then the simulator's power.

| Area | Risk | Notes |
| --- | --- | --- |
| Feed | Low | Names and damage, already public through the ranking; capped at 50 rows. |
| Polling | Low | Five small reads every 2 seconds per open screen; indexed by war and time. |
| Simulator | Medium | Runs as the database owner for setup only (logged as «Simulación»); every move afterwards goes through the public functions as the bot. Development only. |

Accepted: polling instead of Realtime (ADR 0033); the founders' XP is a simulation fixture.

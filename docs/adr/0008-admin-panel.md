# 0008 · Admin panel: admins, scheduled world changes and the action log

Date: 2026-10-09 · Status: Accepted

## Context

D07 asks to turn countries on and off, enable disputed territories and log every admin action. The Admin
canvas adds that changes apply at 00:00 game time. There is no admin role yet, and the map data has no
disputed territories as regions.

## Decisions

1. **Admins live in `game.admins`** and only the owner adds them, from the SQL editor. Granting admin rights
   through the API would be a permission change that opens access, which this project keeps for the owner.
2. **World changes are scheduled** for the next day change and applied by the existing `day_change` job, so a
   country never disappears in the middle of a game day. Until then the admin can undo it.
3. **The action log is append-only** (a trigger rejects updates, deletes and truncation) and stores the
   actor's name as text, so it still says who acted if an account is deleted. Applied changes are logged in
   the name of the admin who scheduled them.
4. **Turning a country on requires it to be playable:** regions on the map, color, official names and a
   capital. Countries outside the 13 have no regions yet; adding one is a data change (D03 pipeline:
   `regions_map.py` and the generated world migration) plus this switch.
5. **Disputed territories** (Falklands, Gibraltar, Crimea and others) are separate shapes on the map today,
   not regions. The panel switches any region; a territory becomes switchable once the data pipeline adds it
   as a region of its claimant, starting disabled.
6. **Taking a country out of play keeps its citizens.** Nobody can start in it or move to it, and its regions
   are gray on the map. What happens to its players (a forced move, the waitlist) is a game-design decision for
   when it is needed.

## Consequences

- The day change now does two things; its result reports how many world changes it applied.
- Moderation and player management (the AdminPlayers canvas) belong to fair play (D28).

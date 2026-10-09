# D07 · Admin panel

**Acceptance test (GDD):** deactivating a country turns it gray on the map and records who did it.

## Design

- **Who:** `game.admins`, filled by the owner from the SQL editor (`docs/setup.md` step 9). No API grants admin
  rights. Every admin function checks `game.is_admin(auth.uid())` before doing anything.
- **What:** turning countries on and off and enabling or disabling regions (disputed territories once they are
  regions on the map). Changes are scheduled for the next day change (00:00 game time), as the Admin canvas
  says, and the `day_change` job applies them. Asking for the current state withdraws a scheduled change.
  Turning a country on needs regions on the map, a color, official names and a capital.
- **Record:** `game.admin_log` (append-only) keeps who, what, target, state before and after and when, for
  scheduling, withdrawing and applying.
- **Map:** regions of a country out of play are gray and inert, like disabled regions.
- **Screen:** `/admin` (Admin canvas): countries in play with regions, citizens, waitlist and a switch per
  country; regions with a country filter; the action log; the team. The link appears only for admins.

## Tests

- pgTAP: players and visitors cannot reach any admin function; scheduling, withdrawing, the day change
  applying it, «not ready» countries, the log with before and after, the log is append-only.
- Vitest: the panel, switches, filter, log rendering, refusal and the closed state for players; the map grays
  an inactive country's regions.
- Playwright: an admin turns Portugal off, the day change applies it, the map shows it gray and the log names
  the admin; then turns it back on.

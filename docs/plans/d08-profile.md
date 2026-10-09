# D08 · Profile and energy

**Acceptance test (GDD):** with the clock moved 3 hours forward, energy rises by 30 and never goes above 100.

## Design

- **Balance parameters:** `game.balance_params` starts here (CLAUDE.md: no magic numbers). `game.param(key)`
  reads one and fails with `balance_param_missing` if it does not exist. Values in ADR 0009.
- **Stats:** `game.player_stats`, one row per citizen, created with the citizen. It stores what grows
  (experience, strength, accumulated damage, influence) and energy as a value plus the instant it was
  last settled (`energy`, `energy_at`). Level and rank are derived, never stored.
- **Energy on arrival:** no job walks over players (GDD module 11). The current energy is
  `energy + floor(hours since energy_at × 10)`, capped at 100; reading it writes nothing.
  `game.spend_energy(user, amount)` settles it under a row lock, keeps the progress toward the next point
  and fails with `not_enough_energy`. Work (D10) and training (D14) will call it.
- **API:** `public.get_my_profile()` returns the attributes, the derived level and rank with their
  thresholds, the current energy, the time of the next point and the server time.
- **Lighter client:** the first load is at 167.7 of 170 kB and the game bar goes into it. The web uses
  `@supabase/auth-js` and `@supabase/postgrest-js` directly (the only parts it uses), without Realtime,
  Storage or Functions. Same session storage key, so nobody is signed out. The live battle (D17) loads
  Realtime on demand.
- **Screens:** the game bar (NavBar canvas) gets the energy meter and the link to the profile. `/profile`
  (Profile canvas) shows level with experience, strength, damage with rank, influence and the citizen's
  path. Medals, job and company wait for their modules. The bar extrapolates energy between readings with
  the server's rate and time, for display only.
- **On the way:** auth-js 2.117 turns every 5xx into a retryable error, so a rejected sign-up and a server
  failure both read as «no connection». Only status 0 and gateway errors are a connection problem now.
  The bundle size script also runs on Windows.

## Tests

- pgTAP (`070_profile.test.sql`): starting values, the recharge (acceptance), the cap, spending with and
  without enough energy and with partial progress kept, level and rank thresholds, a missing parameter,
  the profile of the signed-in player only, and that visitors cannot call it.
- Vitest: energy extrapolation, the error classification, the energy meter and its accessible label, the
  profile page in both languages.
- Playwright: a new player sees 100 energy in the bar and level 1 with 100 strength on their profile, with
  axe passing.

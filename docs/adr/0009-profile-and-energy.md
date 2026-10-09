# 0009 · Profile and energy: balance parameters, starting values and the level curve

Date: 2026-10-09 · Status: Accepted

## Context

D08 shows level, experience, strength, rank and influence, and computes energy on arrival (10 per hour,
maximum 100). The GDD fixes the energy rate and the rank rule (rank n needs 10,000 × n² damage, maximum 20)
but leaves the level curve open (module 3) and gives sample values only: «6,420 of 8,000 experience for
level 28» and a new player with 100 strength. CLAUDE.md asks for every balance number in
`game.balance_params`, which did not exist yet.

## Decisions

1. **`game.balance_params` holds every balance number** as `numeric`, with a description. Rules read them
   with `game.param(key)`, which fails loudly when a key is missing instead of falling back to a default.
   Changing a value is an admin action, audited like the others, once the panel offers it.
2. **Starting values:** 100 energy, 100 strength (the GDD's «new, day 1» profile), no experience, damage or
   influence.
3. **Level curve:** reaching level n needs 10 × (n − 1)² experience; level 1 starts at 0. Experience comes
   from hits (+1 each, D16). A player who lands about 36 hits a day, the pace behind the GDD's 6-month
   profile, reaches level 26 or 27 at six months, as in the sketches. Each level gives 3 Gold (D09/D13), and
   the gaps grow with the level, so that Gold slows down as the GDD's Gold budget expects.
4. **Rank is numeric** («Rango 12»), as on the Profile canvas medals. Named ranks (Captain, First Sergeant)
   wait for the war modules to settle what ranks unlock.
5. **Energy is a value plus the instant it was last settled.** Reading computes the recharge without writing.
   Spending settles under a row lock and moves the instant forward only by the whole points gained, so
   spending never loses the progress toward the next point. Recharge never takes energy above the maximum;
   energy already above it (food, from D12) is kept.
6. **The web talks to Supabase with `auth-js` and `postgrest-js`** instead of `supabase-js`, because it only
   uses Auth and RPC and the first load was 2.3 kB under budget. It keeps supabase-js's session storage key.
   Realtime comes back as an on-demand import with the live battle (D17).

## Consequences

- Tuning energy, starting values, the level curve or ranks is a data change, not a migration of rules.
- Level and rank are never stale: they are derived from experience and damage every time.
- If the level curve feels slow in the beta, `level_experience_factor` is the knob.

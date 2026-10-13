# Web architecture review

Review of `refactor/web-architecture` against ADR 0019 (`composition-patterns`). Size: large (every game screen), behavior unchanged; strategy: the existing route
tests as the safety net, plus unit tests for every rule moved out of a component.

## Measured

| | Before (`develop` after R4) | After |
| --- | --- | --- |
| Database calls inside components | 33, in 21 files | 0 (ESLint `no-restricted-imports` fails the build) |
| Files with more than one component | 20 (up to 10 in `AccountPage`) | 0 |
| Actions with their own key, `try/catch`, error state and cache refresh | each one by hand | 19 actions through one hook (`useGameAction`) |
| Copies of the country name lookup | 14 | 1 (`features/world/names.ts`) |
| Signed-in frame (`CitizenOnly` + `GameShell`) repeated per page | 11 pages, two orders | 1 layout route |
| Vitest | 171 | 190 (pure helpers now tested) |
| Landing JavaScript, gzip | 173.2 kB | 174.6 kB |

## Notes

| Area | Risk | Notes |
| --- | --- | --- |
| Actions | Medium | `useGameAction` keeps the idempotency key until success or a changed request, as before; it refreshes `['me']` (and `['market']` where the screen did). Refusals now show next to the section that caused them instead of one note per page. |
| Layout route | Medium | The citizen guard now runs before the game bar on every game screen (before, some pages showed the bar first); the layout is lazy so the landing does not load it. |
| Auth | Low | `signOut` keeps Supabase's default scope (global); the password change still closes only the other sessions. |
| Copy | Low | Refusal texts of citizenship and admin moved to the `error_<code>` keys; wording unchanged. |

Accepted: about 1.4 kB more on the landing from the extra module boundaries.

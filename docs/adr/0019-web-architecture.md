# 0019 · Web architecture: one responsibility per module

Date: 2026-10-13 · Status: Accepted

## Context

The owner found the React components hard to read. Measured on `develop` after R4: 21 component files
call Supabase directly, ten page files hold three to ten components each, every action repeats by hand its
idempotency key, `try/catch`, error state, success message and cache refresh, the signed-in frame
(`CitizenOnly` + `GameShell`) is repeated in eleven pages in two different orders, and helpers such as the
country and region names exist in several copies.

## Decisions

1. **Layers.** Each feature has up to three kinds of module, and only these talk to each other:
   - `api.ts`: calls to the database (`supabase.rpc`, `supabase.auth`), each one typed and named after the
     action. Nothing else imports `lib/supabase` (enforced by ESLint for `.tsx` files).
   - `queries.ts`: TanStack Query hooks that read (`useX`) with their zod schemas.
   - Components (`.tsx`): render and handle the user's input. No database calls, no business rules.
   Pure derivations (totals, sources to sell from, payslip lines) live in plain `.ts` functions with tests.
2. **One component per file**, named like the file. A page file only composes its sections; sections
   live in `pages/<page>/` next to it, or in `features/<feature>/` when another page uses them.
3. **Actions through one hook.** `useGameAction(perform, options)` wraps `useMutation`: it owns the
   idempotency key (renewed after success or when the request changes), turns the database error into its
   stable code, and refreshes the player's data. `ActionFeedback` shows the error and the success note
   the same way everywhere.
4. **The signed-in frame is a layout route.** Game routes are children of a pathless `game` route that
   renders `CitizenOnly`, then `GameShell`, then the page; pages read the citizen with
   `useCurrentCitizen()` (React 19 `use`) instead of a render prop.
5. **Shared lookups** (country, region and currency names) live once in `features/world/useNames.ts`.

## Consequences

- A screen can be read top to bottom: what it shows, which sections, which actions.
- Tests keep rendering whole routes, so the refactor is checked by the existing suite.
- New modules follow these rules; reviews reject a component that calls the database.

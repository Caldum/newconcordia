# 0002 · Data access: private schema and functions-only API

Date: 2026-10-09 · Status: Accepted

## Context

The brief requires the database to be the authority, RLS that denies by default, and a client without
`insert/update/delete` on tables, only `execute` on public functions. By default Supabase gives `anon` and
`authenticated` every privilege on each new table, sequence and function in `public`, and the Data API
exposes `public` and `graphql_public`.

## Options

1. Tables in `public` with RLS and read policies; writes only through functions.
2. Tables in a private `game` schema the API does not expose; `public` holds only functions (RPC) that read
   and write, each with its explicit `grant execute`.

## Decision

Option 2.

- `game`: tables and internal functions. No `usage` for `anon` or `authenticated`. RLS is enabled on every
  table anyway, with no policies unless a `security invoker` function needs them (defense in depth).
- `public`: functions only. Write functions are `security definer` with `set search_path = ''`, qualified
  names and identity checks (`auth.uid()`), permissions, rate limits, state and idempotency. Read functions
  return only the columns the screen uses and are paginated.
- Default privileges revoked for every new object (`supabase/migrations/*_security_baseline.sql`).
- pgTAP invariant tests (`supabase/tests/database/000_security_invariants.test.sql`) scan the catalog on
  every run: every table has RLS, no direct writes, no access to `game` and every callable function has a
  pinned `search_path`.
- The API exposes only `public` (no GraphQL).
- Real time (D17): *Broadcast* channels with authorization, not `postgres_changes` on tables.

## Consequences

- Every new read needs a function. It is more code than a policy, but the contract with the web is explicit
  and typed (`packages/db-types`), and a column never leaks by oversight.
- If a screen needs very flexible filters, a `security_invoker` view in `public` with an explicit `select`
  grant is evaluated and documented in a new ADR.

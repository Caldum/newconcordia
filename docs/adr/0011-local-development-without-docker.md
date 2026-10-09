# 0011 · Local development without Docker

Date: 2026-10-09 · Status: Accepted

## Context

`supabase start` runs about twelve containers (Postgres, Auth, PostgREST, Kong, Realtime, Storage, Studio,
analytics and more). On the owner's Windows machine that load slowed everything down: unit tests timed out
and end-to-end journeys lost responses. The owner asked to stop using Docker locally.

The game needs three things from Supabase: the database, Auth and the REST API. Plain PostgreSQL only
provides the first.

## Options

1. A smaller local Supabase (only the containers the game uses). Still Docker.
2. Native PostgreSQL for the database tests, and a hosted Supabase project for running the web. No Docker.
3. Everything against a hosted project. No local database, but every test run depends on the network and the
   free plan's limits.

## Decision

Option 2, chosen by the owner.

- **Database tests** run on PostgreSQL 17 installed natively (`pnpm db:test:native`). Each run creates an
  empty database, applies `supabase/native/bootstrap.sql` (the Supabase roles, `auth.users`, `auth.uid()` and
  default privileges the migrations rely on), every migration, the seed and pgTAP 1.3.3, then runs every
  suite. A fresh database per run also means local leftovers can never break a test.
- **The web** runs with `pnpm dev` against a hosted **development** Supabase project, separate from staging
  and production. Migrations reach it with `supabase db push`. Steps in `docs/setup.md`.
- **CI does not change**: it still runs `supabase test db` on the real Supabase image and the end-to-end
  journeys with local Supabase, so the emulation in `bootstrap.sql` is checked against the real thing on
  every PR.

## Consequences

- If a migration starts using a Supabase object that `bootstrap.sql` does not emulate, the native run fails
  and the object is added there; CI still has the last word.
- End-to-end journeys (Playwright) need Auth, PostgREST and a mailbox, so they run in CI, not locally.
- The development project receives real emails from Auth (with its built-in mail limits) and uses the
  Turnstile test keys.

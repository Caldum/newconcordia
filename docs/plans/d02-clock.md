# D02 · Clock and game day

**Goal:** one source of truth for "now" and for the game day (fixed GMT−3), and a Cloudflare Worker that
triggers idempotent jobs: running the same job twice for the same slot leaves a single effect.

**Acceptance test (GDD):** at 03:00 UTC the game day changes, and running the same job twice leaves a
single effect.

## Design

- `game.now()`: the game clock. Returns `now()` unless the transaction sets `game.fixed_now` (tests and
  local simulations only; clients cannot set settings through the API). Every rule reads time from here.
- `game.game_day(at)`: the game day of an instant, in `Etc/GMT+3` (GMT−3 all year, no daylight saving).
  `game.game_day_start(day)`: the UTC instant the day starts (03:00 UTC).
- `game.job_runs`: one row per job and slot (`unique (job, slot)`), with status, attempts, start, end,
  duration and result. A failed run can be retried; a succeeded or running one is never repeated.
- `public.run_job(job, at)`: the only entry point for scheduled work, executable only by `service_role`.
  It computes the slot, claims it, runs the job in a subtransaction and records the outcome.
- First job: `day_change`, which opens the new game day in `game.game_days`. Later modules attach their
  daily work to it (or to their own jobs) without new entry points.
- `public.get_game_clock()`: server time, current game day and when the next one starts, for the web.
- `apps/clock`: Worker with a Cron Trigger at `0 3 * * *` (00:00 GMT−3) that calls `run_job`, plus
  `GET /health`. Structured JSON logs, observability and traces enabled.

## Tasks

1. pgTAP: clock override, game day boundaries (02:59:59 vs 03:00 UTC), day start, job idempotency,
   retry after failure, permissions (only `service_role` runs jobs), clock RPC shape. Then the migration.
2. Worker: unit tests for cron → job mapping, the RPC call (headers, body, error handling) and `/health`;
   then the implementation. Types from `wrangler types`.
3. CI and deploy: Worker tests in CI; deploy the Worker with its secret in staging and production.
4. Docs: setup steps for the Worker secret, runbook (re-running a job), glossary.

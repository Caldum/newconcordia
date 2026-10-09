-- D02: scheduled jobs are idempotent per slot, retryable after failure and run only by service_role.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

set local game.fixed_now = '2026-10-09 03:00:05+00';

-- Only the scheduler (service_role) may run jobs.
select ok(
  not has_function_privilege('anon', 'public.run_job(text, timestamptz)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.run_job(text, timestamptz)', 'EXECUTE'),
  'players cannot run scheduled jobs'
);
select ok(
  has_function_privilege('service_role', 'public.run_job(text, timestamptz)', 'EXECUTE'),
  'the scheduler can run scheduled jobs'
);

set local role service_role;

-- First run opens the game day.
select is(
  (public.run_job('day_change', '2026-10-09 03:00:00+00') ->> 'status'),
  'succeeded',
  'the first day_change run succeeds'
);

reset role;
select is(
  (select count(*) from game.game_days where day = '2026-10-09')::int,
  1,
  'day_change opened the 2026-10-09 game day'
);
select is(
  (select started_at from game.game_days where day = '2026-10-09'),
  '2026-10-09 03:00:00+00'::timestamptz,
  'the game day starts at 03:00 UTC'
);

-- Second run for the same slot (even triggered a few seconds later) is a no-op.
set local role service_role;
select is(
  (public.run_job('day_change', '2026-10-09 03:00:59+00') ->> 'status'),
  'skipped',
  'running the same job twice for the same slot is skipped'
);
reset role;
select is(
  (select count(*) from game.game_days)::int,
  1,
  'the repeated run left a single effect'
);
select is(
  (select attempts from game.job_runs where job = 'day_change' and slot = '2026-10-09 03:00:00+00'),
  1,
  'the skipped run did not count as an attempt'
);

-- The run is recorded with its duration.
select ok(
  (select status = 'succeeded' and finished_at is not null and duration_ms >= 0
   from game.job_runs where job = 'day_change' and slot = '2026-10-09 03:00:00+00'),
  'the run is recorded as succeeded with its duration'
);

-- Unknown jobs are rejected without recording anything.
set local role service_role;
select throws_ok(
  $$ select public.run_job('drop_everything', '2026-10-09 03:00:00+00') $$,
  '22023',
  'unknown job: drop_everything',
  'unknown jobs are rejected'
);

-- A failing job is recorded as failed, and the next attempt can succeed.
reset role;
create temp table saved_job on commit drop as
  select pg_get_functiondef('game.job_day_change(timestamptz)'::regprocedure) as definition;
create or replace function game.job_day_change(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$ begin raise exception 'simulated outage'; end $$;

set local role service_role;
select is(
  (public.run_job('day_change', '2026-10-10 03:00:00+00') ->> 'status'),
  'failed',
  'a job that raises is reported as failed'
);
reset role;
select is(
  (select error from game.job_runs where slot = '2026-10-10 03:00:00+00'),
  'simulated outage',
  'the failure keeps its error message'
);
select is(
  (select count(*) from game.game_days where day = '2026-10-10')::int,
  0,
  'a failed run leaves no partial effect'
);


-- The outage ends: the same slot can be retried and succeeds.
do $$ begin execute (select definition from saved_job); end $$;
set local role service_role;
select is(
  (public.run_job('day_change', '2026-10-10 03:00:00+00') ->> 'status'),
  'succeeded',
  'a failed slot can be retried'
);
reset role;
select is(
  (select attempts from game.job_runs where slot = '2026-10-10 03:00:00+00'),
  2,
  'the retry counts as a second attempt'
);
select is(
  (select count(*) from game.game_days where day = '2026-10-10')::int,
  1,
  'the retried run applied its effect once'
);

select * from finish();
rollback;

-- D02 · Game clock, game day and idempotent scheduled jobs.
--
-- game.now()            the only source of "now" for game rules (overridable in tests)
-- game.game_day(at)     the game day of an instant: fixed GMT−3, the day changes at 03:00 UTC
-- game.scheduled_jobs   the jobs the clock Worker may trigger, with their cadence
-- game.job_runs         one row per job and slot: running twice for a slot leaves one effect
-- game.game_days        the days opened by the day_change job
-- public.run_job        entry point for the scheduler (service_role only)
-- public.get_game_clock read-only clock for the web
--
-- Rollback: drop the two public functions, then the game tables and functions created here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Clock ---------------------------------------------------------------------------------------

create function game.now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  -- Tests and local simulations pin the clock with `set local game.fixed_now = '...'`. Requests
  -- that come through the API (session user `authenticator`) always get the real clock.
  select case
    when session_user <> 'authenticator'
      then coalesce(nullif(current_setting('game.fixed_now', true), '')::timestamptz, now())
    else now()
  end;
$$;
comment on function game.now() is 'Game clock. Every rule reads the time from here, never from now().';

create function game.game_day(p_at timestamptz default game.now())
returns date
language sql
stable
parallel safe
set search_path = ''
as $$
  -- Etc/GMT+3 is UTC−3 all year (POSIX sign convention), so the day always changes at 03:00 UTC.
  select (p_at at time zone 'Etc/GMT+3')::date;
$$;
comment on function game.game_day(timestamptz) is 'Game day (GMT−3) of an instant.';

create function game.game_day_start(p_day date)
returns timestamptz
language sql
stable
parallel safe
set search_path = ''
as $$
  select p_day::timestamp at time zone 'Etc/GMT+3';
$$;
comment on function game.game_day_start(date) is 'UTC instant a game day starts (03:00 UTC).';

-- Scheduled jobs ------------------------------------------------------------------------------

create table game.scheduled_jobs (
  name text primary key check (name ~ '^[a-z][a-z0-9_]{2,40}$'),
  cadence interval not null check (cadence >= interval '1 minute'),
  -- Slots are `date_bin(cadence, at, origin)`: origin anchors where each slot starts.
  origin timestamptz not null,
  description text not null
);
alter table game.scheduled_jobs enable row level security;
comment on table game.scheduled_jobs is 'Jobs the clock Worker may trigger. Each needs game.job_<name>(slot) returning jsonb.';

insert into game.scheduled_jobs (name, cadence, origin, description)
values ('day_change', interval '1 day', '2000-01-01 03:00:00+00', 'Opens the new game day at 00:00 GMT−3.');

create table game.job_runs (
  id bigint generated always as identity primary key,
  job text not null references game.scheduled_jobs (name),
  slot timestamptz not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_ms integer generated always as (
    (extract(epoch from finished_at - started_at) * 1000)::integer
  ) stored,
  result jsonb,
  error text,
  constraint job_runs_one_per_slot unique (job, slot),
  constraint job_runs_finished_after_start check (finished_at is null or finished_at >= started_at),
  constraint job_runs_error_only_when_failed check ((status = 'failed') = (error is not null))
);
alter table game.job_runs enable row level security;
comment on table game.job_runs is 'One row per job and slot; the unique key makes every job idempotent.';

create table game.game_days (
  day date primary key,
  started_at timestamptz not null
);
alter table game.game_days enable row level security;
comment on table game.game_days is 'Game days opened by the day_change job.';

create function game.job_day_change(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_day date := game.game_day(p_slot);
begin
  insert into game.game_days (day, started_at)
  values (v_day, game.game_day_start(v_day))
  on conflict (day) do nothing;

  return jsonb_build_object('game_day', v_day);
end;
$$;

-- Entry point for the scheduler ---------------------------------------------------------------

create function public.run_job(p_job text, p_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job game.scheduled_jobs;
  v_slot timestamptz;
  v_run_id bigint;
  v_result jsonb;
  v_error text;
begin
  select * into v_job from game.scheduled_jobs where name = p_job;
  if not found then
    raise exception 'unknown job: %', p_job using errcode = '22023';
  end if;

  v_slot := date_bin(v_job.cadence, coalesce(p_at, game.now()), v_job.origin);

  -- Claim the slot. A concurrent call waits on the unique key and then sees the committed status.
  insert into game.job_runs as run (job, slot, status, started_at)
  values (p_job, v_slot, 'running', clock_timestamp())
  on conflict on constraint job_runs_one_per_slot do update
    set status = 'running',
        attempts = run.attempts + 1,
        started_at = excluded.started_at,
        finished_at = null,
        result = null,
        error = null
    where run.status = 'failed'
  returning id into v_run_id;

  if v_run_id is null then
    return jsonb_build_object('status', 'skipped', 'job', p_job, 'slot', v_slot);
  end if;

  begin
    -- The job name was validated against game.scheduled_jobs above.
    execute format('select game.%I($1)', 'job_' || p_job) into v_result using v_slot;
  exception when others then
    -- The subtransaction is rolled back: a failed job leaves no partial effect.
    v_error := sqlerrm;
  end;

  update game.job_runs
  set status = case when v_error is null then 'succeeded' else 'failed' end,
      finished_at = clock_timestamp(),
      result = v_result,
      error = v_error
  where id = v_run_id;

  return jsonb_build_object(
    'status', case when v_error is null then 'succeeded' else 'failed' end,
    'job', p_job,
    'slot', v_slot,
    'result', v_result,
    'error', v_error
  );
end;
$$;
comment on function public.run_job(text, timestamptz) is
  'Runs a scheduled job for the slot of p_at (default: now). Idempotent per slot; retries failed slots.';

revoke all on function public.run_job(text, timestamptz) from public, anon, authenticated;
grant execute on function public.run_job(text, timestamptz) to service_role;

-- Read-only clock for the web -----------------------------------------------------------------

create function public.get_game_clock()
returns table (server_time timestamptz, game_day date, next_day_starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select game.now(), game.game_day(game.now()), game.game_day_start(game.game_day(game.now()) + 1);
$$;
comment on function public.get_game_clock() is 'Server time, current game day and the start of the next one.';

grant execute on function public.get_game_clock() to anon, authenticated;

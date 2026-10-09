-- D07: admin panel. Acceptance (GDD): deactivating a country turns it gray on the map and records who did it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country), now(), now(), now())
  returning id;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

set local game.fixed_now = '2026-10-09 15:00:00+00';

select pg_temp.new_player('admin@example.com', 'Ada Admin', 'ARG') as admin \gset
select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as player \gset
insert into game.admins (user_id) values (:'admin');

-- Players are not admins and cannot reach any admin function.
select pg_temp.act_as(:'player');
select ok(not public.am_i_admin(), 'a player is not an admin');
select throws_ok($$ select public.admin_schedule_country('PRT', false) $$, '42501', 'not_admin', 'players cannot switch countries');
select throws_ok($$ select public.admin_schedule_region('ESP-07', true) $$, '42501', 'not_admin', 'players cannot switch regions');
select throws_ok($$ select * from public.admin_list_countries() $$, '42501', 'not_admin', 'players cannot list the admin view');
select throws_ok($$ select * from public.admin_list_log() $$, '42501', 'not_admin', 'players cannot read the admin log');
select throws_ok($$ select * from public.admin_list_team() $$, '42501', 'not_admin', 'players cannot see the admin team');
reset role;
set local role anon;
select throws_ok($$ select public.admin_schedule_country('PRT', false) $$, '42501', null, 'visitors cannot either');
reset role;

-- Acceptance: deactivating a country.
select pg_temp.act_as(:'admin');
select ok(public.am_i_admin(), 'the admin is recognized');
select lives_ok($$ select public.admin_schedule_country('PRT', false) $$, 'the admin schedules turning Portugal off');
select results_eq(
  $$ select is_active, scheduled, apply_on from public.admin_list_countries() where code = 'PRT' $$,
  $$ values (true, false, '2026-10-10'::date) $$,
  'the change waits for the next day change'
);
select throws_ok($$ select public.admin_schedule_country('URY', true) $$, '22023', 'country_not_ready',
  'a country without regions on the map cannot be turned on');
select throws_ok($$ select public.admin_schedule_country('ARG', true) $$, '22023', 'no_change',
  'asking for the current state with nothing scheduled changes nothing');
reset role;

select is(
  (public.run_job('day_change', '2026-10-10 03:00:00+00') -> 'result' ->> 'world_changes')::int,
  1,
  'the day change applies the scheduled change'
);
select results_eq(
  $$ select is_active from public.list_countries() where code = 'PRT' $$,
  $$ values (false) $$,
  'Portugal is out of play for the map (shown in gray)'
);
select results_eq(
  $$ select actor_name, action, target, before, after from game.admin_log
     where action = 'apply_country' $$,
  $$ values ('Ada Admin', 'apply_country', 'PRT', '{"is_active": true}'::jsonb, '{"is_active": false}'::jsonb) $$,
  'the log records who did it, with the state before and after'
);
select is(
  (select count(*) from game.admin_log where action = 'schedule_country' and target = 'PRT')::int,
  1,
  'scheduling is logged too'
);

-- Regions (disputed territories) and withdrawing a scheduled change.
select pg_temp.act_as(:'admin');
select is(
  (select is_enabled from public.admin_list_regions() where code = 'ARG-06'),
  true,
  'regions start enabled'
);
select lives_ok($$ select public.admin_schedule_region('ARG-06', false) $$, 'the admin schedules disabling one');
select lives_ok($$ select public.admin_schedule_region('ARG-06', true) $$, 'and withdraws it before it applies');
select is(
  (select scheduled from public.admin_list_regions() where code = 'ARG-06'),
  null,
  'nothing is scheduled any more'
);
select lives_ok($$ select public.admin_schedule_region('ARG-06', false) $$, 'scheduled again');
select is(
  (select count(*) from public.admin_list_log() where action in ('schedule_region', 'cancel_region'))::int,
  3,
  'every step is in the log'
);
reset role;
select is(public.run_job('day_change', '2026-10-11 03:00:00+00') ->> 'status', 'succeeded', 'the next day change runs');
select is((select is_enabled from game.regions where code = 'ARG-06'), false, 'the region is disabled at the day change');

-- The log cannot be rewritten.
select throws_ok($$ delete from game.admin_log $$, '42501', 'admin_log is append-only', 'the admin log is append-only');

select * from finish();
rollback;

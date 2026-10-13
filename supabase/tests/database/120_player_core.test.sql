-- R1: player core. Acceptance (spec section 11): Novice → Militia I at 100 military XP, the second step at
-- 400, General V at 562,500, nothing beyond. A civil level reward is paid once per level.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
          now(), now(), now())
  returning id;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- The game day is UTC.
select is(game.game_day('2026-10-09 23:59:59+00'), '2026-10-09'::date, 'one second before midnight UTC it is still the day');
select is(game.game_day('2026-10-10 00:00:00+00'), '2026-10-10'::date, 'the game day changes at 00:00 UTC');
select is(game.game_day_start('2026-10-10'), '2026-10-10 00:00:00+00'::timestamptz, 'a game day starts at 00:00 UTC');
select is(
  (select origin from game.scheduled_jobs where name = 'day_change'),
  '2000-01-01 00:00:00+00'::timestamptz,
  'the day change job runs at 00:00 UTC'
);

set local game.fixed_now = '2026-10-13 12:00:00+00';
select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset

-- A new citizen.
select results_eq(
  format($$ select health, strength, experience, military_xp from game.player_stats where user_id = %L $$, :'camila'),
  $$ values (100, 0, 0::bigint, 0::bigint) $$,
  'a new citizen has full health, no strength and no experience'
);

-- Civil levels: L needs 100 × L².
select is(game.level_for_experience(0), 0, 'everyone starts at level 0');
select is(game.level_for_experience(99), 0, '99 XP is still level 0');
select is(game.level_for_experience(100), 1, '100 XP reaches level 1');
select is(game.level_for_experience(400), 2, '400 XP reaches level 2');
select is(game.level_for_experience(22499), 14, 'one point short of level 15');
select is(game.level_for_experience(22500), 15, '22,500 XP reaches level 15 (presidential candidacy)');
select is(game.experience_for_level(5), 2500::bigint, 'level 5 (voting) needs 2,500 XP');

-- A level reward is paid once per new level.
select game.citizen_account(:'camila', 'GOLD') as gold \gset
select balance as gold_before from game.accounts where id = :'gold' \gset
select is(game.add_civil_xp(:'camila', 450), 2, 'crossing two levels at once');
select is(
  (select balance from game.accounts where id = :'gold') - :'gold_before'::bigint,
  200::bigint,
  '1 GOLD for each new level'
);
select is(game.add_civil_xp(:'camila', 49), 2, 'XP inside a level pays nothing');
select is(game.add_civil_xp(:'camila', 401), 3, 'reaching level 3 at 900 XP');
select is(
  (select balance from game.accounts where id = :'gold') - :'gold_before'::bigint,
  300::bigint,
  'each level paid exactly once'
);
select is(
  (select count(*) from game.ledger_transactions where idempotency_key like 'level_reward:' || :'camila' || ':%')::int,
  3,
  'one reward transaction per level, keyed by level'
);
select throws_ok(
  format($$ select game.add_civil_xp(%L, -1) $$, :'camila'),
  '22023', 'amount_invalid', 'XP is never negative'
);

-- Military ranks: step n needs 100 × n², capped at 75.
select is(game.rank_step(99), 0, 'Novice below 100 military XP');
select is(game.rank_step(100), 1, 'acceptance: Militia I at 100');
select is(game.rank_step(400), 2, 'acceptance: the second step at 400');
select is(game.rank_step(562500), 75, 'acceptance: General V at 562,500');
select is(game.rank_step(10000000), 75, 'acceptance: nothing beyond General V');
select is(game.add_military_xp(:'camila', 562500), 75, 'military XP raises the rank');

-- The profile.
select pg_temp.act_as(:'camila');
select results_eq(
  $$ select level, experience, level_experience, next_level_experience, health, strength, military_xp, rank_step,
            rank_xp, next_rank_xp
     from public.get_my_profile() $$,
  $$ values (3, 900::bigint, 900::bigint, 1600::bigint,
             100, 0, 562500::bigint, 75, 562500::bigint, null::bigint) $$,
  'the profile shows level, health, strength and rank with their thresholds'
);
reset role;

select * from finish();
rollback;

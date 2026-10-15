-- D08: profile and energy. Since ADR 0047 energy only comes from food (tested in 150): without it, energy
-- stays where it is.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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

set local game.fixed_now = '2026-10-08 12:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
-- Without food, so nothing moves energy (automatic food is tested in 150).
select game.take_goods(game.holder_for_citizen(:'camila'), 'food_q1', 10, 'test', 'test');
select game.take_goods(game.holder_for_citizen(:'marcos'), 'food_q1', 10, 'test', 'test');

-- Balance parameters.
select is(game.param('energy_max'), 100::numeric, 'energy tops out at 100');
select throws_ok(
  $$ select game.param('no_such_param') $$,
  'P0002',
  'balance_param_missing',
  'a missing balance parameter fails instead of defaulting'
);

-- Starting values.
select results_eq(
  $$ select experience, strength, damage, influence, energy, energy_at
     from game.player_stats where user_id = (select user_id from game.citizens where name = 'Camila Ríos') $$,
  $$ values (0::bigint, 0, 0::bigint, 0, 100, '2026-10-08 12:00:00+00'::timestamptz) $$,
  'a new citizen starts with 100 energy and no strength (spec damage 10 + F, R1)'
);

-- Spending.
select is(game.spend_energy(:'camila', 50), 50, 'spending returns what is left');
select throws_ok(
  format($$ select game.spend_energy(%L, 60) $$, :'camila'),
  '22023',
  'not_enough_energy',
  'nobody spends more energy than they have'
);
select throws_ok(
  format($$ select game.spend_energy(%L, 0) $$, :'camila'),
  '22023',
  'energy_amount_invalid',
  'spending needs a positive amount'
);
select throws_ok(
  format($$ select game.spend_energy(%L, 10) $$, gen_random_uuid()),
  'P0002',
  'no_citizen',
  'only citizens spend energy'
);

-- Without food energy does not rise, however long the player waits (ADR 0047).
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 50, 'right after spending, energy is 50');
reset role;
set local game.fixed_now = '2026-10-08 15:00:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 50, 'three hours later, without food, energy is still 50');
select is((select next_meal_energy from public.get_my_profile()), null, 'and no meal is coming');
reset role;
select ok(
  not exists (select 1 from game.balance_params where key = 'energy_per_hour'),
  'energy no longer recharges by the hour'
);
set local game.fixed_now = '2026-10-09 03:00:00+00';
select pg_temp.act_as(:'camila');
select is((select food_appetite from public.get_my_profile()), 10, 'meanwhile the appetite built up to 10');
reset role;
set local game.fixed_now = '2026-10-10 12:00:00+00';
select is(game.spend_energy(:'camila', 10), 40, 'spending takes from what is there');
set local game.fixed_now = '2026-10-10 15:45:00+00';
select is(game.spend_energy(:'camila', 10), 30, 'and nothing came back in between');
set local game.fixed_now = '2026-10-10 15:48:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 30, 'still 30 when read');
reset role;

-- Energy above the maximum is kept.
update game.player_stats set energy = 150, energy_at = game.now() where user_id = :'marcos';
set local game.fixed_now = '2026-10-10 18:00:00+00';
select pg_temp.act_as(:'marcos');
select is((select energy from public.get_my_profile()), 150, 'energy above the maximum is kept');
reset role;
select is(game.spend_energy(:'marcos', 60), 90, 'spending from above the maximum');

-- The player's own profile (levels and ranks are tested in 120_player_core).
update game.player_stats set experience = 6420, damage = 1500000, influence = 340 where user_id = :'camila';
select pg_temp.act_as(:'camila');
select results_eq(
  $$ select name, level, experience, level_experience, next_level_experience, health, strength, damage,
            rank_step, next_rank_xp, influence, energy_max, food_appetite_max, checked_at
     from public.get_my_profile() $$,
  $$ values ('Camila Ríos', 8, 6420::bigint, 6400::bigint, 8100::bigint, 100, 0, 1500000::bigint,
             0, 100::bigint, 340, 100, 10, '2026-10-10 18:00:00+00'::timestamptz) $$,
  'the profile shows the attributes with the derived level and rank'
);
reset role;
select pg_temp.act_as(:'marcos');
select is(
  (select array_agg(name) from public.get_my_profile()),
  array['Marcos Villalba'],
  'each player reads only their own profile'
);
reset role;
select pg_temp.act_as(gen_random_uuid());
select is_empty($$ select * from public.get_my_profile() $$, 'an account without a citizen has no profile');
reset role;

-- Access.
select ok(
  not has_function_privilege('anon', 'public.get_my_profile()', 'EXECUTE'),
  'visitors cannot read profiles'
);
select ok(
  has_function_privilege('authenticated', 'public.get_my_profile()', 'EXECUTE'),
  'signed-in players can read their profile'
);

select * from finish();
rollback;

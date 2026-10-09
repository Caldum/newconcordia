-- D08: profile and energy. Acceptance (GDD): with the clock moved 3 hours forward, energy rises by 30 and
-- never goes above 100.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

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

-- Balance parameters.
select is(game.param('energy_max'), 100::numeric, 'energy tops out at 100');
select is(game.param('energy_per_hour'), 10::numeric, 'energy recharges 10 per hour');
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
  $$ values (0::bigint, 100, 0::bigint, 0, 100, '2026-10-08 12:00:00+00'::timestamptz) $$,
  'a new citizen starts with 100 energy and 100 strength'
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

-- Acceptance: 3 hours later energy rises by 30.
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 50, 'right after spending, energy is 50');
reset role;
set local game.fixed_now = '2026-10-08 15:00:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 80, 'acceptance: 3 hours later energy rose by 30');
select is(
  (select next_energy_at from public.get_my_profile()),
  '2026-10-08 15:06:00+00'::timestamptz,
  'the next point arrives 6 minutes later'
);
reset role;
select is(
  (select energy from game.player_stats where user_id = :'camila'),
  50,
  'reading energy computes it without writing'
);

-- Acceptance: never above 100.
set local game.fixed_now = '2026-10-09 03:00:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 100, 'acceptance: energy never goes above 100');
select is((select next_energy_at from public.get_my_profile()), null, 'a full bar has no next point');
reset role;

-- Spending keeps the progress toward the next point.
set local game.fixed_now = '2026-10-10 12:00:00+00';
select is(game.spend_energy(:'camila', 50), 50, 'spending from a full bar');
set local game.fixed_now = '2026-10-10 15:45:00+00';
select is(game.spend_energy(:'camila', 10), 77, '3 h 45 min recharged 37 points before spending 10');
set local game.fixed_now = '2026-10-10 15:48:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 78, 'the 3 minutes already recharged count toward the next point');
reset role;

-- Energy above the maximum (food, D12) is kept, and recharge does not add to it.
update game.player_stats set energy = 150, energy_at = game.now() where user_id = :'marcos';
set local game.fixed_now = '2026-10-10 18:00:00+00';
select pg_temp.act_as(:'marcos');
select is((select energy from public.get_my_profile()), 150, 'energy above the maximum is kept and does not recharge');
reset role;
select is(game.spend_energy(:'marcos', 60), 90, 'spending from above the maximum');

-- Level curve: reaching level n needs 10 × (n − 1)² experience.
select is(game.level_for_experience(0), 1, 'everyone starts at level 1');
select is(game.level_for_experience(9), 1, '9 experience is still level 1');
select is(game.level_for_experience(10), 2, '10 experience reaches level 2');
select is(game.level_for_experience(40), 3, '40 experience reaches level 3');
select is(game.level_for_experience(6759), 26, 'one point short of level 27');
select is(game.level_for_experience(6760), 27, '6,760 experience reaches level 27');
select is(game.experience_for_level(28), 7290::bigint, 'level 28 needs 7,290 experience');

-- Rank: reaching rank n needs 10,000 × n² damage, up to 20.
select is(game.rank_for_damage(9999), 0, 'no rank before 10,000 damage');
select is(game.rank_for_damage(10000), 1, '10,000 damage reaches rank 1');
select is(game.rank_for_damage(1440000), 12, 'rank 12 needs 1.44 million damage');
select is(game.rank_for_damage(10000000000), 20, 'rank stops at 20');

-- The player's own profile.
update game.player_stats set experience = 6420, damage = 1500000, influence = 340 where user_id = :'camila';
select pg_temp.act_as(:'camila');
select results_eq(
  $$ select name, level, experience, level_experience, next_level_experience,
            strength, damage, rank, next_rank_damage, influence, energy_max, energy_per_hour, checked_at
     from public.get_my_profile() $$,
  $$ values ('Camila Ríos', 26, 6420::bigint, 6250::bigint, 6760::bigint,
             100, 1500000::bigint, 12, 1690000::bigint, 340, 100, 10, '2026-10-10 18:00:00+00'::timestamptz) $$,
  'the profile shows the attributes with the derived level and rank'
);
reset role;
update game.player_stats set damage = 4000000 where user_id = :'camila';
select pg_temp.act_as(:'camila');
select is(
  (select next_rank_damage from public.get_my_profile()),
  null,
  'the highest rank has no next threshold'
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

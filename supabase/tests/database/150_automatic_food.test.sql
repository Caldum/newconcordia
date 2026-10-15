-- R4 and ADR 0047: automatic food. Appetite builds up 2 a minute (up to 10 and to what is missing); once it
-- covers the lowest-quality food held, that unit is eaten whole. Intervals catch up after absence; nothing is
-- eaten at 100 energy; without food energy does not rise.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

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

create function pg_temp.food(p_user_id uuid, p_good text)
returns numeric
language sql
as $$
  select game.holder_quantity(game.holder_for_citizen(p_user_id), p_good);
$$;

set local game.fixed_now = '2026-10-13 12:00:00+00';
select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset

select is(game.food_tick('2026-10-13 12:04:59+00'), '2026-10-13 12:04:00+00'::timestamptz, 'intervals run on a 1-minute UTC grid');

-- Full energy: nothing is eaten, however long the player is away.
select game.settle_food(:'camila');
set local game.fixed_now = '2026-10-13 13:00:00+00';
select is(game.settle_food(:'camila'), 100, 'at 100 energy the bar stays full');
select is(pg_temp.food(:'camila', 'food_q1'), 10::numeric, 'acceptance: nothing is eaten at 100 energy');

-- Spending 50 at 13:00. At 13:01 the appetite is 2 and one Q1 food gives 2.
select game.spend_energy(:'camila', 50);
set local game.fixed_now = '2026-10-13 13:01:30+00';
select is(game.settle_food(:'camila'), 52, 'one minute: 50 + 2 from a Q1 food');
select is(pg_temp.food(:'camila', 'food_q1'), 9::numeric, 'one Q1 food was eaten');
select is(game.settle_food(:'camila'), 52, 'settling again in the same minute eats nothing more');

-- Away until 14:00: one Q1 a minute until the food runs out at 13:10; then energy stays.
set local game.fixed_now = '2026-10-13 14:00:00+00';
select is(game.settle_food(:'camila'), 70, 'acceptance: the missed minutes are caught up, and without food nothing more');
select is(pg_temp.food(:'camila', 'food_q1'), 0::numeric, 'all ten were eaten');
select is(
  (select count(*) from game.inventory_movements
   where kind = 'automatic_food' and from_holder_id = game.holder_for_citizen(:'camila'))::int,
  10,
  'each meal is in the inventory log'
);

-- The lowest quality goes first and waits until the appetite covers all of it.
select game.take_goods(game.holder_for_citizen(:'ana'), 'food_q1', 10, 'test', 'test');
select game.put_goods(game.holder_for_citizen(:'ana'), 'food_q3', 'BRA', 1, 'test', 'test');
select game.put_goods(game.holder_for_citizen(:'ana'), 'food_q2', 'BRA', 1, 'test', 'test');
select game.spend_energy(:'ana', 40);
set local game.fixed_now = '2026-10-13 14:01:00+00';
select is(game.settle_food(:'ana'), 60, 'a Q2 gives 4: with 2 of appetite nothing is eaten yet');
select is(pg_temp.food(:'ana', 'food_q2'), 1::numeric, 'the Q2 waits');
set local game.fixed_now = '2026-10-13 14:02:00+00';
select is(game.settle_food(:'ana'), 64, 'the next minute the Q2 is eaten whole');
set local game.fixed_now = '2026-10-13 14:05:00+00';
select is(game.settle_food(:'ana'), 70, 'then the Q3 after three minutes');

-- Nothing is wasted: a Q5 waits until 10 are missing.
update game.player_stats set energy = 98, food_appetite = 0 where user_id = :'ana';
select game.put_goods(game.holder_for_citizen(:'ana'), 'food_q5', 'BRA', 1, 'test', 'test');
set local game.fixed_now = '2026-10-13 14:30:00+00';
select is(game.settle_food(:'ana'), 98, 'with 2 missing a Q5 is not eaten');
select is(pg_temp.food(:'ana', 'food_q5'), 1::numeric, 'and stays in the inventory');
select game.spend_energy(:'ana', 8);
set local game.fixed_now = '2026-10-13 14:40:00+00';
select is(game.settle_food(:'ana'), 100, 'once 10 are missing and built up, it gives all 10');

-- Food that arrives is eaten from the next minute on, one meal a minute, never in minutes already past.
set local game.fixed_now = '2026-10-13 15:00:00+00';
select game.put_goods(game.holder_for_citizen(:'camila'), 'food_q1', 'ARG', 20, 'test', 'test');
select is(game.settle_food(:'camila'), 70, 'food bought now is not eaten in the past hour');
set local game.fixed_now = '2026-10-13 15:01:00+00';
select is(game.settle_food(:'camila'), 72, 'one meal the next minute');
select is(pg_temp.food(:'camila', 'food_q1'), 19::numeric, 'only one');

-- Arriving settles: the profile and the inventory show the meals.
set local game.fixed_now = '2026-10-13 15:05:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 80, 'reading the profile eats the pending minutes');
select results_eq(
  $$ select food_appetite, food_appetite_max, food_energy_per_interval, food_interval_minutes, food_at, next_meal_energy
     from public.get_my_profile() $$,
  $$ values (8, 10, 2, 1, '2026-10-13 15:05:00+00'::timestamptz, 2) $$,
  'the profile says how much appetite there is and what the next meal gives'
);
select is(
  (select quantity from public.get_my_inventory() where good_code = 'food_q1'),
  15::numeric,
  'and the inventory shows what was eaten'
);
reset role;

select ok(
  not exists (select 1 from pg_proc where proname = 'eat_rations'),
  'food is no longer eaten by hand'
);
select ok(
  not exists (select 1 from game.balance_params where key = 'food_energy_daily_max'),
  'the daily food cap of the GDD is gone'
);

select * from finish();
rollback;

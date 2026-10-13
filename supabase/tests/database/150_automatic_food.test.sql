-- R4: automatic food every 5 minutes. Acceptance (roadmap R4): intervals catch up after absence; nothing is
-- eaten at 100 energy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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

select is(game.food_tick('2026-10-13 12:04:59+00'), '2026-10-13 12:00:00+00'::timestamptz, 'intervals run on a 5-minute UTC grid');

-- Full energy: nothing is eaten, however long the player is away.
select game.settle_food(:'camila');
set local game.fixed_now = '2026-10-13 13:00:00+00';
select is(game.settle_food(:'camila'), 100, 'at 100 energy the bar stays full');
select is(pg_temp.food(:'camila', 'food_q1'), 10::numeric, 'acceptance: nothing is eaten at 100 energy');

-- Spending 50 at 13:00. At 13:05 one Q1 food gives 10.
select game.spend_energy(:'camila', 50);
set local game.fixed_now = '2026-10-13 13:07:00+00';
select is(game.settle_food(:'camila'), 61, 'one interval: 50 + 10 from food + 1 recharged');
select is(pg_temp.food(:'camila', 'food_q1'), 9::numeric, 'one Q1 food was eaten');
select is(game.settle_food(:'camila'), 61, 'settling again in the same interval eats nothing more');

-- Away until 14:00: 13:10, 13:15, 13:20 and 13:25 bring the bar to 100; then nothing more.
set local game.fixed_now = '2026-10-13 14:00:00+00';
select is(game.settle_food(:'camila'), 100, 'acceptance: the missed intervals are caught up on arrival');
select is(pg_temp.food(:'camila', 'food_q1'), 5::numeric, 'four more were eaten, then the bar was full');
select is(
  (select count(*) from game.inventory_movements
   where kind = 'automatic_food' and from_holder_id = game.holder_for_citizen(:'camila'))::int,
  5,
  'each meal is in the inventory log'
);
select is(
  (select energy from game.player_stats where user_id = :'camila'),
  100,
  'food never takes energy above 100'
);

-- The lowest sufficient quality goes first; the excess over 10 is lost.
select game.take_goods(game.holder_for_citizen(:'ana'), 'food_q1', 10, 'test', 'test');
select game.put_goods(game.holder_for_citizen(:'ana'), 'food_q3', 'BRA', 1, 'test', 'test');
select game.put_goods(game.holder_for_citizen(:'ana'), 'food_q2', 'BRA', 1, 'test', 'test');
select game.spend_energy(:'ana', 40);
set local game.fixed_now = '2026-10-13 14:05:00+00';
select is(game.settle_food(:'ana'), 70, 'Q2 gives 20 but an interval restores at most 10');
select results_eq(
  format($$ select pg_temp.food(%L, 'food_q2'), pg_temp.food(%L, 'food_q3') $$, :'ana', :'ana'),
  $$ values (0::numeric, 1::numeric) $$,
  'the lowest quality available was eaten first'
);

-- Without food only the hourly recharge remains.
select game.take_goods(game.holder_for_citizen(:'ana'), 'food_q3', 1, 'test', 'test');
select game.spend_energy(:'ana', 70);
set local game.fixed_now = '2026-10-13 15:00:00+00';
select is(game.settle_food(:'ana'), 10, 'no food: 0 + 10 recharged in an hour');

-- Arriving settles: the profile and the inventory show the meals.
select game.spend_energy(:'camila', 30);
set local game.fixed_now = '2026-10-13 15:05:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.get_my_profile()), 80, 'reading the profile eats the pending interval');
select is(
  (select quantity from public.get_my_inventory() where good_code = 'food_q1'),
  4::numeric,
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

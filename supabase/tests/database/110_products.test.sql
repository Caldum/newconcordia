-- D12: products and consumption. Acceptance (GDD): recovering more than 200 energy from food on the same
-- day is rejected.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

set local game.fixed_now = '2026-10-09 15:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
insert into game.inventories (user_id, good_code, quantity) values (:'camila', 'ration', 30);
select game.spend_energy(:'camila', 100);

-- Weapons carry their multiplier.
select results_eq(
  $$ select code, damage_multiplier from game.goods where damage_multiplier is not null order by code $$,
  $$ values ('weapon_q1', 1.2), ('weapon_q2', 1.4), ('weapon_q3', 1.6), ('weapon_q4', 1.8), ('weapon_q5', 2.0) $$,
  'a Q weapon multiplies damage by 1 + 0.2 × Q'
);

-- Eating.
select pg_temp.act_as(:'camila');
select results_eq(
  $$ select energy_gained, energy, food_energy_today from public.eat_rations(5, 'f0000000-0000-4000-8000-000000000001') $$,
  $$ values (50, 50, 50) $$,
  '5 rations give 50 energy'
);
select results_eq(
  $$ select energy_gained, energy, food_energy_today from public.eat_rations(5, 'f0000000-0000-4000-8000-000000000001') $$,
  $$ values (50, 50, 50) $$,
  'the same request again eats nothing more'
);
select is((select quantity from public.get_my_inventory() where good_code = 'ration'), 25::numeric, '5 rations were used');
reset role;

-- Recharge is settled first: 2 hours later the bar has 20 more, and food adds on top.
set local game.fixed_now = '2026-10-09 17:00:00+00';
select pg_temp.act_as(:'camila');
select is((select energy from public.eat_rations(10, gen_random_uuid())), 170, '50 + 20 recharged + 100 from food');
select is((select energy from public.get_my_profile()), 170, 'food takes energy above 100');
select is((select next_energy_at from public.get_my_profile()), null, 'above 100 there is no recharge');

-- Acceptance: at most 200 from food per game day.
select throws_ok(
  $$ select * from public.eat_rations(6, gen_random_uuid()) $$,
  '22023', 'food_limit', 'acceptance: 150 eaten, 60 more would pass 200'
);
select is((select food_energy_today from public.eat_rations(5, gen_random_uuid())), 200, 'exactly 200 is allowed');
select throws_ok(
  $$ select * from public.eat_rations(1, gen_random_uuid()) $$,
  '22023', 'food_limit', 'acceptance: nothing more today'
);
select is((select quantity from public.get_my_inventory() where good_code = 'ration'), 10::numeric, 'refused meals keep the rations');
reset role;

-- A new game day starts the count again (the day changes at 03:00 UTC).
set local game.fixed_now = '2026-10-10 03:00:00+00';
select pg_temp.act_as(:'camila');
select is((select energy_gained from public.eat_rations(1, gen_random_uuid())), 10, 'a new day, a new 200');
select throws_ok(
  $$ select * from public.eat_rations(99, gen_random_uuid()) $$,
  '22023', 'quantity_unavailable', 'only the rations the player has'
);
select throws_ok(
  $$ select * from public.eat_rations(0, gen_random_uuid()) $$,
  '22023', 'amount_invalid', 'at least one ration'
);
reset role;

-- Moving goods between a depot and the inventory.
insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
values ('Taller Ríos', :'camila', 'ARG', 'ARG-01', 'weapon_q3', game.now())
returning id as workshop \gset
insert into game.company_stock (company_id, good_code, quantity) values (:'workshop', 'weapon_q3', 42);
select pg_temp.act_as(:'camila');
select public.move_goods(:'workshop', 'weapon_q3', 24, true);
select is((select quantity from public.get_my_inventory() where good_code = 'weapon_q3'), 24::numeric, 'from the depot to the inventory');
select public.move_goods(:'workshop', 'weapon_q3', 4, false);
select is((select quantity from public.get_company_stock(:'workshop') where good_code = 'weapon_q3'), 22::numeric, 'and back to the depot');
select throws_ok(
  format($$ select public.move_goods(%s, 'weapon_q3', 100, true) $$, :'workshop'),
  '22023', 'quantity_unavailable', 'only what the depot holds'
);
reset role;
select pg_temp.act_as(:'marcos');
select throws_ok(
  format($$ select public.move_goods(%s, 'weapon_q3', 1, true) $$, :'workshop'),
  '42501', 'not_your_company', 'only the owner moves goods'
);
reset role;

select ok(not has_function_privilege('anon', 'public.eat_rations(integer, uuid)', 'EXECUTE'), 'visitors cannot eat');

select * from finish();
rollback;

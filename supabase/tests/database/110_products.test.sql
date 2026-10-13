-- D12: products. Weapon multipliers and moving goods between a depot and the inventory. Food is eaten
-- automatically since R4 (150_automatic_food).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

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

-- Weapons carry their multiplier.
select results_eq(
  $$ select code, damage_multiplier from game.goods where damage_multiplier is not null order by code $$,
  $$ values ('weapon_q1', 1.2), ('weapon_q2', 1.4), ('weapon_q3', 1.6), ('weapon_q4', 1.8), ('weapon_q5', 2.0) $$,
  'a Q weapon multiplies damage by 1 + 0.2 × Q'
);

-- Moving goods between a depot and the inventory.
insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
values ('Taller Ríos', :'camila', 'ARG', 'ARG-01', 'weapon_q3', game.now())
returning id as workshop \gset
select game.put_goods(game.holder_for_company(:'workshop'), 'weapon_q3', 'ARG', 42, 'test', 'test');
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

select * from finish();
rollback;

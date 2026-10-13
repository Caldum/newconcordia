-- R3: goods catalog, inventory lots with origin, holders and the movement log. Acceptance (roadmap R3): stock
-- never negative; origin survives every movement.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into game.mint_reasons (kind, authority, description) values ('test', 'system_reward', 'Test funding.');

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

-- Quantity of a good a holder has from one origin (0 when none).
create function pg_temp.lot(p_holder bigint, p_good text, p_origin text)
returns numeric
language sql
as $$
  select coalesce((select quantity from game.inventory_lots
                   where holder_id = p_holder and good_code = p_good and origin_country_code = p_origin), 0);
$$;

set local game.fixed_now = '2026-10-13 15:00:00+00';

-- Catalog (spec section 5).
select results_eq(
  $$ select code, category from game.goods where kind = 'raw' and active order by code $$,
  $$ values ('food_raw', 'food'), ('medical_raw', 'medical'), ('military_raw', 'military') $$,
  'three generic raw materials'
);
select results_eq(
  $$ select quality, input_good_code, input_per_unit, energy from game.goods where code like 'food_q%' order by quality $$,
  $$ values (1, 'food_raw', 1::numeric, 10), (2, 'food_raw', 2::numeric, 20), (3, 'food_raw', 3::numeric, 30),
            (4, 'food_raw', 4::numeric, 40), (5, 'food_raw', 5::numeric, 50) $$,
  'food Q1–Q5: Q food raw per unit, 10 × Q energy'
);
select results_eq(
  $$ select quality, input_good_code, input_per_unit, damage_multiplier from game.goods where code like 'weapon_q%' order by quality $$,
  $$ values (1, 'military_raw', 10::numeric, 1.2), (2, 'military_raw', 20::numeric, 1.4), (3, 'military_raw', 30::numeric, 1.6),
            (4, 'military_raw', 40::numeric, 1.8), (5, 'military_raw', 50::numeric, 2.0) $$,
  'weapons Q1–Q5: 10 × Q military raw per unit, damage ×(1 + 0.2 Q)'
);
select results_eq(
  $$ select quality, input_good_code, input_per_unit, heal from game.goods where code like 'kit_q%' order by quality $$,
  $$ values (1, 'medical_raw', 5::numeric, 5), (2, 'medical_raw', 10::numeric, 10), (3, 'medical_raw', 15::numeric, 15),
            (4, 'medical_raw', 20::numeric, 20), (5, 'medical_raw', 25::numeric, 25) $$,
  'kits Q1–Q5: 5 × Q medical raw per unit, heal 5 × Q'
);
select is(
  (select array_agg(code order by code) from game.goods where not active),
  array['fuel', 'iron', 'oil', 'ration', 'wheat'],
  'the goods before the specification are retired'
);

-- Holders and the grant's food lot.
select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select game.holder_for_citizen(:'camila') as camila_h \gset
select game.holder_for_citizen(:'ana') as ana_h \gset
select game.holder_for_citizen(:'marcos') as marcos_h \gset
select is(game.holder_for_citizen(:'camila'), :'camila_h'::bigint, 'one holder per citizen');
select is(pg_temp.lot(:'camila_h', 'food_q1', 'ARG'), 10::numeric, 'the grant''s Q1 food comes from the citizen''s country');
select is(
  (select kind from game.inventory_movements where to_holder_id = :'camila_h' and good_code = 'food_q1'),
  'welcome_grant',
  'and its arrival is logged'
);

-- Taking consumes the oldest lots first and keeps each origin.
select game.put_goods(:'ana_h', 'military_raw', 'BRA', 30, 'test', 'r3');
select game.put_goods(:'ana_h', 'military_raw', 'ARG', 30, 'test', 'r3');
select game.take_goods(:'ana_h', 'military_raw', 40, 'transfer', 'r3', null, :'camila_h');
select results_eq(
  format($$ select pg_temp.lot(%s, 'military_raw', 'BRA'), pg_temp.lot(%s, 'military_raw', 'ARG'),
                   pg_temp.lot(%s, 'military_raw', 'BRA'), pg_temp.lot(%s, 'military_raw', 'ARG') $$,
         :'ana_h', :'ana_h', :'camila_h', :'camila_h'),
  $$ values (0::numeric, 20::numeric, 30::numeric, 10::numeric) $$,
  'acceptance: a move takes the oldest lot first and the units keep their origin'
);
select is(
  (select count(*) from game.inventory_movements where reference = 'r3' and kind = 'transfer')::int,
  2,
  'one movement per origin moved'
);
select throws_ok(
  format($$ select game.take_goods(%s, 'military_raw', 21, 'consumption', 'r3') $$, :'ana_h'),
  '22023', 'quantity_unavailable', 'acceptance: nobody takes more than they hold'
);
select is(game.holder_quantity(:'ana_h', 'military_raw'), 20::numeric, 'and a refused take changes nothing');
select throws_ok(
  format($$ select game.take_goods(%s, 'military_raw', 5, 'consumption', 'r3', 'BRA') $$, :'ana_h'),
  '22023', 'quantity_unavailable', 'taking from one origin counts only that origin'
);
select throws_ok(
  format($$ select game.put_goods(%s, 'military_raw', 'ARG', 0, 'test', 'r3') $$, :'ana_h'),
  '22023', 'amount_invalid', 'quantities are positive'
);
select throws_ok(
  format($$ update game.inventory_lots set quantity = -1 where holder_id = %s and good_code = 'military_raw' and origin_country_code = 'ARG' $$, :'ana_h'),
  '23514', null, 'acceptance: a lot can never go below zero'
);
select throws_ok(
  format($$ update game.inventory_lots set origin_country_code = 'ARG' where holder_id = %s and origin_country_code = 'BRA' $$, :'camila_h'),
  '42501', 'origin_immutable', 'acceptance: the origin of a lot never changes'
);
select throws_ok(
  $$ delete from game.inventory_movements $$,
  '42501', 'the inventory log is append-only', 'the movement log cannot be changed'
);
select throws_ok(
  format($$ select game.put_goods(%s, 'ration', 'ARG', 1, 'test', 'r3') $$, :'ana_h'),
  '22023', 'good_invalid', 'retired goods are not created anymore'
);

-- Origin through the market: Camila offers Brazilian raw in Argentina; it is an import.
select pg_temp.act_as(:'camila');
select public.post_offer('military_raw', 25, 100, 'ARG', 'e0000000-0000-4000-8000-000000000001') as offer \gset
reset role;
select results_eq(
  format($$ select origin_country_code, quantity from game.market_offers where id = %s $$, :'offer'),
  $$ values ('BRA', 25) $$,
  'an offer takes its units from one origin and keeps it'
);
select is(pg_temp.lot(:'camila_h', 'military_raw', 'BRA'), 5::numeric, 'the offered units leave the lot');
select pg_temp.act_as(:'camila');
select is(
  (select imported from public.list_market('ARG', 'military_raw') where offer_id = :'offer'),
  true,
  'by origin, the offer is an import into Argentina'
);
select throws_ok(
  $$ select public.post_offer('military_raw', 16, 100, 'ARG', gen_random_uuid()) $$,
  '22023', 'quantity_unavailable', 'an offer needs one origin with enough units'
);
select public.post_offer('military_raw', 3, 100, 'ARG', gen_random_uuid(), null, 'ARG') as offer2 \gset
reset role;
select is(
  (select origin_country_code from game.market_offers where id = :'offer2'),
  'ARG',
  'the seller may choose the origin'
);
select game.transfer(game.system_account('issuer', 'ARG'), game.citizen_account(:'marcos', 'ARG'), 100000, 'test', null);
select pg_temp.act_as(:'marcos');
select public.buy(:'offer', 10, gen_random_uuid());
reset role;
select is(pg_temp.lot(:'marcos_h', 'military_raw', 'BRA'), 10::numeric, 'acceptance: the buyer receives the units with their origin');
select pg_temp.act_as(:'camila');
select public.withdraw_offer(:'offer');
reset role;
select is(pg_temp.lot(:'camila_h', 'military_raw', 'BRA'), 20::numeric, 'acceptance: withdrawn units return with their origin');
select results_eq(
  format($$ select kind, from_holder_id is not null, to_holder_id is not null from game.inventory_movements
            where reference = 'offer:' || %s order by id $$, :'offer'),
  $$ values ('market_offer', true, false), ('market_purchase', false, true), ('market_withdrawal', false, true) $$,
  'every step of the offer is in the log'
);
select pg_temp.act_as(:'camila');
select results_eq(
  $$ select good_code, quantity from public.get_my_inventory() order by good_code $$,
  $$ values ('food_q1', 10::numeric), ('military_raw', 27::numeric) $$,
  'the inventory adds the lots of each good'
);

-- Moving between the owner and an own company keeps the origin.
reset role;
insert into game.companies (name, owner_user_id, country_code, region_code, good_code, points, created_at)
select 'Arsenal Ríos', :'camila', 'ARG', region_code, 'weapon_q1', 4, game.now()
from game.citizens where user_id = :'camila'
returning id as arsenal \gset
select game.holder_for_company(:'arsenal') as arsenal_h \gset
select pg_temp.act_as(:'camila');
select public.move_goods(:'arsenal', 'military_raw', 25, false);
reset role;
select results_eq(
  format($$ select pg_temp.lot(%s, 'military_raw', 'BRA'), pg_temp.lot(%s, 'military_raw', 'ARG') $$, :'arsenal_h', :'arsenal_h'),
  $$ values (20::numeric, 5::numeric) $$,
  'moving to the depot keeps each origin'
);

-- Production: inputs debited exactly, output of the company's country.
select is(game.produce(:'arsenal'), 2::numeric, 'four points and 25 raw make two Q1 weapons');
select results_eq(
  format($$ select game.holder_quantity(%s, 'military_raw'), pg_temp.lot(%s, 'weapon_q1', 'ARG') $$, :'arsenal_h', :'arsenal_h'),
  $$ values (5::numeric, 2::numeric) $$,
  'twenty raw were used and the weapons are Argentine'
);
select is(
  (select sum(quantity) from game.inventory_movements where kind = 'production_input' and from_holder_id = :'arsenal_h'),
  20::numeric,
  'the inputs used are logged'
);

-- Founding and quality.
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.found_company('Hospitalito', 'kit_q2', 'ARG-01', gen_random_uuid()) $$,
  '22023', 'good_invalid', 'a quality line starts at Q1'
);
reset role;
select is(
  (select array_agg(code order by code) from public.list_goods() where kind = 'raw'),
  array['food_raw', 'medical_raw', 'military_raw'],
  'only active goods are listed'
);

select * from finish();
rollback;

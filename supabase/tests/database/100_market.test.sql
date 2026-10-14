-- D11: market. Acceptance (GDD): in a purchase, the money that leaves the buyer is exactly what the seller
-- and the treasury receive, plus the fee that leaves the game.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Tests fund players with a mint reason of their own, rolled back with the test (R2, ADR 0016).
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

create function pg_temp.balance(p_account bigint)
returns bigint
language sql
as $$
  select balance from game.accounts where id = p_account;
$$;

set local game.fixed_now = '2026-10-09 15:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset

-- Camila's kitchen has 20 Q1 food; Ana holds the 10 of her grant; Marcos gets 100 Credit to shop.
insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
values ('Cocina de Campaña', :'camila', 'ARG', 'ARG-01', 'food_q1', game.now())
returning id as kitchen \gset
select game.put_goods(game.holder_for_company(:'kitchen'), 'food_q1', 'ARG', 20, 'test', 'test');
select game.put_goods(game.holder_for_company(:'kitchen'), 'food_raw', 'ARG', 5.5, 'test', 'test');
select game.transfer(game.system_account('issuer', 'ARG'), game.citizen_account(:'marcos', 'ARG'), 10000, 'test', null);

select game.citizen_account(:'marcos', 'ARG') as marcos_arg \gset
select game.company_account(:'kitchen', 'ARG') as kitchen_arg \gset
select game.treasury_account('ARG', 'ARG') as treasury_arg \gset
select game.system_account('sink', 'ARG') as sink_arg \gset

-- Posting moves the units into the offer.
select pg_temp.act_as(:'camila');
select public.post_offer('food_q1', 10, 1260, 'ARG', 'd0000000-0000-4000-8000-000000000001', :'kitchen') as offer \gset
select is(
  public.post_offer('food_q1', 10, 1260, 'ARG', 'd0000000-0000-4000-8000-000000000001', :'kitchen'),
  :'offer'::bigint,
  'posting again with the same key returns the same offer'
);
select is((select quantity from public.get_company_stock(:'kitchen') where good_code = 'food_q1'), 10::numeric, 'the units left the depot');
select throws_ok(
  format($$ select public.post_offer('food_raw', 6, 420, 'ARG', gen_random_uuid(), %s) $$, :'kitchen'),
  '22023', 'quantity_unavailable', 'only whole units the company holds (5.5 wheat)'
);
select throws_ok(
  $$ select public.post_offer('food_q1', 1, 0, 'ARG', gen_random_uuid()) $$,
  '22023', 'amount_invalid', 'prices are positive'
);
reset role;

select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select seller_name, origin_country_code, quantity, price, imported from public.list_market('ARG', 'food_q1') $$,
  $$ values ('Cocina de Campaña', 'ARG', 10, 1260::bigint, false) $$,
  'buyers see the offer with its seller and origin'
);
select throws_ok(
  format($$ select public.post_offer('food_q1', 1, 100, 'ARG', gen_random_uuid(), %s) $$, :'kitchen'),
  '42501', 'not_your_company', 'nobody sells another player''s stock'
);
reset role;

-- Acceptance: a purchase of 4 rations at 12.60.
select pg_temp.balance(:'marcos_arg') as marcos_before \gset
select pg_temp.act_as(:'marcos');
select is(
  public.buy(:'offer', 4, 'e0000000-0000-4000-8000-000000000001'),
  5040::bigint,
  'the buyer pays 4 × 12.60, VAT included'
);
select is(
  public.buy(:'offer', 4, 'e0000000-0000-4000-8000-000000000001'),
  5040::bigint,
  'the same request again does not buy twice'
);
reset role;
select is(:'marcos_before'::bigint - pg_temp.balance(:'marcos_arg'), 5040::bigint, 'the buyer paid once');
select is(pg_temp.balance(:'kitchen_arg'), 4750::bigint, 'the seller gets the gross minus 5 % VAT and the 1 % fee');
select is(pg_temp.balance(:'treasury_arg'), 240::bigint, 'the VAT goes to the treasury');
select is(pg_temp.balance(:'sink_arg'), 50::bigint, 'the 1 % fee leaves the game');
select is(
  :'marcos_before'::bigint - pg_temp.balance(:'marcos_arg'),
  pg_temp.balance(:'kitchen_arg') + pg_temp.balance(:'treasury_arg') + pg_temp.balance(:'sink_arg'),
  'acceptance: what left the buyer is what the seller and the treasury received plus the fee'
);
select pg_temp.act_as(:'marcos');
select is((select quantity from public.get_my_inventory() where good_code = 'food_q1'), 14::numeric, 'the rations are in the buyer''s inventory, besides the 10 of the grant');
select throws_ok(
  format($$ select public.buy(%s, 7, gen_random_uuid()) $$, :'offer'),
  '22023', 'quantity_unavailable', 'nobody buys more than the offer has'
);
reset role;
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select public.buy(%s, 1, gen_random_uuid()) $$, :'offer'),
  '22023', 'own_offer', 'nobody buys their own offer'
);
reset role;

-- Imports pay the tariff on top. Ana sells in Argentina with a license (R6, ADR 0022).
insert into game.market_access_licenses (user_id, market_country_code, granted_at) values (:'ana', 'ARG', game.now());
select pg_temp.act_as(:'ana');
select public.post_offer('food_q1', 5, 1200, 'ARG', gen_random_uuid()) as import_offer \gset
reset role;
select pg_temp.balance(:'marcos_arg') as marcos_before \gset
select pg_temp.act_as(:'marcos');
select is((select imported from public.list_market('ARG', 'food_q1') where offer_id = :'import_offer'), true, 'an offer from another country is an import');
select is(public.buy(:'import_offer', 1, gen_random_uuid()), 1320::bigint, 'imports pay 10 % tariff on top');
reset role;
select is(
  (select balance from game.accounts where kind = 'citizen' and user_id = :'ana' and currency_code = 'ARG'),
  1131::bigint,
  'the foreign seller is paid in the market''s Credit, minus VAT and fee'
);
select is(pg_temp.balance(:'treasury_arg'), 240::bigint + 57 + 120, 'VAT and tariff go to the treasury');

-- Buying into a company's depot, only one's own.
select pg_temp.act_as(:'marcos');
select throws_ok(
  format($$ select public.buy(%s, 1, gen_random_uuid(), %s) $$, :'import_offer', :'kitchen'),
  '42501', 'not_your_company', 'goods go only to the buyer''s own companies'
);
reset role;
select pg_temp.act_as(:'camila');
select public.buy(:'import_offer', 2, gen_random_uuid(), :'kitchen');
select is((select quantity from public.get_company_stock(:'kitchen') where good_code = 'food_q1'), 12::numeric, 'bought into the company''s depot');
reset role;

-- Withdrawing returns what is left.
select pg_temp.act_as(:'camila');
select public.withdraw_offer(:'offer');
select is((select quantity from public.get_company_stock(:'kitchen') where good_code = 'food_q1'), 18::numeric, 'the 6 unsold rations are back');
select is_empty(format($$ select * from public.list_market('ARG', 'food_q1') where offer_id = %s $$, :'offer'), 'a withdrawn offer leaves the market');
select is((select count(*) from public.list_my_offers())::int, 0, 'and the seller''s active offers');
reset role;

-- Money the buyer lacks.
select game.transfer(:'marcos_arg', :'sink_arg', pg_temp.balance(:'marcos_arg') - 100, 'test', null);
select pg_temp.act_as(:'marcos');
select throws_ok(
  format($$ select public.buy(%s, 1, gen_random_uuid()) $$, :'import_offer'),
  '22023', 'insufficient_funds', 'nobody buys without the money'
);
reset role;

-- Prices: best offer and the 24-hour average, weighted by units.
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select good_code, best_price, average_24h, offers from public.market_summary('ARG') where good_code = 'food_q1' $$,
  $$ values ('food_q1', 1200::bigint, 1234::bigint, 1) $$,
  'the summary shows the best price and the 24-hour average'
);
reset role;

-- At most 20 open offers per player.
select game.put_goods(game.holder_for_citizen(:'marcos'), 'military_raw', 'ARG', 30, 'test', 'test');
select pg_temp.act_as(:'marcos');
select public.post_offer('military_raw', 1, 840, 'ARG', gen_random_uuid()) from generate_series(1, 20);
select throws_ok(
  $$ select public.post_offer('military_raw', 1, 840, 'ARG', gen_random_uuid()) $$,
  '22023', 'too_many_offers', 'at most 20 open offers'
);
reset role;

-- Access and totals.
select ok(not has_function_privilege('anon', 'public.buy(bigint, integer, uuid, bigint)', 'EXECUTE'), 'visitors cannot buy');
select ok(has_function_privilege('anon', 'public.list_market(text, text)', 'EXECUTE'), 'anyone can look at the market');
select is_empty(
  $$ select currency_code from game.accounts group by currency_code having sum(balance) <> 0 $$,
  'money still adds up to zero in every currency'
);

select * from finish();
rollback;

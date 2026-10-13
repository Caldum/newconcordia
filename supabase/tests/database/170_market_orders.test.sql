-- R6: market orders. Acceptance (roadmap): the locked money is exact after partial fills; taxes are deducted
-- on execution. Price-time priority, cancellation, the export tax and foreign market licenses (ADR 0021).
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

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

create function pg_temp.held(p_order_id bigint)
returns bigint
language sql
as $$
  select a.balance from game.market_buy_orders as b
  join game.ledger_holds as h on h.id = b.hold_id
  join game.accounts as a on a.id = h.escrow_account_id
  where b.id = p_order_id;
$$;

set local game.fixed_now = '2026-10-14 15:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset

insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
values ('Cocina de Campaña', :'camila', 'ARG', 'ARG-01', 'food_q1', game.now())
returning id as kitchen \gset
select game.put_goods(game.holder_for_company(:'kitchen'), 'food_q1', 'ARG', 40, 'test', 'test');
select game.transfer(game.system_account('issuer', 'ARG'), game.citizen_account(:'marcos', 'ARG'), 100000, 'test', null);

select game.citizen_account(:'marcos', 'ARG') as marcos_arg \gset
select game.company_account(:'kitchen', 'ARG') as kitchen_arg \gset
select game.citizen_account(:'ana', 'ARG') as ana_arg \gset
select game.treasury_account('BRA', 'ARG') as bra_treasury_arg \gset

-- A buy order locks limit × quantity before it exists. ------------------------------------------------
select pg_temp.balance(:'marcos_arg') as m0 \gset
select pg_temp.act_as(:'marcos');
select public.post_buy_order('food_q1', 10, 1300, 'ARG', 'b0000000-0000-4000-8000-000000000001') as o1 \gset
select is(
  public.post_buy_order('food_q1', 10, 1300, 'ARG', 'b0000000-0000-4000-8000-000000000001'),
  :'o1'::bigint,
  'posting again with the same key returns the same order'
);
select results_eq(
  $$ select buyer_name, remaining, limit_price from public.list_buy_orders('ARG', 'food_q1') $$,
  $$ values ('Marcos Villalba', 10, 1300::bigint) $$,
  'the order is public'
);
select results_eq(
  $$ select remaining, held, status from public.list_my_buy_orders() $$,
  $$ values (10, 13000::bigint, 'open') $$,
  'the buyer sees the 130.00 it holds'
);
reset role;
select is(:'m0'::bigint - pg_temp.balance(:'marcos_arg'), 13000::bigint, 'the money left the buyer''s balance once');

-- A new offer fills it partially at the offer's price. ----------------------------------------------
select pg_temp.act_as(:'camila');
select public.post_offer('food_q1', 4, 1200, 'ARG', 'c0000000-0000-4000-8000-000000000001', :'kitchen') as s1 \gset
reset role;
select is((select status from game.market_offers where id = :'s1'), 'filled', 'the offer sold everything at once');
select results_eq(
  format($$ select remaining, status from game.market_buy_orders where id = %s $$, :'o1'),
  $$ values (6, 'partial') $$,
  'the order has 6 left'
);
select is(pg_temp.held(:'o1'), 7800::bigint, 'acceptance: exactly 6 × 13.00 stays locked after the partial fill');
select is(:'m0'::bigint - pg_temp.balance(:'marcos_arg') - pg_temp.held(:'o1'), 4800::bigint,
  'the buyer paid the offer''s 12.00, not the limit; the difference came back');
select is(pg_temp.balance(:'kitchen_arg'), 4523::bigint, 'acceptance: the seller got 48.00 minus VAT (2.29) and fee (0.48) on execution');
select pg_temp.act_as(:'marcos');
select is((select quantity from public.get_my_inventory() where good_code = 'food_q1'), 14::numeric, 'the 4 rations reached the buyer');
reset role;

-- A higher offer rests; a matching one fills the rest and closes the hold. -------------------------
select pg_temp.act_as(:'camila');
select public.post_offer('food_q1', 10, 1350, 'ARG', 'c0000000-0000-4000-8000-000000000002', :'kitchen') as s2 \gset
select public.post_offer('food_q1', 10, 1300, 'ARG', 'c0000000-0000-4000-8000-000000000003', :'kitchen') as s3 \gset
reset role;
select is((select status from game.market_offers where id = :'s2'), 'open', 'an offer above every limit waits');
select results_eq(
  format($$ select quantity, status from game.market_offers where id = %s $$, :'s3'),
  $$ values (4, 'partial') $$,
  'an offer at the limit sells 6 and keeps 4 visible'
);
select is((select status from game.market_buy_orders where id = :'o1'), 'filled', 'the order is filled');
select results_eq(
  format($$ select h.status, a.balance from game.market_buy_orders as b join game.ledger_holds as h on h.id = b.hold_id
            join game.accounts as a on a.id = h.escrow_account_id where b.id = %s $$, :'o1'),
  $$ values ('closed', 0::bigint) $$,
  'its hold is empty and closed'
);
select is(:'m0'::bigint - pg_temp.balance(:'marcos_arg'), 12600::bigint, '4 × 12.00 + 6 × 13.00 in all');

-- A buy order takes the cheapest offers first. ------------------------------------------------------
select pg_temp.balance(:'marcos_arg') as m1 \gset
select pg_temp.act_as(:'marcos');
select public.post_buy_order('food_q1', 5, 1400, 'ARG', 'b0000000-0000-4000-8000-000000000002') as o2 \gset
reset role;
select results_eq(
  format($$ select offer_id, quantity, price from game.market_trades where buy_order_id = %s order by id $$, :'o2'),
  format($$ values (%s::bigint, 4, 1300::bigint), (%s::bigint, 1, 1350::bigint) $$, :'s3', :'s2'),
  'the 4 at 13.00 first, then 1 at 13.50'
);
select is(:'m1'::bigint - pg_temp.balance(:'marcos_arg'), 6550::bigint, 'the buyer paid 65.50 of the 70.00 locked');

-- Price, then time: the highest buy orders first, the oldest among equals. --------------------------
select pg_temp.act_as(:'marcos');
select public.post_buy_order('food_q1', 2, 1250, 'ARG', 'b0000000-0000-4000-8000-000000000003') as o3 \gset
select public.post_buy_order('food_q1', 2, 1280, 'ARG', 'b0000000-0000-4000-8000-000000000004') as o4 \gset
select public.post_buy_order('food_q1', 2, 1280, 'ARG', 'b0000000-0000-4000-8000-000000000005') as o5 \gset
reset role;
select pg_temp.act_as(:'camila');
select public.post_offer('food_q1', 3, 1200, 'ARG', 'c0000000-0000-4000-8000-000000000004', :'kitchen') as s4 \gset
reset role;
select results_eq(
  format($$ select id, remaining from game.market_buy_orders where id in (%s, %s, %s) order by id $$, :'o3', :'o4', :'o5'),
  format($$ values (%s::bigint, 2), (%s::bigint, 0), (%s::bigint, 1) $$, :'o3', :'o4', :'o5'),
  'the 12.80 orders filled before the 12.50 one, the older 12.80 first'
);
select results_eq(
  $$ select remaining, limit_price from public.list_buy_orders('ARG', 'food_q1') $$,
  $$ values (1, 1280::bigint), (2, 1250::bigint) $$,
  'the book shows what is left, highest first'
);
select results_eq(
  $$ select best_price, offers, best_bid, bids, export_tax from public.market_summary('ARG') where good_code = 'food_q1' $$,
  $$ values (1350::bigint, 1, 1280::bigint, 2, 0::numeric) $$,
  'the summary shows both sides of the book'
);

-- Nobody trades with themselves. --------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.post_buy_order('food_q1', 1, 2000, 'ARG', 'c1000000-0000-4000-8000-000000000001') as o6 \gset
reset role;
select is((select status from game.market_buy_orders where id = :'o6'), 'open', 'a buy order never takes its owner''s offer');

-- Cancelling returns exactly what is still locked. --------------------------------------------------
select pg_temp.balance(:'marcos_arg') as m2 \gset
select pg_temp.act_as(:'marcos');
select lives_ok(format($$ select public.cancel_buy_order(%s) $$, :'o3'), 'the buyer cancels an order');
reset role;
select is(pg_temp.balance(:'marcos_arg') - :'m2'::bigint, 2500::bigint, 'the 25.00 it held came back');
select is((select status from game.market_buy_orders where id = :'o3'), 'cancelled', 'the order is cancelled');
select pg_temp.act_as(:'marcos');
select throws_ok(format($$ select public.cancel_buy_order(%s) $$, :'o3'), 'P0002', 'order_not_found', 'a closed order cannot be cancelled again');
select lives_ok(format($$ select public.cancel_buy_order(%s) $$, :'o5'), 'a partly filled order can be cancelled');
reset role;
select pg_temp.act_as(:'ana');
select throws_ok(format($$ select public.cancel_buy_order(%s) $$, :'o6'), 'P0002', 'order_not_found', 'nobody cancels another player''s order');
select throws_ok(
  $$ select public.post_buy_order('food_q1', 1, 100, 'ARG', gen_random_uuid()) $$,
  '22023', 'insufficient_funds', 'no order without the money to lock'
);
reset role;
select pg_temp.act_as(:'camila');
select lives_ok(format($$ select public.cancel_buy_order(%s) $$, :'o6'), 'the seller cancels her own buy order');
select lives_ok(format($$ select public.withdraw_offer(%s) $$, :'s2'), 'and withdraws her last offer');
reset role;
select is((select status from game.market_offers where id = :'s2'), 'cancelled', 'a withdrawn offer is cancelled');

-- The export tax: an import pays the tariff, its seller the production country's export tax. ------------
update game.country_policies set export_tax = 0.20 where country_code = 'BRA';
select pg_temp.act_as(:'ana');
select public.post_offer('food_q1', 5, 1000, 'ARG', 'a0000000-0000-4000-8000-000000000001') as s5 \gset
reset role;
select pg_temp.act_as(:'marcos');
select is(public.buy(:'s5', 5, 'e0000000-0000-4000-8000-000000000001'), 5500::bigint, 'the buyer pays 50.00 plus the 10 % tariff');
reset role;
select results_eq(
  format($$ select vat, tariff, fee, export_tax from game.market_trades where offer_id = %s $$, :'s5'),
  $$ values (238::bigint, 500::bigint, 50::bigint, 942::bigint) $$,
  'acceptance: VAT, tariff, fee and 20 % export tax are taken on execution'
);
select is(pg_temp.balance(:'ana_arg'), 3770::bigint, 'the seller gets 50.00 minus VAT, fee and export tax');
select is(pg_temp.balance(:'bra_treasury_arg'), 942::bigint, 'the export tax goes to the production country''s treasury');

-- A buy order counts the tariff of imports against its limit. ----------------------------------------
select pg_temp.act_as(:'ana');
select public.post_offer('food_q1', 2, 1000, 'ARG', 'a0000000-0000-4000-8000-000000000002') as s6 \gset
reset role;
select pg_temp.balance(:'marcos_arg') as m3 \gset
select pg_temp.act_as(:'marcos');
select public.post_buy_order('food_q1', 2, 1050, 'ARG', 'b0000000-0000-4000-8000-000000000007') as o7 \gset
select public.post_buy_order('food_q1', 1, 1100, 'ARG', 'b0000000-0000-4000-8000-000000000008') as o8 \gset
reset role;
select results_eq(
  format($$ select id, status from game.market_buy_orders where id in (%s, %s) order by id $$, :'o7', :'o8'),
  format($$ values (%s::bigint, 'open'), (%s::bigint, 'filled') $$, :'o7', :'o8'),
  'an import at 10.00 + 10 %% tariff fits a 11.00 limit, not a 10.50 one'
);
select is(:'m3'::bigint - pg_temp.balance(:'marcos_arg') - pg_temp.held(:'o7'), 1100::bigint, 'the import cost exactly its limit');

-- The locked money of every open order is exactly what remains times its limit. --------------------------
select is(
  (select sum(a.balance) from game.market_buy_orders as b join game.ledger_holds as h on h.id = b.hold_id
   join game.accounts as a on a.id = h.escrow_account_id),
  (select sum(b.remaining::bigint * b.limit_price) from game.market_buy_orders as b where b.status in ('open', 'partial')),
  'escrows hold remaining × limit, and nothing for closed orders'
);

-- Foreign market licenses ship off; when required, a foreigner needs one. -------------------------------
update game.balance_params set value = 1 where key = 'market_foreign_license_required';
select pg_temp.act_as(:'ana');
select throws_ok(
  $$ select public.post_buy_order('food_q1', 1, 100, 'ARG', gen_random_uuid()) $$,
  '42501', 'license_required', 'a foreign market needs a license when they are required'
);
reset role;
insert into game.market_access_licenses (user_id, market_country_code, granted_at) values (:'ana', 'ARG', game.now());
select pg_temp.act_as(:'ana');
select lives_ok(
  $$ select public.post_buy_order('food_q1', 1, 100, 'ARG', gen_random_uuid()) $$,
  'with a license the foreigner trades'
);
reset role;

select * from finish();
rollback;

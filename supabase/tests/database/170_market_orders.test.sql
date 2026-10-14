-- R6: market orders as amended by the owner (ADR 0021, 0022). Acceptance (roadmap): taxes are deducted on
-- execution. Offer states, the export tax, and foreign market licenses at 10 GOLD (5 to the market country,
-- 5 burned); no buy orders.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

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
select game.citizen_account(:'ana', 'ARG') as ana_arg \gset
select game.citizen_account(:'ana', 'GOLD') as ana_gold \gset
select game.treasury_account('BRA', 'ARG') as bra_treasury_arg \gset
select game.treasury_account('ARG', 'GOLD') as arg_treasury_gold \gset
select game.system_account('sink', 'GOLD') as sink_gold \gset

-- Buy orders were removed by the owner. ------------------------------------------------------------------
select hasnt_function('public', 'post_buy_order', 'there are no buy orders to post');
select hasnt_table('game', 'market_buy_orders', 'nor a table for them');

-- Offer states: open → partial → filled, or cancelled. -----------------------------------------------
select pg_temp.act_as(:'camila');
select public.post_offer('food_q1', 4, 1200, 'ARG', 'c0000000-0000-4000-8000-000000000001', :'kitchen') as s1 \gset
select public.post_offer('food_q1', 10, 1350, 'ARG', 'c0000000-0000-4000-8000-000000000002', :'kitchen') as s2 \gset
select results_eq(
  $$ select status from public.list_my_offers() order by offer_id $$,
  $$ values ('open'), ('open') $$,
  'new offers are open'
);
reset role;
select pg_temp.act_as(:'marcos');
select public.buy(:'s1', 1, gen_random_uuid());
reset role;
select is((select status from game.market_offers where id = :'s1'), 'partial', 'a partly sold offer is partial and keeps the rest visible');
select pg_temp.act_as(:'marcos');
select public.buy(:'s1', 3, gen_random_uuid());
reset role;
select is((select status from game.market_offers where id = :'s1'), 'filled', 'a sold-out offer is filled');
select pg_temp.act_as(:'camila');
select public.withdraw_offer(:'s2');
reset role;
select is((select status from game.market_offers where id = :'s2'), 'cancelled', 'a withdrawn offer is cancelled');

-- Licenses: 10 GOLD, 5 to the market country, 5 burned. -----------------------------------------------
select results_eq(
  $$ select price, country_share, required from public.get_market_license_terms() $$,
  $$ values (1000::bigint, 500::bigint, true) $$,
  'a license costs 10 GOLD, 5 of them to the country, and is required'
);
select pg_temp.act_as(:'ana');
select throws_ok(
  $$ select public.post_offer('food_q1', 5, 1000, 'ARG', gen_random_uuid()) $$,
  '42501', 'license_required', 'a foreigner cannot sell in another market without a license'
);
select throws_ok(
  $$ select public.buy_market_license('BRA', gen_random_uuid()) $$,
  '22023', 'license_not_needed', 'nobody needs a license for their own market'
);
select throws_ok(
  $$ select public.buy_market_license('ARG', gen_random_uuid()) $$,
  '22023', 'insufficient_funds', 'the 5 GOLD of the welcome grant are not enough'
);
reset role;
select game.transfer(game.system_account('issuer', 'GOLD'), :'ana_gold', 1000, 'test', null);
select pg_temp.balance(:'ana_gold') as ana_gold_before \gset
select pg_temp.balance(:'arg_treasury_gold') as treasury_before \gset
select pg_temp.balance(:'sink_gold') as sink_before \gset
select pg_temp.act_as(:'ana');
select public.buy_market_license('ARG', 'f0000000-0000-4000-8000-000000000001') as license \gset
select is(
  public.buy_market_license('ARG', gen_random_uuid()),
  :'license'::bigint,
  'a second purchase returns the license she already has'
);
select results_eq(
  $$ select market_country_code from public.list_my_market_licenses() $$,
  $$ values ('ARG') $$,
  'she sees her license'
);
reset role;
select is(:'ana_gold_before'::bigint - pg_temp.balance(:'ana_gold'), 1000::bigint, 'she paid 10 GOLD once');
select is(pg_temp.balance(:'arg_treasury_gold') - :'treasury_before'::bigint, 500::bigint, '5 GOLD went to Argentina''s treasury');
select is(pg_temp.balance(:'sink_gold') - :'sink_before'::bigint, 500::bigint, '5 GOLD were burned');
select is(
  (select count(*)::integer from game.supply_changes as s
   join game.ledger_postings as p on p.id = s.posting_id
   join game.ledger_transactions as t on t.id = p.transaction_id
   where t.idempotency_key = 'license:' || :'ana' || ':f0000000-0000-4000-8000-000000000001'),
  1,
  'the burn is recorded'
);

-- The export tax: an import pays the tariff, its seller the production country's export tax. ------------
update game.country_policies set export_tax = 0.20 where country_code = 'BRA';
select pg_temp.act_as(:'ana');
select public.post_offer('food_q1', 5, 1000, 'ARG', 'a0000000-0000-4000-8000-000000000001') as s3 \gset
reset role;
select pg_temp.act_as(:'marcos');
select is(public.buy(:'s3', 5, 'e0000000-0000-4000-8000-000000000001'), 5500::bigint, 'the buyer pays 50.00 plus the 10 % tariff');
select is(public.buy(:'s3', 5, 'e0000000-0000-4000-8000-000000000001'), 5500::bigint, 'the same request does not buy twice');
reset role;
select results_eq(
  format($$ select vat, tariff, fee, export_tax from game.market_trades where offer_id = %s $$, :'s3'),
  $$ values (238::bigint, 500::bigint, 50::bigint, 942::bigint) $$,
  'acceptance: VAT, tariff, fee and 20 % export tax are taken on execution'
);
select is(pg_temp.balance(:'ana_arg'), 3770::bigint, 'the seller gets 50.00 minus VAT, fee and export tax');
select is(pg_temp.balance(:'bra_treasury_arg'), 942::bigint, 'the export tax goes to the production country''s treasury');
select is(
  (select sum(amount) from game.ledger_postings as p
   join game.ledger_transactions as t on t.id = p.transaction_id
   where t.idempotency_key = 'buy:' || :'marcos' || ':e0000000-0000-4000-8000-000000000001'),
  5500::numeric,
  'what left the buyer is what the seller, the treasuries and the sink received'
);

select ok(not has_function_privilege('anon', 'public.buy_market_license(text, uuid)', 'EXECUTE'), 'visitors cannot buy licenses');

select * from finish();
rollback;

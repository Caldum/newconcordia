-- G6: the Central Bank and foreign exchange against GOLD: offers with locked funds and partial takes, rounding,
-- the Central Bank's funds by law, its transfers to the Treasury and single-use authorizations (spec section 4,
-- ADR 0029).
begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

create function pg_temp.new_player(p_email text, p_name text, p_country text, p_xp bigint)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at,
                          updated_at, last_sign_in_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
          now(), now(), now(), '2026-11-07 09:00+00')
  returning id into v_id;
  perform game.add_civil_xp(v_id, p_xp);
  return v_id;
end;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.at(p_at text)
returns void
language sql
as $$
  select set_config('game.fixed_now', p_at, true);
$$;

create function pg_temp.bal(p_user uuid, p_currency text)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'citizen' and user_id = p_user and currency_code = p_currency), 0);
$$;

create function pg_temp.bank(p_currency text)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'central_bank' and country_code = 'ARG' and currency_code = p_currency), 0);
$$;

create function pg_temp.fund(p_user uuid, p_currency text, p_amount bigint)
returns bigint
language sql
as $$
  select game.post('test_fund', null, null, array[row(game.system_account('issuer', p_currency),
                   game.citizen_account(p_user, p_currency), p_amount, 'election_reward', null)::game.ledger_leg]);
$$;

select pg_temp.at('2026-11-07 10:00:00+00');
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, 'ARG-01')
where code = 'ARG';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG', 22500) as camila \gset
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG', 10000) as pedro \gset
select pg_temp.new_player('sofia@example.com', 'Sofía Díaz', 'ARG', 22500) as sofia \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG', 10000) as elena \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG', 22500) as marcos \gset
select pg_temp.new_player('raul@example.com', 'Raúl Ortiz', 'ARG', 11000) as raul \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG', 0) as ana \gset
select pg_temp.new_player('beto@example.com', 'Beto Ruiz', 'ARG', 0) as beto \gset

insert into game.offices (country_code, office, user_id) values
  ('ARG', 'president', :'camila'), ('ARG', 'minister_economy', :'pedro'), ('ARG', 'central_bank_governor', :'sofia');
insert into game.mandates (country_code, office, user_id, began_at) values
  ('ARG', 'president', :'camila', game.now()), ('ARG', 'minister_economy', :'pedro', game.now()),
  ('ARG', 'central_bank_governor', :'sofia', game.now()),
  ('ARG', 'congress', :'elena', game.now()), ('ARG', 'congress', :'marcos', game.now()), ('ARG', 'congress', :'raul', game.now());
select game.post('test_treasury', null, null, array[
  row(game.system_account('issuer', 'GOLD'), game.treasury_account('ARG', 'GOLD'), 10000, 'election_reward', null)::game.ledger_leg,
  row(game.system_account('issuer', 'ARG'), game.treasury_account('ARG', 'ARG'), 100000, 'election_reward', null)::game.ledger_leg
]);
select pg_temp.fund(:'ana', 'GOLD', 5000);
select pg_temp.fund(:'beto', 'ARG', 100000);
select pg_temp.fund(:'marcos', 'GOLD', 2000);

-- The Central Bank's funds come by law. --------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select lives_ok($$ select public.propose_bill('central_bank_allocation', 'Reservas del Banco Central', '',
                                              '{"gold": 4000, "credit": 50000}', null) $$,
                'the president presents funds for the Central Bank');
reset role;
select id as reserves from game.bills where title = 'Reservas del Banco Central' \gset
select pg_temp.act_as(:'elena');
select public.vote_bill(:'reserves', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'reserves', 'yes');
reset role;
select pg_temp.at('2026-11-08 10:05:00+00');
select game.job_elections('2026-11-08 10:05:00+00');
select is((select status from game.bills where id = :'reserves'), 'executed', 'the law passes');
select is(pg_temp.bank('GOLD'), 4000::bigint, 'the Central Bank holds its GOLD');
select is(pg_temp.bank('ARG'), 50000::bigint, 'and its national currency');

-- The governor sends funds to the Treasury. -------------------------------------------------------------------------------
select pg_temp.act_as(:'pedro');
select throws_ok($$ select public.central_bank_to_treasury('GOLD', 1000, null) $$, '42501', 'not_governor',
                 'only the governor moves the Central Bank''s money');
reset role;
select pg_temp.act_as(:'sofia');
select throws_ok($$ select public.central_bank_to_treasury('GOLD', 0, null) $$, '22023', 'amount_invalid', 'a positive amount');
select lives_ok($$ select public.central_bank_to_treasury('GOLD', 1000, null) $$, 'the governor sends 10 GOLD to the Treasury');
reset role;
select is((select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD'),
          7000::bigint, 'the Treasury receives them');

-- FX offers lock their funds. ----------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select throws_ok($$ select public.fx_post_offer('GOLD', 'sell_gold', 1000, 5000, gen_random_uuid()) $$, '22023',
                 'currency_invalid', 'pairs are a national currency against GOLD');
select throws_ok($$ select public.fx_post_offer('ARG', 'swap', 1000, 5000, gen_random_uuid()) $$, '22023', 'side_invalid',
                 'sell or buy GOLD');
select throws_ok($$ select public.fx_post_offer('ARG', 'sell_gold', 0, 5000, gen_random_uuid()) $$, '22023', 'amount_invalid',
                 'some GOLD');
select throws_ok($$ select public.fx_post_offer('ARG', 'sell_gold', 1000, 0, gen_random_uuid()) $$, '22023', 'price_invalid',
                 'a positive price');
select throws_ok($$ select public.fx_post_offer('ARG', 'sell_gold', 9000, 5000, gen_random_uuid()) $$, '22023', 'insufficient_funds',
                 'never more GOLD than the seller has');
select throws_ok($$ select public.fx_post_offer('ARG', 'sell_gold', 1000, 5000, gen_random_uuid(), true) $$, '42501', 'not_governor',
                 'only the governor offers the Central Bank''s funds');
select public.fx_post_offer('ARG', 'sell_gold', 1000, 5000, '00000000-0000-0000-0000-0000000000e1') as ana_offer \gset
select is(public.fx_post_offer('ARG', 'sell_gold', 1000, 5000, '00000000-0000-0000-0000-0000000000e1'), :'ana_offer'::bigint,
          'a repeated key returns the same offer');
reset role;
select is(pg_temp.bal(:'ana', 'GOLD'), 4500::bigint, 'the GOLD on offer is locked (5 GOLD of welcome, 50 funded, 10 on offer)');

-- Takes at the offer's price. ---------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select throws_ok(format('select public.fx_take(%s, 100, gen_random_uuid())', :'ana_offer'), '22023', 'own_offer',
                 'nobody takes their own offer');
reset role;
select pg_temp.act_as(:'beto');
select throws_ok(format('select public.fx_take(%s, 1100, gen_random_uuid())', :'ana_offer'), '22023', 'quantity_unavailable',
                 'not beyond the offer');
select is(public.fx_take(:'ana_offer', 400, '00000000-0000-0000-0000-0000000000e2'), 20000::bigint,
          'Beto buys 4 GOLD at 50 per GOLD: 200 of currency');
select is(public.fx_take(:'ana_offer', 400, '00000000-0000-0000-0000-0000000000e2'), 20000::bigint, 'once per key');
reset role;
select is(pg_temp.bal(:'beto', 'GOLD'), 900::bigint, 'Beto receives the GOLD');
select is(pg_temp.bal(:'beto', 'ARG'), 90000::bigint, 'and pays the currency');
select is(pg_temp.bal(:'ana', 'ARG'), 30000::bigint, 'Ana is paid');
select results_eq($$ select gold_amount, status from game.fx_offers where id = $$ || :'ana_offer',
                  $$ values (600::bigint, 'partial') $$, 'the offer keeps what is left');

-- The Central Bank wants GOLD; the currency side rounds down and the rest returns. -------------------------------------
select pg_temp.act_as(:'sofia');
select throws_ok($$ select public.fx_post_offer('ARG', 'buy_gold', 1000, 5101, gen_random_uuid(), true) $$, '22023',
                 'insufficient_funds', 'the Central Bank offers only what it holds');
select public.fx_post_offer('ARG', 'buy_gold', 500, 5101, gen_random_uuid(), true) as bank_offer \gset
reset role;
select is(pg_temp.bank('ARG'), 50000 - 25505::bigint, 'it locks the currency rounded up');
select pg_temp.act_as(:'ana');
select is(public.fx_take(:'bank_offer', 333, gen_random_uuid()), 16986::bigint, 'Ana sells 3.33 GOLD for 169.86');
select is(public.fx_take(:'bank_offer', 167, gen_random_uuid()), 8518::bigint, 'and 1.67 GOLD for 85.18');
reset role;
select is((select status from game.fx_offers where id = :'bank_offer'), 'filled', 'the offer is filled');
select is(pg_temp.bank('ARG'), 50000 - 16986 - 8518::bigint, 'the hundredth left by rounding returns to the Central Bank');
select is(pg_temp.bank('GOLD'), 3500::bigint, 'which now holds 5 GOLD more');
select is(
  (select count(*)::integer from game.ledger_holds as h join game.fx_offers as o on o.hold_id = h.id
   where o.id = :'bank_offer' and h.status = 'open'),
  0,
  'and no hold stays open'
);

-- Cancelling returns what is still locked. ------------------------------------------------------------------------------
select pg_temp.act_as(:'beto');
select throws_ok(format('select public.fx_cancel(%s)', :'ana_offer'), 'P0002', 'offer_not_found', 'only the owner cancels');
reset role;
select pg_temp.act_as(:'ana');
select lives_ok(format('select public.fx_cancel(%s)', :'ana_offer'), 'Ana withdraws the rest of her offer');
reset role;
select is(pg_temp.bal(:'ana', 'GOLD'), 5500 - 400 - 500::bigint, 'and gets back the 6 GOLD not sold');

select results_eq($$ select currency_code, last_price from public.fx_summary() where currency_code = 'ARG' $$,
                  $$ values ('ARG', 5101::bigint) $$, 'the summary shows the last price');
select is((select count(*)::integer from public.fx_book('ARG')), 0, 'the book is empty');

-- Single-use authorizations for transfers to companies. ---------------------------------------------------------------
select pg_temp.act_as(:'marcos');
select public.found_company('Molinos del Plata', 'food_raw', 'ARG-01', gen_random_uuid()) as mill \gset
reset role;
select pg_temp.act_as(:'elena');
select throws_ok($$ select public.authorize_cb_transfer('Molinos del Plata', 'GOLD', 1000) $$, '42501', 'not_minister',
                 'only the Economy minister authorizes');
reset role;
select pg_temp.act_as(:'pedro');
select throws_ok($$ select public.authorize_cb_transfer('Molinos de Otro', 'GOLD', 1000) $$, '22023', 'recipient_invalid',
                 'a company in the country');
select public.authorize_cb_transfer('molinos del plata', 'GOLD', 1000) as auth1 \gset
select public.authorize_cb_transfer('Molinos del Plata', 'GOLD', 500) as auth2 \gset
select lives_ok(format('select public.cancel_cb_authorization(%s)', :'auth2'), 'the minister withdraws one');
reset role;
select pg_temp.act_as(:'pedro');
select throws_ok(format('select public.execute_cb_transfer(%s)', :'auth1'), '42501', 'not_governor', 'the governor executes');
reset role;
select pg_temp.act_as(:'sofia');
select lives_ok(format('select public.execute_cb_transfer(%s)', :'auth1'), 'the governor executes the authorization');
select throws_ok(format('select public.execute_cb_transfer(%s)', :'auth1'), '22023', 'authorization_closed', 'only once');
select throws_ok(format('select public.execute_cb_transfer(%s)', :'auth2'), '22023', 'authorization_closed',
                 'nor a cancelled one');
reset role;
select is((select balance from game.accounts where kind = 'company' and company_id = :'mill' and currency_code = 'GOLD'),
          1000::bigint, 'the company receives 10 GOLD');
select is(pg_temp.bank('GOLD'), 2500::bigint, 'from the Central Bank');
select results_eq($$ select status, executed_by_name from public.list_cb_authorizations('ARG') order by authorization_id $$,
                  $$ values ('executed', 'Sofía Díaz'), ('cancelled', null) $$, 'authorizations are public');

-- Without a governor the Central Bank is paralyzed. ---------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.dismiss_official('central_bank_governor');
reset role;
select pg_temp.act_as(:'sofia');
select throws_ok($$ select public.central_bank_to_treasury('GOLD', 100, null) $$, '42501', 'not_governor',
                 'a former governor cannot act');
reset role;

-- Money and privileges. ------------------------------------------------------------------------------------------------
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(has_function_privilege('anon', 'public.fx_book(text)', 'EXECUTE'), 'anyone reads the FX book');
select ok(not has_function_privilege('anon', 'public.fx_take(bigint, bigint, uuid, boolean)', 'EXECUTE'), 'visitors trade nothing');
select ok(not has_table_privilege('authenticated', 'game.fx_offers', 'SELECT'), 'offers are read through functions');

select * from finish();
rollback;

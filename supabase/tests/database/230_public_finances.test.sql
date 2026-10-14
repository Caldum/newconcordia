-- G5: allocations to ministries and currency issuance by law, ministerial spending within competences, the public
-- audit of institutional money and the privacy of ministry stock (spec sections 3 and 4, ADR 0028).
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

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

create function pg_temp.balance(p_kind text, p_ministry text, p_currency text)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts
                   where kind = p_kind and country_code = 'ARG' and currency_code = p_currency
                     and ministry is not distinct from p_ministry), 0);
$$;

create function pg_temp.citizen_balance(p_user uuid, p_currency text)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'citizen' and user_id = p_user and currency_code = p_currency), 0);
$$;

select pg_temp.at('2026-11-07 10:00:00+00');
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, 'ARG-01')
where code = 'ARG';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG', 22500) as camila \gset
select pg_temp.new_player('lucia@example.com', 'Lucía Paz', 'ARG', 22500) as lucia \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG', 10000) as juan \gset
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG', 10000) as pedro \gset
select pg_temp.new_player('tomas@example.com', 'Tomás Luna', 'ARG', 10000) as tomas \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG', 10000) as elena \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG', 22500) as marcos \gset
select pg_temp.new_player('raul@example.com', 'Raúl Ortiz', 'ARG', 11000) as raul \gset
select pg_temp.new_player('sofia@example.com', 'Sofía Díaz', 'ARG', 22500) as sofia \gset

insert into game.offices (country_code, office, user_id) values
  ('ARG', 'president', :'camila'), ('ARG', 'vice_president', :'lucia'), ('ARG', 'minister_health', :'juan'),
  ('ARG', 'minister_defense', :'pedro'), ('ARG', 'minister_economy', :'tomas');
insert into game.mandates (country_code, office, user_id, began_at) values
  ('ARG', 'president', :'camila', game.now()), ('ARG', 'vice_president', :'lucia', game.now()),
  ('ARG', 'minister_health', :'juan', game.now()), ('ARG', 'minister_defense', :'pedro', game.now()),
  ('ARG', 'minister_economy', :'tomas', game.now()),
  ('ARG', 'congress', :'elena', game.now()), ('ARG', 'congress', :'marcos', game.now()), ('ARG', 'congress', :'raul', game.now());

-- The Treasury holds 100 GOLD and 1,000 of national currency.
select game.post('test_treasury', null, null, array[
  row(game.system_account('issuer', 'GOLD'), game.treasury_account('ARG', 'GOLD'), 10000, 'election_reward', null)::game.ledger_leg,
  row(game.system_account('issuer', 'ARG'), game.treasury_account('ARG', 'ARG'), 100000, 'election_reward', null)::game.ledger_leg
]);

-- Allocations and issuance are bills. ---------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.propose_bill('ministry_allocation', 'Presupuesto', '', '{"ministry": "interior", "gold": 100}', null) $$,
                 '22023', 'bill_terms_invalid', 'five ministries only');
select throws_ok($$ select public.propose_bill('ministry_allocation', 'Presupuesto', '', '{"ministry": "health"}', null) $$,
                 '22023', 'bill_terms_invalid', 'an allocation moves something');
select throws_ok($$ select public.propose_bill('ministry_allocation', 'Presupuesto', '', '{"ministry": "health", "credit": 200000}', null) $$,
                 '22023', 'insufficient_funds', 'never beyond the Treasury');
select throws_ok($$ select public.propose_bill('currency_issuance', 'Emisión', '', '{"amount": -5}', null) $$,
                 '22023', 'bill_terms_invalid', 'issuance of a positive amount');
select lives_ok($$ select public.propose_bill('ministry_allocation', 'Presupuesto de Salud', '',
                                              '{"ministry": "health", "gold": 3000, "credit": 50000}', null) $$,
                'the president presents a budget for Health');
select lives_ok($$ select public.propose_bill('currency_issuance', 'Emisión de 2000', '', '{"amount": 200000}', null) $$,
                'and an issuance of national currency');
reset role;
select id as budget from game.bills where title = 'Presupuesto de Salud' \gset
select id as issuance from game.bills where title = 'Emisión de 2000' \gset
select is((select count(*)::integer from game.bill_reservations where bill_id = :'budget'), 2, 'one reservation per currency');
select is(pg_temp.balance('treasury', null, 'GOLD'), 7000::bigint, 'the GOLD is locked from presentation');
select is(pg_temp.balance('treasury', null, 'ARG'), 50000::bigint, 'and so is the national currency');
select results_eq(
  $$ select balance, held from public.get_public_finances('ARG') where institution = 'treasury' order by currency_code = 'GOLD' desc $$,
  $$ values (7000::bigint, 3000::bigint), (50000::bigint, 50000::bigint) $$,
  'public finances show free and locked funds'
);

select pg_temp.act_as(:'elena');
select public.vote_bill(id, 'yes') from unnest(array[:'budget', :'issuance']::bigint[]) as id;
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(id, 'yes') from unnest(array[:'budget', :'issuance']::bigint[]) as id;
reset role;
select pg_temp.at('2026-11-08 10:05:00+00');
select game.job_elections('2026-11-08 10:05:00+00');
select is((select status from game.bills where id = :'budget'), 'executed', 'the budget passes');
select is(pg_temp.balance('ministry', 'health', 'GOLD'), 3000::bigint, 'Health receives its GOLD');
select is(pg_temp.balance('ministry', 'health', 'ARG'), 50000::bigint, 'and its national currency');
select is((select status from game.bills where id = :'issuance'), 'executed', 'the issuance passes');
select is(pg_temp.balance('treasury', null, 'ARG'), 250000::bigint, 'the new currency reaches the Treasury');
select results_eq(
  $$ select direction, amount, reason from game.supply_changes where reason = 'currency_issuance' $$,
  $$ values ('mint', 200000::bigint, 'currency_issuance') $$,
  'issuance is recorded as a mint by law'
);

-- Ministerial payments. -----------------------------------------------------------------------------------------------
select pg_temp.citizen_balance(:'elena', 'ARG') as elena_before \gset
select pg_temp.act_as(:'elena');
select throws_ok($$ select public.ministry_pay('ARG', 1000, 'Beca de estudio', null, 'Raúl Ortiz', null) $$,
                 '42501', 'not_minister', 'only ministers spend');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.ministry_pay('BRA', 1000, 'Beca de estudio', null, 'Elena Sosa', null) $$,
                 '22023', 'currency_invalid', 'GOLD or the national currency');
select throws_ok($$ select public.ministry_pay('ARG', 1000, 'no', null, 'Elena Sosa', null) $$,
                 '22023', 'concept_invalid', 'every payment has a concept');
select throws_ok($$ select public.ministry_pay('ARG', 1000, 'Beca de estudio', null, 'Nadie', null) $$,
                 '22023', 'recipient_invalid', 'to a national');
select throws_ok($$ select public.ministry_pay('ARG', 1000, 'Beca de estudio', null, 'Elena Sosa', 1) $$,
                 '22023', 'recipient_invalid', 'one recipient');
select throws_ok($$ select public.ministry_pay('ARG', 100000, 'Beca de estudio', null, 'Elena Sosa', null) $$,
                 '22023', 'insufficient_funds', 'within the ministry''s funds');
select lives_ok($$ select public.ministry_pay('ARG', 1000, 'Beca de estudio', '00000000-0000-0000-0000-0000000000c1',
                                              'Elena Sosa') $$,
                'the Health minister pays a grant');
select lives_ok($$ select public.ministry_pay('ARG', 1000, 'Beca de estudio', '00000000-0000-0000-0000-0000000000c1',
                                              'Elena Sosa') $$,
                'a repeated key pays once');
reset role;
select is(pg_temp.citizen_balance(:'elena', 'ARG') - :'elena_before'::bigint, 1000::bigint, 'Elena receives it once');
select pg_temp.act_as(:'pedro');
select throws_ok($$ select public.ministry_pay('GOLD', 100, 'Equipo militar', null, 'Elena Sosa', null) $$,
                 '22023', 'insufficient_funds', 'one ministry cannot spend another''s funds');
reset role;

-- Ministerial purchases within competences. ---------------------------------------------------------------------------
select game.put_goods(game.holder_for_citizen(:'sofia'), 'kit_q1', 'ARG', 10, 'test', null);
select pg_temp.act_as(:'sofia');
select public.post_offer('kit_q1', 10, 500, 'ARG', gen_random_uuid()) as offer \gset
reset role;
select pg_temp.act_as(:'tomas');
select throws_ok(format('select public.ministry_buy(%s, 1, gen_random_uuid())', :'offer'), '22023', 'competence_invalid',
                 'Economy does not buy kits');
reset role;
select pg_temp.act_as(:'juan');
select is(public.ministry_buy(:'offer', 4, '00000000-0000-0000-0000-0000000000d1'), 2000::bigint, 'Health buys four kits');
select is(public.ministry_buy(:'offer', 4, '00000000-0000-0000-0000-0000000000d1'), 2000::bigint, 'once per key');
select results_eq($$ select good_code, quantity from public.get_ministry_stock('health') $$, $$ values ('kit_q1', 4::numeric) $$,
                  'the kits are in Health''s inventory');
reset role;
select is(pg_temp.balance('ministry', 'health', 'ARG'), 50000 - 1000 - 2000::bigint, 'paid by the ministry');
select is((select buyer_ministry from game.market_trades where offer_id = :'offer'), 'health', 'the trade names the ministry');
select pg_temp.act_as(:'camila');
select is((select count(*)::integer from public.get_ministry_stock('health')), 1, 'the president sees Health''s stock');
reset role;
select pg_temp.act_as(:'pedro');
select throws_ok($$ select * from public.get_ministry_stock('health') $$, '42501', 'not_minister', 'another minister does not');
reset role;
select pg_temp.act_as(:'elena');
select throws_ok($$ select * from public.get_ministry_stock('health') $$, '42501', 'not_minister', 'nor anyone else');
reset role;

-- A vacant ministry cannot spend; its funds and goods stay. -----------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.dismiss_official('health');
reset role;
select is(pg_temp.balance('ministry', 'health', 'ARG'), 47000::bigint, 'funds stay with the ministry');
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.ministry_pay('ARG', 1000, 'Beca de estudio', null, 'Elena Sosa', null) $$,
                 '42501', 'not_minister', 'the former minister cannot spend');
reset role;

-- The public audit. -----------------------------------------------------------------------------------------------------
select results_eq(
  $$ select institution, amount, counterparty_name, ordered_by, memo from public.list_public_movements('ARG')
     where kind = 'ministry_payment' $$,
  $$ values ('health', -1000::bigint, 'Elena Sosa', 'Juan Pérez', 'Beca de estudio') $$,
  'every ministerial payment is public with its concept and who ordered it'
);
select is((select count(*)::integer from public.list_public_movements('ARG') where kind = 'ministry_allocation'), 2,
          'allocations show as received by the ministry');

-- Money and privileges. -------------------------------------------------------------------------------------------------
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(has_function_privilege('anon', 'public.list_public_movements(text, bigint)', 'EXECUTE'), 'anyone audits public money');
select ok(not has_function_privilege('anon', 'public.ministry_pay(text, bigint, text, uuid, text, bigint)', 'EXECUTE'),
          'visitors spend nothing');
select ok(not has_function_privilege('anon', 'public.get_ministry_stock(text)', 'EXECUTE'), 'nor see ministry stock');

select * from finish();
rollback;

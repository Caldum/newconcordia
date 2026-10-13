-- D10: companies and work. Acceptance (GDD): working twice on the same day is rejected, and the wage
-- collected is the gross minus 12 %.
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

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

create function pg_temp.balance(p_user_id uuid, p_currency text)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'citizen' and user_id = p_user_id and currency_code = p_currency), 0);
$$;

create function pg_temp.stock(p_company bigint, p_good text)
returns numeric
language sql
as $$
  select game.holder_quantity(game.holder_for_company(p_company), p_good);
$$;

set local game.fixed_now = '2026-10-09 15:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset

-- Goods and recipes (the catalog itself is tested in 140, R3).
select results_eq(
  $$ select code, kind, input_good_code, input_per_unit, points_per_unit from game.goods
     where code in ('food_raw', 'food_q1', 'weapon_q1') order by code $$,
  $$ values ('food_q1', 'product', 'food_raw', 1::numeric, 2::numeric), ('food_raw', 'raw', null, null, 1::numeric),
            ('weapon_q1', 'product', 'military_raw', 10::numeric, 1::numeric) $$,
  'recipes of food and weapons'
);
select is((select work_tax from game.country_policies where country_code = 'ARG'), 0.12::numeric, 'work tax starts at 12 %');

-- Founding an N1 costs 10 GOLD and civil level 5 (R5); the GOLD leaves the game. Camila reaches level 5
-- (5 GOLD of rewards), has 5 from the grant and gets 5 more.
select game.add_civil_xp(:'camila', 2500);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'camila', 'GOLD'), 500, 'test', null);
select pg_temp.act_as(:'camila');
select public.found_company('Molinos del Litoral', 'food_raw', 'ARG-01', 'b0000000-0000-4000-8000-000000000001') as mill \gset
select is(
  public.found_company('Molinos del Litoral', 'food_raw', 'ARG-01', 'b0000000-0000-4000-8000-000000000001'),
  :'mill'::bigint,
  'founding again with the same key returns the same company'
);
select is((select balance from public.get_my_balances() where currency_code = 'GOLD'), 500::bigint, 'founding cost 10 GOLD, once');
select throws_ok(
  $$ select public.found_company('Otra', 'food_raw', 'ARG-01', gen_random_uuid()) $$,
  '22023', 'insufficient_funds', 'without 10 GOLD nobody founds a company'
);
reset role;
select is(
  (select balance from game.accounts where kind = 'sink' and currency_code = 'GOLD'),
  1000::bigint,
  'the Gold paid leaves the game'
);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'camila', 'GOLD'), 20000, 'test', null);
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.found_company('molinos del litoral', 'food_raw', 'ARG-01', gen_random_uuid()) $$,
  '23505', 'company_name_taken', 'company names are unique'
);
select throws_ok(
  $$ select public.found_company('Acería Paulista', 'military_raw', 'ZZZ-01', gen_random_uuid()) $$,
  '22023', 'region_unavailable', 'companies are founded in regions in play'
);
select throws_ok(
  $$ select public.found_company('Algo', 'gold', 'ARG-01', gen_random_uuid()) $$,
  '22023', 'good_invalid', 'only real goods'
);
select public.found_company('Cocina de Campaña', 'food_q1', 'ARG-01', gen_random_uuid()) as kitchen \gset
select public.found_company('Taller Ríos', 'weapon_q1', 'ARG-01', gen_random_uuid()) as workshop \gset

-- Cash, wage and vacancies.
select is(public.fund_company(:'mill', 4500, gen_random_uuid()), 4500::bigint, 'the owner moves Credit into the company');
select throws_ok(
  format($$ select public.fund_company(%s, 999999, gen_random_uuid()) $$, :'mill'),
  '22023', 'insufficient_funds', 'only Credit the owner has'
);
select public.set_company_offer(:'mill', 4200, 2);
select results_eq(
  format($$ select name, good_code, region_code, level, wage, vacancies, cash from public.list_my_companies() where id = %s $$, :'mill'),
  $$ values ('Molinos del Litoral', 'food_raw', 'ARG-01', 1, 4200::bigint, 2, 4500::bigint) $$,
  'the owner sees the company with its cash, wage and vacancies'
);
reset role;

-- Other players cannot touch it.
select pg_temp.act_as(:'marcos');
select throws_ok(
  format($$ select public.set_company_offer(%s, 1, 1) $$, :'mill'),
  '42501', 'not_your_company', 'only the owner sets the wage'
);
select throws_ok(
  format($$ select public.withdraw_from_company(%s, 100, gen_random_uuid()) $$, :'mill'),
  '42501', 'not_your_company', 'only the owner takes money out'
);

-- Offers and jobs.
select results_eq(
  $$ select name, wage, vacancies from public.list_job_offers() $$,
  $$ values ('Molinos del Litoral', 4200::bigint, 2) $$,
  'offers are the companies with vacancies in the player''s country'
);
select public.take_job(:'mill');
select is((select company_name from public.get_my_job()), 'Molinos del Litoral', 'taking a job');
select is((select vacancies from public.list_job_offers() where company_id = :'mill'), 1, 'a vacancy is filled');
reset role;
select pg_temp.act_as(:'ana');
select is_empty($$ select * from public.list_job_offers() $$, 'offers of another country are not shown');
select throws_ok(
  format($$ select public.take_job(%s) $$, :'mill'),
  '22023', 'wrong_country', 'jobs are in the player''s own country'
);
reset role;

-- Acceptance: work once a day, paid the gross minus 12 %.
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select gross, tax, net, energy, produced, good_code from public.work('c0000000-0000-4000-8000-000000000001') $$,
  $$ values (4200::bigint, 504::bigint, 3696::bigint, 90, 187::numeric, 'food_raw') $$,
  'acceptance: the wage collected is the gross minus 12 %'
);
select results_eq(
  $$ select gross, tax, net from public.work('c0000000-0000-4000-8000-000000000001') $$,
  $$ values (4200::bigint, 504::bigint, 3696::bigint) $$,
  'the same request again returns the same payslip'
);
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'already_worked', 'acceptance: working twice on the same day is rejected'
);
reset role;
select is(pg_temp.balance(:'marcos', 'ARG'), 10000::bigint + 3696, 'the worker got the net wage');
select is(pg_temp.balance(:'camila', 'ARG'), 10000::bigint - 4500, 'the owner''s Credit funded it');
select is(
  (select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'ARG'),
  504::bigint,
  'the tax went to the treasury'
);
select is((select balance from game.accounts where kind = 'company' and company_id = :'mill'), 300::bigint, 'the wage came out of the company''s cash');
select is(pg_temp.stock(:'mill', 'food_raw'), 187::numeric, 'an N1 extractor shift: floor(150 × 1.25 national bonus)');

-- A company without cash cannot pay: nobody works and nothing is charged. (21 hours after hiring.)
set local game.fixed_now = '2026-10-10 12:00:00+00';
select pg_temp.act_as(:'camila');
select public.withdraw_from_company(:'mill', (select cash from public.list_my_companies() where id = :'mill'), gen_random_uuid());
reset role;
select pg_temp.act_as(:'marcos');
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'company_cannot_pay', 'without cash the company cannot pay'
);
select is((select energy from public.get_my_profile()), 100, 'a refused workday spends no energy');
reset role;

-- Changing job waits 24 hours from the last one.
select pg_temp.act_as(:'marcos');
select public.leave_job();
select is((select count(*) from public.get_my_job())::int, 0, 'leaving the job');
reset role;
select pg_temp.act_as(:'camila');
select public.set_company_offer(:'kitchen', 3000, 1);
reset role;
select pg_temp.act_as(:'marcos');
select throws_ok(
  format($$ select public.take_job(%s) $$, :'kitchen'),
  '22023', 'job_change_too_soon', 'a new job waits 24 hours after the last one'
);
reset role;

-- Owners work in their own company without a wage; products need their inputs.
set local game.fixed_now = '2026-10-11 15:00:00+00';
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select * from public.work(gen_random_uuid(), %s) $$, :'kitchen'),
  '22023', 'inputs_missing', 'without raw food no Q1 food is made'
);
reset role;
select game.put_goods(game.holder_for_company(:'kitchen'), 'food_raw', 'ARG', 125, 'test', 'test');
select pg_temp.act_as(:'camila');
select results_eq(
  format($$ select gross, net, produced, good_code from public.work(gen_random_uuid(), %s) $$, :'kitchen'),
  $$ values (0::bigint, 0::bigint, 125::numeric, 'food_q1') $$,
  'an owner works without a wage: floor(100 × 1.25) Q1 food'
);
reset role;
select is(pg_temp.stock(:'kitchen', 'food_q1'), 125::numeric, 'the food is in stock');
select is(pg_temp.stock(:'kitchen', 'food_raw'), 0::numeric, 'one raw food per unit was used');
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select * from public.work(gen_random_uuid(), %s) $$, :'kitchen'),
  '22023', 'already_worked', 'one management shift per company and day'
);
reset role;

-- Upgrades: N2 needs civil level 10 (5 more GOLD of rewards) and 25 GOLD; quality follows the level.
select game.add_civil_xp(:'camila', 7500);
select pg_temp.act_as(:'camila');
select public.upgrade_company(:'workshop', gen_random_uuid());
select is((select level from public.list_my_companies() where id = :'workshop'), 2, 'upgrading to N2 (10 paid shifts a day)');
select is((select good_code from public.list_my_companies() where id = :'workshop'), 'weapon_q2', 'a manufacturer''s quality is its level');
reset role;
select is(
  pg_temp.balance(:'camila', 'GOLD'),
  500::bigint + 20000 - 1000 * 2 + 500 - 2500,
  'two N1 at 10 GOLD and N2 at 25 GOLD'
);

-- Minimum wage, when a law sets one.
update game.country_policies set minimum_wage = 3000 where country_code = 'ARG';
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select public.set_company_offer(%s, 2999, 1) $$, :'mill'),
  '22023', 'wage_below_minimum', 'no wage below the legal minimum'
);
reset role;

-- Access.
select ok(not has_function_privilege('anon', 'public.work(uuid, bigint)', 'EXECUTE'), 'visitors cannot work');
select ok(has_function_privilege('authenticated', 'public.work(uuid, bigint)', 'EXECUTE'), 'players can work');
select is_empty(
  $$ select currency_code from game.accounts group by currency_code having sum(balance) <> 0 $$,
  'money still adds up to zero in every currency'
);

select * from finish();
rollback;

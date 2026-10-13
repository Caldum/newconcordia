-- R5: resources, companies N1–N5, shifts and production. Acceptance (roadmap R5):
-- floor(150 × eff × HP/100 × (1 + bonus)); inputs debited match output; no production without inputs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

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

create function pg_temp.gold(p_user_id uuid)
returns bigint
language sql
as $$
  select balance from game.accounts where kind = 'citizen' and user_id = p_user_id and currency_code = 'GOLD';
$$;

create function pg_temp.depot(p_company bigint, p_good text)
returns numeric
language sql
as $$
  select game.holder_quantity(game.holder_for_company(p_company), p_good);
$$;

set local game.fixed_now = '2026-10-14 10:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('lucia@example.com', 'Lucía Paz', 'ARG') as lucia \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset
-- Camila reaches civil level 5 (2,500 XP) and gets 1,000 GOLD to build with; Ana too.
select game.add_civil_xp(:'camila', 2500), game.add_civil_xp(:'ana', 2500);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'camila', 'GOLD'), 100000, 'test', null);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'ana', 'GOLD'), 100000, 'test', null);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'marcos', 'GOLD'), 100000, 'test', null);

-- Resources (spec section 5).
select results_eq(
  $$ select category, count(*)::int from game.resources group by category order by category $$,
  $$ values ('food', 5), ('medical', 5), ('military', 5) $$,
  'fifteen resources: five food, five military, five medical'
);
select ok(
  (select count(distinct region_code) from game.region_resources) = (select count(*) from game.regions),
  'every region has its resources'
);
select results_eq(
  $$ select resource_code from game.region_resources where region_code = 'ARG-01' order by 1 $$,
  $$ values ('cattle'), ('corn'), ('fish'), ('wheat') $$,
  'Buenos Aires: cattle, corn, fish and wheat'
);
select is(game.national_bonus('ARG'), 0.25::numeric, 'five or more resources give the +25 % maximum');
select is(
  game.national_bonus('URY'),
  0::numeric,
  'a country without regions has no national bonus'
);

-- Founding: N1 costs 10 GOLD and civil level 5; extractors only where the resource exists.
select pg_temp.gold(:'camila') as gold_before \gset
select pg_temp.act_as(:'camila');
select public.found_company('Estancia Ríos', 'food_raw', 'ARG-01', gen_random_uuid()) as farm \gset
select public.found_company('Cocina Ríos', 'food_q1', 'ARG-01', gen_random_uuid()) as kitchen \gset
select throws_ok(
  $$ select public.found_company('Salinas', 'medical_raw', 'ARG-01', gen_random_uuid()) $$,
  '22023', 'resource_missing', 'no medical extractor where there is no medical resource'
);
select throws_ok(
  $$ select public.found_company('Cocina 2', 'food_q2', 'ARG-01', gen_random_uuid()) $$,
  '22023', 'good_invalid', 'a manufacturer starts at Q1 (N1)'
);
reset role;
select is(pg_temp.gold(:'camila'), :'gold_before'::bigint - 2000, 'two N1 companies cost 10 GOLD each');
select results_eq(
  format($$ select kind, category, level, good_code, country_code from game.companies where id in (%s, %s) order by id $$, :'farm', :'kitchen'),
  $$ values ('extractor', 'food', 1, 'food_raw', 'ARG'), ('manufacturer', 'food', 1, 'food_q1', 'ARG') $$,
  'an extractor and a manufacturer, both N1'
);
select pg_temp.act_as(:'marcos');
select throws_ok(
  $$ select public.found_company('Molino', 'food_raw', 'ARG-01', gen_random_uuid()) $$,
  '22023', 'level_too_low', 'founding needs civil level 5'
);
reset role;

-- A management shift in the extractor: floor(150 × 1.0 × 100/100 × 1.25) = 187.
select pg_temp.act_as(:'camila');
select results_eq(
  format($$ select kind, gross, produced, good_code from public.work(gen_random_uuid(), %s) $$, :'farm'),
  $$ values ('management', 0::bigint, 187::numeric, 'food_raw') $$,
  'acceptance: an extractor shift yields floor(150 × eff × HP/100 × (1 + bonus))'
);
reset role;
select is(pg_temp.depot(:'farm', 'food_raw'), 187::numeric, 'the output is in the depot');
select is(
  (select origin_country_code from game.inventory_lots where holder_id = game.holder_for_company(:'farm') and good_code = 'food_raw'),
  'ARG',
  'made in Argentina'
);
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select * from public.work(gen_random_uuid(), %s) $$, :'farm'),
  '22023', 'already_worked', 'one management shift per own company per day'
);

-- No production without inputs: the kitchen has no raw food yet.
select throws_ok(
  format($$ select * from public.work(gen_random_uuid(), %s) $$, :'kitchen'),
  '22023', 'inputs_missing', 'acceptance: no production without inputs'
);
reset role;
select is(pg_temp.depot(:'kitchen', 'food_q1'), 0::numeric, 'and nothing was made');
select game.put_goods(game.holder_for_company(:'kitchen'), 'food_raw', 'ARG', 200, 'test', 'test');
select pg_temp.act_as(:'camila');
select results_eq(
  format($$ select kind, produced, good_code from public.work(gen_random_uuid(), %s) $$, :'kitchen'),
  $$ values ('management', 125::numeric, 'food_q1') $$,
  'food Q1: floor(100 × HP/100 × 1.25) = 125'
);
reset role;
select results_eq(
  format($$ select pg_temp.depot(%s, 'food_q1'), pg_temp.depot(%s, 'food_raw') $$, :'kitchen', :'kitchen'),
  $$ values (125::numeric, 75::numeric) $$,
  'acceptance: the inputs debited match the output (125 × 1 raw food)'
);
select is(
  (select sum(quantity) from game.inventory_movements where kind = 'production_input' and from_holder_id = game.holder_for_company(:'kitchen')),
  125::numeric,
  'the inputs are logged'
);

-- Employees: a paid shift pays the wage minus the work tax; health lowers the output.
select pg_temp.act_as(:'camila');
select public.fund_company(:'farm', 5000, gen_random_uuid());
select public.set_company_offer(:'farm', 1000, 3);
reset role;
select pg_temp.act_as(:'marcos');
select public.take_job(:'farm');
reset role;
update game.player_stats set health = 50 where user_id = :'marcos';
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select kind, gross, tax, net, produced from public.work(gen_random_uuid()) $$,
  $$ values ('regular', 1000::bigint, 120::bigint, 880::bigint, 93::numeric) $$,
  'a paid shift at half health: wage minus 12 %, floor(150 × 0.5 × 1.25) = 93'
);
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'already_worked', 'one paid shift a day without authorization'
);
reset role;

-- Second shift: only with the employer's individual authorization and its own wage.
update game.country_policies set minimum_wage = 500 where country_code = 'ARG';
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select public.authorize_second_shift(%s, 'Marcos Villalba', 1) $$, :'farm'),
  '22023', 'wage_below_minimum', 'the second-shift wage respects the minimum wage'
);
select public.authorize_second_shift(:'farm', 'Marcos Villalba', 800);
select results_eq(
  format($$ select name, second_shift_wage from public.get_company_employees(%s) $$, :'farm'),
  $$ values ('Marcos Villalba', 800::bigint) $$,
  'the employer sees the authorization'
);
reset role;
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select kind, gross, produced from public.work(gen_random_uuid()) $$,
  $$ values ('second', 800::bigint, 93::numeric) $$,
  'the authorized second shift'
);
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'already_worked', 'never a third paid shift'
);
select is(
  (select count(*) from public.get_my_shifts_today())::int,
  2,
  'the player sees both shifts of today'
);
reset role;

-- Paid shifts per day are capped by the company level (5 at N1).
update game.balance_params set value = 2 where key = 'company_shifts_level1';
select pg_temp.act_as(:'lucia');
select public.take_job(:'farm');
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'company_shifts_exhausted', 'no paid shift beyond the company''s daily quota'
);
reset role;
update game.balance_params set value = 5 where key = 'company_shifts_level1';

-- Nobody works at zero health; a company without cash cannot pay.
update game.player_stats set health = 0 where user_id = :'lucia';
select pg_temp.act_as(:'lucia');
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'no_health', 'at zero health a citizen cannot work'
);
reset role;
update game.player_stats set health = 100 where user_id = :'lucia';
select balance as farm_cash from game.accounts where kind = 'company' and company_id = :'farm' \gset
select pg_temp.act_as(:'camila');
select public.withdraw_from_company(:'farm', :'farm_cash', gen_random_uuid());
reset role;
select pg_temp.act_as(:'lucia');
select throws_ok(
  $$ select * from public.work(gen_random_uuid()) $$,
  '22023', 'company_cannot_pay', 'without cash the company cannot run paid work'
);
reset role;
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select public.take_job(%s) $$, :'kitchen'),
  '22023', 'own_company', 'owners do not hire themselves'
);
reset role;

-- Upgrades: N2 costs 25 GOLD and civil level 10; efficiency and quality follow the level.
select pg_temp.act_as(:'camila');
select throws_ok(
  format($$ select public.upgrade_company(%s, gen_random_uuid()) $$, :'farm'),
  '22023', 'level_too_low', 'N2 needs civil level 10'
);
reset role;
select game.add_civil_xp(:'camila', 7500);
select pg_temp.gold(:'camila') as gold_before \gset
select pg_temp.act_as(:'camila');
select is(public.upgrade_company(:'farm', gen_random_uuid()), 2, 'upgrading to N2');
select is(public.upgrade_company(:'kitchen', gen_random_uuid()), 2, 'the kitchen too');
reset role;
select is(pg_temp.gold(:'camila'), :'gold_before'::bigint - 5000, 'each N2 upgrade costs 25 GOLD');
select is((select good_code from game.companies where id = :'kitchen'), 'food_q2', 'a manufacturer''s quality is its level');
select results_eq(
  format($$ select level, shifts_per_day, efficiency from public.list_my_companies() where id = %s $$, :'farm'),
  $$ values (2, 10, 1.25) $$,
  'N2: 10 paid shifts a day and +25 % efficiency'
);
set local game.fixed_now = '2026-10-15 10:00:00+00';
select game.put_goods(game.holder_for_company(:'kitchen'), 'food_raw', 'ARG', 300, 'test', 'test');
select pg_temp.act_as(:'camila');
select is(
  (select produced from public.work(gen_random_uuid(), :'farm')),
  234::numeric,
  'an N2 extractor: floor(150 × 1.25 × 1 × 1.25) = 234'
);
select is(
  (select produced from public.work(gen_random_uuid(), :'kitchen')),
  112::numeric,
  'food Q2: floor(90 × 1.25) = 112, using 2 raw food each'
);
reset role;
select is(pg_temp.depot(:'kitchen', 'food_raw'), 151::numeric, 'acceptance: 75 + 300 raw food, minus the 224 used');

-- A foreign owner pays the host's construction surcharge, which goes to its treasury.
update game.country_policies set foreign_construction_surcharge = 0.5 where country_code = 'ARG';
select pg_temp.gold(:'ana') as ana_before \gset
select coalesce((select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD'), 0) as treasury_before \gset
select pg_temp.act_as(:'ana');
select public.found_company('Pesquera Souza', 'food_raw', 'ARG-01', gen_random_uuid()) as fishery \gset
reset role;
select is(pg_temp.gold(:'ana'), :'ana_before'::bigint - 1500, 'a foreign owner pays 10 GOLD plus 50 %');
select is(
  (select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD') - :'treasury_before'::bigint,
  500::bigint,
  'the surcharge goes to the host treasury'
);
select is((select country_code from game.companies where id = :'fishery'), 'ARG', 'the company belongs to the host country');
select is(
  (select burned from (select sum(s.amount)::bigint as burned from game.supply_changes as s join game.ledger_postings as p on p.id = s.posting_id
   join game.ledger_transactions as t on t.id = p.transaction_id where t.kind = 'company_founded' and s.direction = 'burn' and t.actor_user_id = :'ana') as b),
  1000::bigint,
  'the base price is burned'
);

-- The old quality upgrade is gone: quality follows the level.
select ok(not exists (select 1 from pg_proc where proname = 'upgrade_company_quality'), 'no separate quality upgrade');
select is(
  (select array_agg(code order by code) from public.list_resources() where category = 'military'),
  array['coal', 'copper', 'iron', 'oil', 'sulfur'],
  'the resources are public'
);

select * from finish();
rollback;

-- R7: the Stage 1 journey. Acceptance (roadmap): a citizen works → produces a kit → sells → another buys →
-- consumes; the ledger stays consistent. Plus the personal kit rules (spec section 7, ADR 0023).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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

create function pg_temp.depot(p_company bigint, p_good text)
returns numeric
language sql
as $$
  select coalesce(sum(quantity), 0) from game.inventory_lots
  where holder_id = game.holder_for_company(p_company) and good_code = p_good;
$$;

create function pg_temp.held(p_user uuid, p_good text)
returns numeric
language sql
as $$
  select coalesce(sum(quantity), 0) from game.inventory_lots
  where holder_id = game.holder_for_citizen(p_user) and good_code = p_good;
$$;

set local game.fixed_now = '2026-10-15 10:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select game.add_civil_xp(:'camila', 2500);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'camila', 'GOLD'), 2000, 'test', null);

-- An Argentine region with a medical resource, for the extractor.
select r.code as medical_region
from game.regions as r
join game.region_resources as rr on rr.region_code = r.code
join game.resources as res on res.code = rr.resource_code
where r.owner_country_code = 'ARG' and r.is_enabled and res.category = 'medical'
order by r.code
limit 1 \gset

-- 1. Camila founds a medical extractor and a kit maker, and works both. ---------------------------------
select pg_temp.act_as(:'camila');
select public.found_company('Salinas Ríos', 'medical_raw', :'medical_region', gen_random_uuid()) as salinas \gset
select public.found_company('Botiquines Ríos', 'kit_q1', 'ARG-01', gen_random_uuid()) as kits \gset
select results_eq(
  format($$ select kind, produced, good_code from public.work(gen_random_uuid(), %s) $$, :'salinas'),
  $$ values ('management', 187::numeric, 'medical_raw') $$,
  'the extractor shift yields floor(150 × 1 × 1.25) medical raw material'
);
select public.move_goods(:'salinas', 'medical_raw', 187, true);
select public.move_goods(:'kits', 'medical_raw', 187, false);
select results_eq(
  format($$ select kind, produced, good_code from public.work(gen_random_uuid(), %s) $$, :'kits'),
  $$ values ('management', 25::numeric, 'kit_q1') $$,
  'the kit shift makes floor(20 × 1.25) = 25 kits Q1'
);
reset role;
select is(pg_temp.depot(:'kits', 'kit_q1'), 25::numeric, 'the kits are in the depot');
select is(pg_temp.depot(:'kits', 'medical_raw'), 62::numeric, 'they used exactly 25 × 5 = 125 of the 187 raw');

-- 2. She sells them; Marcos buys one. ---------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.post_offer('kit_q1', 25, 800, 'ARG', gen_random_uuid(), :'kits') as offer \gset
reset role;
select pg_temp.act_as(:'marcos');
select is(public.buy(:'offer', 1, gen_random_uuid()), 800::bigint, 'Marcos pays 8.00 for one kit');
reset role;
select is(pg_temp.held(:'marcos', 'kit_q1'), 1::numeric, 'the kit is in his inventory');
select is(
  (select balance from game.accounts where id = game.company_account(:'kits', 'ARG')),
  800::bigint - round(800 - 800 / 1.05)::bigint - round(800 * 0.01)::bigint,
  'the company got 8.00 minus VAT and fee'
);

-- 3. He uses it. ------------------------------------------------------------------------------------
select pg_temp.act_as(:'marcos');
select throws_ok(
  $$ select * from public.use_kit('kit_q1', gen_random_uuid()) $$,
  '22023', 'health_full', 'nobody spends a kit at full health'
);
reset role;
update game.player_stats set health = 40 where user_id = :'marcos';
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select healed, health from public.use_kit('kit_q1', 'a7000000-0000-4000-8000-000000000001') $$,
  $$ values (5, 45) $$,
  'acceptance: a Q1 kit heals 5'
);
select results_eq(
  $$ select healed, health from public.use_kit('kit_q1', 'a7000000-0000-4000-8000-000000000001') $$,
  $$ values (5, 45) $$,
  'the same request does not use a second kit'
);
select throws_ok(
  $$ select * from public.use_kit('kit_q1', gen_random_uuid()) $$,
  '22023', 'quantity_unavailable', 'without kits there is nothing to use'
);
select throws_ok(
  $$ select * from public.use_kit('food_q1', gen_random_uuid()) $$,
  '22023', 'good_invalid', 'food is not a kit'
);
reset role;
select is(pg_temp.held(:'marcos', 'kit_q1'), 0::numeric, 'the kit was consumed');
select is((select health from game.player_stats where user_id = :'marcos'), 45, 'his health is 45');

-- Kits at the edges: at zero health it still heals; above 95 the excess is wasted and the kit is spent.
select pg_temp.act_as(:'marcos');
select public.buy(:'offer', 3, gen_random_uuid());
reset role;
update game.player_stats set health = 0 where user_id = :'marcos';
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select healed, health from public.use_kit('kit_q1', gen_random_uuid()) $$,
  $$ values (5, 5) $$,
  'a kit works at zero health'
);
reset role;
update game.player_stats set health = 98 where user_id = :'marcos';
select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select healed, health from public.use_kit('kit_q1', gen_random_uuid()) $$,
  $$ values (2, 100) $$,
  'at 98 a Q1 kit heals 2: health never passes 100'
);
reset role;
select is(pg_temp.held(:'marcos', 'kit_q1'), 1::numeric, 'the whole kit was spent anyway');
select is(
  (select count(*)::integer from game.kit_uses where user_id = :'marcos'),
  3,
  'every kit used is recorded'
);
select is(
  (select count(*)::integer from game.inventory_movements where kind = 'kit_used'),
  3,
  'and leaves the inventory log'
);

-- 4. The ledger is consistent: in every currency, the balances add up to zero (issuers are negative). ----
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'acceptance: every currency balances'
);
select ok(not has_function_privilege('anon', 'public.use_kit(text, uuid)', 'EXECUTE'), 'visitors cannot use kits');

select * from finish();
rollback;

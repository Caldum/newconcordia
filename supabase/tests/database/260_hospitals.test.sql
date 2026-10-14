-- H3: public hospitals per region, built and upgraded with Health's GOLD, kits only, the lowest sufficient compatible
-- kit, partial recovery, care policy, and stock private to Health and the presidency (spec section 7, ADR 0031).
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'), now(), now(), now())
  returning id into v_id;
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

create function pg_temp.health_gold()
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'ministry' and country_code = 'ARG' and ministry = 'health'
                   and currency_code = 'GOLD'), 0);
$$;

create function pg_temp.hospital_kits(p_region text, p_good text)
returns numeric
language sql
as $$
  select game.holder_quantity(game.holder_for_hospital(p_region), p_good);
$$;

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code in ('ARG', 'BRA');

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG') as elena \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
select pg_temp.new_player('tomas@example.com', 'Tomás Luna', 'ARG') as tomas \gset
update game.citizens set region_code = 'ARG-01' where user_id in (:'elena', :'bea');
update game.citizens set region_code = 'ARG-02' where user_id = :'tomas';
insert into game.offices (country_code, office, user_id) values ('ARG', 'president', :'camila'), ('ARG', 'minister_health', :'juan');

-- Health has 1,000 GOLD and kits in its store.
select game.post('test_health', null, null, array[row(game.system_account('issuer', 'GOLD'),
                 game.ministry_account('ARG', 'health', 'GOLD'), 100000, 'election_reward', null)::game.ledger_leg]);
select game.put_goods(game.holder_for_ministry('ARG', 'health'), g, 'ARG', n, 'test', null)
from (values ('kit_q1', 2), ('kit_q2', 1), ('kit_q3', 1), ('kit_q5', 2)) as k (g, n);

-- Building and upgrading. ---------------------------------------------------------------------------------------------
select pg_temp.act_as(:'elena');
select throws_ok($$ select public.build_hospital('ARG-01', gen_random_uuid()) $$, '42501', 'not_minister',
                 'only the Health minister builds');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.build_hospital('BRA-01', gen_random_uuid()) $$, '22023', 'region_invalid',
                 'only in the country''s regions');
select lives_ok($$ select public.build_hospital('ARG-01', '00000000-0000-0000-0000-0000000000a1') $$, 'Health builds an N1 hospital');
select lives_ok($$ select public.build_hospital('ARG-01', '00000000-0000-0000-0000-0000000000a1') $$, 'a repeated key does nothing');
select throws_ok($$ select public.build_hospital('ARG-01', gen_random_uuid()) $$, '22023', 'hospital_exists', 'one per region');
reset role;
select is(pg_temp.health_gold(), 95000::bigint, 'building costs Health 50 GOLD');
select pg_temp.act_as(:'juan');
select is(public.upgrade_hospital('ARG-01', '00000000-0000-0000-0000-0000000000a2'), 2, 'N2 for 75 GOLD');
select is(public.upgrade_hospital('ARG-01', '00000000-0000-0000-0000-0000000000a2'), 2, 'once per key');
select throws_ok($$ select public.upgrade_hospital('ARG-02', gen_random_uuid()) $$, 'P0002', 'no_hospital',
                 'a region without a hospital');
reset role;
select is(pg_temp.health_gold(), 87500::bigint, 'and the upgrade is paid by Health');

-- Treatment picks the lowest sufficient compatible kit. --------------------------------------------------------------
update game.player_stats set health = 97 where user_id = :'elena';
select pg_temp.act_as(:'elena');
select throws_ok($$ select * from public.hospital_treatment(gen_random_uuid()) $$, '22023', 'no_compatible_kit',
                 'an empty hospital refuses care');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.move_kits('food_q1', 1, null, 'ARG-01') $$, '22023', 'good_invalid', 'hospitals hold kits only');
select throws_ok($$ select public.move_kits('kit_q1', 1, null, 'ARG-02') $$, 'P0002', 'no_hospital', 'into a hospital');
select throws_ok($$ select public.move_kits('kit_q5', 9, null, 'ARG-01') $$, '22023', 'quantity_unavailable', 'only what Health has');
select lives_ok($$ select public.move_kits('kit_q5', 2, null, 'ARG-01') $$, 'Health moves two Q5 kits to the hospital');
select lives_ok($$ select public.move_kits('kit_q3', 1, null, 'ARG-01') $$, 'a Q3');
select lives_ok($$ select public.move_kits('kit_q2', 1, null, 'ARG-01') $$, 'and a Q2');
reset role;
select pg_temp.act_as(:'elena');
select results_eq($$ select good_code, healed, health from public.hospital_treatment('00000000-0000-0000-0000-0000000000b1') $$,
                  $$ values ('kit_q2', 3, 100) $$, 'at 97 HP an N2 hospital uses its Q2');
select results_eq($$ select good_code, healed, health from public.hospital_treatment('00000000-0000-0000-0000-0000000000b1') $$,
                  $$ values ('kit_q2', 3, 100) $$, 'a repeated key returns the same treatment');
select throws_ok($$ select * from public.hospital_treatment(gen_random_uuid()) $$, '22023', 'health_full', 'nothing to heal');
reset role;
update game.player_stats set health = 80 where user_id = :'elena';
select pg_temp.act_as(:'elena');
select throws_ok($$ select * from public.hospital_treatment(gen_random_uuid()) $$, '22023', 'no_compatible_kit',
                 'an N2 hospital never uses Q3 or Q5');
reset role;

select pg_temp.act_as(:'juan');
select is(public.upgrade_hospital('ARG-01', gen_random_uuid()), 3, 'N3');
select is(public.upgrade_hospital('ARG-01', gen_random_uuid()), 4, 'N4');
select is(public.upgrade_hospital('ARG-01', gen_random_uuid()), 5, 'N5');
select throws_ok($$ select public.upgrade_hospital('ARG-01', gen_random_uuid()) $$, '22023', 'level_max', 'N5 is the top');
reset role;
select is(pg_temp.health_gold(), 100000 - 50000::bigint, 'the hospital up to N5 cost Health 500 GOLD');
update game.player_stats set health = 97 where user_id = :'elena';
select pg_temp.act_as(:'elena');
select results_eq($$ select good_code, health from public.hospital_treatment(gen_random_uuid()) $$, $$ values ('kit_q3', 100) $$,
                  'at 97 HP the lowest sufficient kit is the Q3');
reset role;
update game.player_stats set health = 97 where user_id = :'elena';
select pg_temp.act_as(:'elena');
select results_eq($$ select good_code, healed, health from public.hospital_treatment(gen_random_uuid()) $$,
                  $$ values ('kit_q5', 3, 100) $$, 'with only Q5 left, the Q5 is spent and health stops at 100');
reset role;
select is(pg_temp.hospital_kits('ARG-01', 'kit_q5'), 1::numeric, 'one Q5 is left');

-- Partial recovery with a lower kit. -------------------------------------------------------------------------------------
select pg_temp.act_as(:'juan');
select lives_ok($$ select public.move_kits('kit_q5', 1, 'ARG-01', null) $$, 'Health takes the Q5 back to its store');
select lives_ok($$ select public.move_kits('kit_q1', 2, null, 'ARG-01') $$, 'and sends two Q1');
reset role;
update game.player_stats set health = 60 where user_id = :'elena';
select pg_temp.act_as(:'elena');
select results_eq($$ select good_code, healed, health from public.hospital_treatment(gen_random_uuid()) $$,
                  $$ values ('kit_q1', 5, 65) $$, 'without a kit that covers 40 HP, a Q1 heals what it can');
reset role;

-- Care policy. -------------------------------------------------------------------------------------------------------------
update game.player_stats set health = 50 where user_id = :'bea';
select pg_temp.act_as(:'bea');
select results_eq($$ select good_code, health from public.hospital_treatment(gen_random_uuid()) $$, $$ values ('kit_q1', 55) $$,
                  'the universal policy treats a foreigner in the region');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.set_care_policy('rich') $$, '22023', 'policy_invalid', 'four policies');
select lives_ok($$ select public.set_care_policy('nationals') $$, 'Health treats nationals only');
reset role;
select pg_temp.act_as(:'bea');
select throws_ok($$ select * from public.hospital_treatment(gen_random_uuid()) $$, '42501', 'not_eligible',
                 'so the foreigner is refused');
reset role;
select pg_temp.act_as(:'tomas');
select throws_ok($$ select * from public.hospital_treatment(gen_random_uuid()) $$, 'P0002', 'no_hospital',
                 'a region without a hospital treats nobody');
reset role;
select results_eq($$ select policy, set_by_name from public.list_care_policy_changes('ARG') $$,
                  $$ values ('nationals', 'Juan Pérez') $$, 'the policy change is logged');

-- Privacy. ---------------------------------------------------------------------------------------------------------------
select results_eq($$ select region_code, level from public.list_hospitals('ARG') $$, $$ values ('ARG-01', 5) $$,
                  'anyone sees the hospitals and their levels');
select pg_temp.act_as(:'camila');
select results_eq($$ select region_code, good_code, quantity from public.get_hospital_stock() $$,
                  $$ values (null::text, 'kit_q5', 1::numeric) $$, 'the president sees the stock per hospital');
reset role;
select pg_temp.act_as(:'elena');
select throws_ok($$ select * from public.get_hospital_stock() $$, '42501', 'not_minister', 'nobody else does');
reset role;
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_table_privilege('authenticated', 'game.treatments', 'SELECT'), 'treatments are not readable directly');

select * from finish();
rollback;

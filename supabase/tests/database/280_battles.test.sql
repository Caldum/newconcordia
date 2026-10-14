-- W2 + W3: launching offensives, rounds of one hour, first to 5, ties to the defender, annexation, cooldown, attacks
-- with the damage formula, weapons with uses, XP bonuses, injuries after the gains, eligibility (ADR 0033).
begin;
create extension if not exists pgtap with schema extensions;
select plan(48);

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

create function pg_temp.at(p_at text)
returns void
language sql
as $$
  select set_config('game.fixed_now', p_at, true);
$$;

-- Full energy now, so each attack starts from 100.
create function pg_temp.rest(p_user uuid)
returns void
language sql
as $$
  update game.player_stats set energy = 100, energy_at = game.now() where user_id = p_user;
$$;

select pg_temp.at('2026-11-07 10:00:00+00');
select set_config('game.fixed_random', '0.9', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, 'ARG-01')
where code in ('ARG', 'BRA', 'URY');

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG') as elena \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG') as pedro \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
select pg_temp.new_player('uma@example.com', 'Uma Silva', 'URY') as uma \gset
insert into game.offices (country_code, office, user_id) values ('ARG', 'president', :'camila'), ('ARG', 'minister_defense', :'pedro');
insert into game.mandates (country_code, office, user_id, began_at) values
  ('ARG', 'president', :'camila', game.now()), ('ARG', 'congress', :'elena', game.now()), ('ARG', 'congress', :'marcos', game.now());

-- Brazil becomes the enemy by law. ------------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.propose_bill('enemy_designation', 'Brasil es enemigo', '', '{"country_code": "BRA"}', null) as enemy_bill \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'enemy_bill', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'enemy_bill', 'yes');
reset role;
select pg_temp.at('2026-11-08 10:05:00+00');
select game.job_elections('2026-11-08 10:05:00+00');

-- Launching. -------------------------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-08 12:00:00+00');
insert into game.battles (region_code, attacker_country_code, defender_country_code, started_at, rounds_closed, status,
                          winner, finished_at)
values ('BRA-03', 'URY', 'BRA', '2026-11-08 00:00+00', 5, 'finished', 'defender', '2026-11-08 05:00+00');
select pg_temp.act_as(:'elena');
select throws_ok($$ select public.launch_offensive('BRA-01', gen_random_uuid()) $$, '42501', 'not_president',
                 'only the president launches');
reset role;
select pg_temp.act_as(:'camila');
select results_eq($$ select count(*)::integer > 0, bool_or(needs_authorization) from public.list_launch_targets() $$,
                  $$ values (true, false) $$, 'the enemy''s regions can be attacked without authorization');
select throws_ok($$ select public.launch_offensive('ARG-01', gen_random_uuid()) $$, '22023', 'region_invalid',
                 'not one''s own region');
select throws_ok($$ select public.launch_offensive('BRA-03', gen_random_uuid()) $$, '22023', 'cooldown',
                 'a region rests 24 hours after a battle');
select public.launch_offensive('BRA-01', '00000000-0000-0000-0000-00000000aa01') as battle \gset
select is(public.launch_offensive('BRA-01', '00000000-0000-0000-0000-00000000aa01'), :'battle'::bigint, 'once per key');
select throws_ok($$ select public.launch_offensive('BRA-01', gen_random_uuid()) $$, '22023', 'battle_active',
                 'one battle per region');
reset role;

-- Eligibility. -----------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'bea');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'), '42501',
                 'not_eligible', 'nobody fights against their own country');
reset role;
select pg_temp.act_as(:'uma');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'defender'), '42501',
                 'not_eligible', 'a foreigner must be in the region');
reset role;
select pg_temp.act_as(:'ana');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'middle'), '22023',
                 'side_invalid', 'attacker or defender');
reset role;

-- Round 1: Ana unarmed (10 damage, 15 XP against the enemy), then with a Q5 weapon (20); Bea defends (10). -------------
select pg_temp.at('2026-11-08 12:10:00+00');
select pg_temp.act_as(:'ana');
select results_eq(format('select damage, military_xp, civil_xp, energy, weapon_uses_left from public.attack(%s, %L, %L)',
                         :'battle', 'attacker', '00000000-0000-0000-0000-00000000ab01'),
                  $$ values (10::bigint, 15::bigint, 15::bigint, 90, 0) $$,
                  'unarmed: floor((10 + 0) × 100/100) = 10; +50 % XP against the enemy');
select results_eq(format('select damage, energy from public.attack(%s, %L, %L)',
                         :'battle', 'attacker', '00000000-0000-0000-0000-00000000ab01'),
                  $$ values (10::bigint, 90) $$, 'a repeated key spends nothing twice');
select throws_ok($$ select public.equip_weapon('kit_q1') $$, '22023', 'weapon_invalid', 'only weapons');
select throws_ok($$ select public.equip_weapon('weapon_q5') $$, '22023', 'quantity_unavailable', 'from the inventory');
reset role;
select game.put_goods(game.holder_for_citizen(:'ana'), 'weapon_q5', 'ARG', 2, 'test', null);
select pg_temp.act_as(:'ana');
select is(public.equip_weapon('weapon_q5'), 5, 'a Q5 weapon lasts 5 attacks');
select throws_ok($$ select public.equip_weapon('weapon_q5') $$, '22023', 'weapon_equipped', 'one weapon at a time');
select results_eq(format('select damage, weapon_uses_left from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                  $$ values (20::bigint, 4) $$, 'Q5 doubles the damage and spends one use');
reset role;
select pg_temp.act_as(:'bea');
select results_eq(format('select damage, military_xp from public.attack(%s, %L, gen_random_uuid())', :'battle', 'defender'),
                  $$ values (10::bigint, 10::bigint) $$, 'Bea defends: no enemy bonus for her');
reset role;
update game.citizens set region_code = 'BRA-01' where user_id = :'uma';
select pg_temp.act_as(:'uma');
select lives_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'defender'),
                'a foreigner in the region may fight');
reset role;
select results_eq(format('select attacker_damage, defender_damage, current_round from public.get_battle(%s)', :'battle'),
                  $$ values (30::bigint, 20::bigint, 1) $$, 'the live score of round 1');

-- Round 2: only Brazil. Round 3: nobody. ----------------------------------------------------------------------------------
select pg_temp.at('2026-11-08 13:10:00+00');
select pg_temp.rest(:'bea');
select pg_temp.act_as(:'bea');
select results_eq(format('select damage from public.attack(%s, %L, gen_random_uuid())', :'battle', 'defender'),
                  $$ values (10::bigint) $$, 'Bea attacks in round 2');
reset role;
select results_eq(format('select round_no, attacker_damage, defender_damage, winner from public.list_battle_rounds(%s)', :'battle'),
                  $$ values (1, 30::bigint, 20::bigint, 'attacker') $$, 'round 1 closed for Argentina');

-- The Defense minister's priority battle. --------------------------------------------------------------------------------
select pg_temp.act_as(:'elena');
select throws_ok(format('select public.set_battle_order(%s)', :'battle'), '42501', 'not_minister', 'only Defense names it');
reset role;
select pg_temp.act_as(:'pedro');
select lives_ok(format('select public.set_battle_order(%s)', :'battle'), 'Defense names the priority battle');
reset role;

-- Rounds 4 to 7: Argentina. -------------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-08 15:10:00+00');
select pg_temp.rest(:'ana');
select pg_temp.act_as(:'ana');
select results_eq(format('select damage, military_xp from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                  $$ values (20::bigint, 32::bigint) $$, 'enemy and order: +60 % XP, additive');
reset role;
select results_eq(format('select attacker_rounds, defender_rounds, current_round from public.get_battle(%s)', :'battle'),
                  $$ values (1, 2, 4) $$, 'round 2 to Brazil, and a round without damage goes to the defender');

select pg_temp.at('2026-11-08 16:10:00+00');
select pg_temp.rest(:'ana');
select set_config('game.fixed_random', '0', true);
select pg_temp.act_as(:'ana');
select results_eq(format('select damage > 0, military_xp > 0, health_lost, health from public.attack(%s, %L, gen_random_uuid())',
                         :'battle', 'attacker'),
                  $$ values (true, true, 5, 95) $$, 'the injury comes after damage and XP: 5 × (100 − 90) / 10');
reset role;
select set_config('game.fixed_random', '0.9', true);
select results_eq($$ select cause, health_lost from public.list_my_injuries() $$, $$ values ('attack', 5) $$,
                  'it is logged') from (select pg_temp.act_as(:'ana')) as s;
reset role;

-- Juan: strength 90, half health, rank step 2, a Q3 weapon. --------------------------------------------------------------
select pg_temp.at('2026-11-08 17:10:00+00');
update game.player_stats set strength = 90, health = 50, military_xp = 400, energy = 100, energy_at = game.now() where user_id = :'juan';
select game.put_goods(game.holder_for_citizen(:'juan'), 'weapon_q3', 'ARG', 1, 'test', null);
select pg_temp.act_as(:'juan');
select public.equip_weapon('weapon_q3');
select results_eq(format('select damage from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                  $$ values (88::bigint) $$, 'floor((10 + 90) × 50/100 × (1 + 0.2 × 3) × (1 + 0.05 × 2)) = 88');
reset role;
select pg_temp.rest(:'ana');
select pg_temp.act_as(:'ana');
select lives_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'), 'Ana again');
reset role;

-- Energy and health. ---------------------------------------------------------------------------------------------------------
update game.player_stats set energy = 5, energy_at = game.now() where user_id = :'ana';
select pg_temp.act_as(:'ana');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'), '22023',
                 'not_enough_energy', 'an attack needs 10 energy');
reset role;
update game.player_stats set energy = 10, energy_at = game.now() where user_id = :'ana';
select pg_temp.act_as(:'ana');
select results_eq(format('select energy from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                  $$ values (0) $$, 'with exactly 10 the attack happens and leaves 0');
reset role;
update game.player_stats set health = 0, energy = 100, energy_at = game.now() where user_id = :'juan';
select pg_temp.act_as(:'juan');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'), '22023',
                 'health_zero', 'nobody attacks at zero health');
reset role;

select pg_temp.at('2026-11-08 18:10:00+00');
select pg_temp.rest(:'ana');
select pg_temp.act_as(:'ana');
select results_eq(format('select weapon_uses_left from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                  $$ values (0) $$, 'the fifth use spends the weapon');
select results_eq(format('select damage from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                  $$ values (9::bigint) $$, 'then Ana fights unarmed (at 95 health)');
reset role;

-- The end: Argentina wins round 7, its fifth, and annexes the region. -------------------------------------------------------
select pg_temp.at('2026-11-08 19:00:00+00');
select is(game.settle_battle(:'battle'), 'finished', 'the battle ends when a side has 5 rounds');
select results_eq(format('select attacker_rounds, defender_rounds, winner, finished_at from game.battles where id = %s', :'battle'),
                  $$ values (5, 2, 'attacker', '2026-11-08 19:00:00+00'::timestamptz) $$,
                  'five to two, at the end of round 7');
select is((select owner_country_code from game.regions where code = 'BRA-01'), 'ARG', 'the attacker annexes the region');
select results_eq($$ select from_country_code, to_country_code from game.region_owner_changes where region_code = 'BRA-01' $$,
                  $$ values ('BRA', 'ARG') $$, 'and the change is recorded');
select is((select count(*)::integer from game.battle_orders), 0, 'the priority order ends with the battle');
select is((select count(*)::integer from game.battle_rounds where battle_id = :'battle'), 7, 'seven rounds were played');
select pg_temp.act_as(:'ana');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'), '22023',
                 'battle_closed', 'no attacks after the end');
reset role;
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.launch_offensive('BRA-01', gen_random_uuid()) $$, '22023', 'region_invalid',
                 'the region is Argentina''s now');
reset role;

-- Records. -------------------------------------------------------------------------------------------------------------------
select results_eq(format('select side, name from public.battle_ranking(%s) order by side, damage desc limit 1', :'battle'),
                  $$ values ('attacker', 'Ana Gómez') $$, 'the ranking per side');
select ok((select damage from game.player_stats where user_id = :'ana') > 0, 'damage adds to the player''s statistic');
select ok((select military_xp from game.player_stats where user_id = :'ana') >= 100, 'Ana reached Militia I');
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_table_privilege('authenticated', 'game.battle_attacks', 'SELECT'), 'attacks are read through functions');
select ok(has_function_privilege('anon', 'public.get_battle(bigint)', 'EXECUTE'), 'anyone follows a battle');

select * from finish();
rollback;

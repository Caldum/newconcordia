-- H1 + H2: training centers, sessions per UTC day, fees and upgrades burned, strength and civil XP, injuries after
-- the gains, zero-health restrictions (spec sections 6, 7 and 8, ADR 0030).
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

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

create function pg_temp.gold(p_user uuid)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'citizen' and user_id = p_user and currency_code = 'GOLD'), 0);
$$;

select pg_temp.at('2026-11-07 10:00:00+00');
select set_config('game.fixed_random', '0.9', true);
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select game.post('test_fund', null, null, array[row(game.system_account('issuer', 'GOLD'),
                 game.citizen_account(:'ana', 'GOLD'), 10000, 'election_reward', null)::game.ledger_leg]);
select pg_temp.gold(:'ana') as gold0 \gset

-- Centers and the first sessions. --------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select results_eq(
  $$ select kind, level, trained_today, energy, fee, strength, upgrade_cost from public.get_my_training() $$,
  $$ values ('basic', 1, false, 10, 0::bigint, 5, 500::bigint), ('advanced', 1, false, 10, 50::bigint, 5, 500::bigint),
            ('elite', 1, false, 10, 150::bigint, 10, 500::bigint) $$,
  'three centers at N1, every session 10 energy (ADR 0047)'
);
select throws_ok($$ select * from public.train('gym') $$, '22023', 'center_invalid', 'Basic, Advanced or Elite');
select results_eq($$ select strength_gained, xp_gained, health_lost, energy from public.train('basic') $$,
                  $$ values (5, 5, 0, 90) $$, 'a Basic session: 10 energy, 5 strength, 5 civil XP');
select throws_ok($$ select * from public.train('basic') $$, '22023', 'already_trained', 'once per center and day');
select results_eq($$ select strength_gained, energy from public.train('advanced') $$, $$ values (5, 80) $$,
                  'Advanced: 10 energy, 5 strength at N1');
select results_eq($$ select strength_gained, energy from public.train('elite') $$, $$ values (10, 70) $$,
                  'Elite: 10 energy, 10 strength at N1');
reset role;
select is((select strength from game.player_stats where user_id = :'ana'), 20, 'strength adds up');
select is((select experience from game.player_stats where user_id = :'ana'), 20::bigint, 'civil XP is 1 per strength point');
select is(pg_temp.gold(:'ana'), :'gold0'::bigint - 200, 'the fees of 0.5 and 1.5 GOLD are paid');
select is((select sum(amount)::bigint from game.supply_changes where reason = 'training_fee'), 200::bigint, 'and burned');

-- A new day; upgrades. ----------------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-08 10:00:00+00');
select pg_temp.act_as(:'ana');
select is(public.upgrade_training_center('elite', '00000000-0000-0000-0000-0000000000f1'), 2, 'Elite rises to N2 for 5 GOLD');
select is(public.upgrade_training_center('elite', '00000000-0000-0000-0000-0000000000f1'), 2, 'once per key');
select is(public.upgrade_training_center('elite', gen_random_uuid()), 3, 'N3 for 10 GOLD');
select is(public.upgrade_training_center('elite', gen_random_uuid()), 4, 'N4 for 20 GOLD');
select is(public.upgrade_training_center('elite', gen_random_uuid()), 5, 'N5 for 40 GOLD');
select throws_ok($$ select public.upgrade_training_center('elite', gen_random_uuid()) $$, '22023', 'level_max', 'N5 is the top');
reset role;
select is(pg_temp.gold(:'ana'), :'gold0'::bigint - 200 - 7500, 'a center to N5 costs 75 GOLD');
select pg_temp.act_as(:'ana');
select results_eq($$ select strength_gained from public.train('elite') $$, $$ values (50) $$, 'Elite N5 gives 50 strength');
reset role;

-- Injuries come after the gains. --------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-09 10:00:00+00');
select set_config('game.fixed_random', '0.002', true);
select pg_temp.act_as(:'ana');
select results_eq($$ select strength_gained, health_lost, health from public.train('elite') $$, $$ values (50, 5, 95) $$,
                  'below 0.25 % at N5: the session counts and then 5 HP are lost');
select results_eq($$ select strength_gained, health_lost from public.train('basic') $$, $$ values (5, 0) $$,
                  'at N1 the chance is only 0.05 %');
select results_eq($$ select cause, reference, health_lost, health_after from public.list_my_injuries() $$,
                  $$ values ('training', 'elite', 5, 95) $$, 'the injury is logged');
reset role;

-- Zero health. -------------------------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-10 10:00:00+00');
update game.player_stats set health = 3 where user_id = :'ana';
select set_config('game.fixed_random', '0', true);
select pg_temp.act_as(:'ana');
select results_eq($$ select health_lost, health from public.train('advanced') $$, $$ values (3, 0) $$,
                  'an injury never takes health below zero');
select throws_ok($$ select * from public.train('basic') $$, '22023', 'health_zero', 'at zero health nobody trains');
reset role;
select game.put_goods(game.holder_for_citizen(:'ana'), 'kit_q1', 'ARG', 1, 'test', null);
select pg_temp.act_as(:'ana');
select results_eq($$ select healed, health from public.use_kit('kit_q1', gen_random_uuid()) $$, $$ values (5, 5) $$,
                  'but a personal kit still heals');
select results_eq($$ select strength_gained from public.train('basic') $$, $$ values (5) $$, 'and then training works again');
reset role;

-- Energy and money. ---------------------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-11 10:00:00+00');
select set_config('game.fixed_random', '0.9', true);
update game.player_stats set health = 100, energy = 5, energy_at = game.now() where user_id = :'ana';
select pg_temp.act_as(:'ana');
select throws_ok($$ select * from public.train('basic') $$, '22023', 'not_enough_energy', 'a session needs its energy');
reset role;
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_function_privilege('anon', 'public.train(text)', 'EXECUTE'), 'visitors do not train');
select ok(not has_table_privilege('authenticated', 'game.injuries', 'SELECT'), 'injuries are read through functions');

select * from finish();
rollback;

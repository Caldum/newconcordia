-- W4: resistance with ten distinct organizers burning 2 GOLD each, an immediate battle where the occupier defends,
-- the region returned to its previous owner and 5 GOLD to each organizer, exactly once (spec section 6, ADR 0034).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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

create function pg_temp.gold(p_user uuid)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'citizen' and user_id = p_user and currency_code = 'GOLD'), 0);
$$;

select set_config('game.fixed_now', '2026-11-08 10:00:00+00', true);
select set_config('game.fixed_random', '0.9', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, 'ARG-01')
where code in ('ARG', 'BRA', 'URY');

-- Argentina occupied BRA-01.
update game.regions set owner_country_code = 'ARG' where code = 'BRA-01';
insert into game.region_owner_changes (region_code, from_country_code, to_country_code, changed_at)
values ('BRA-01', 'BRA', 'ARG', '2026-11-07 19:00+00');

-- Ten organizers of several citizenships, and an eleventh.
create temp table organizers (n integer, user_id uuid);
insert into organizers
select n, pg_temp.new_player('org' || n || '@example.com', 'Organizador ' || n, case when n % 2 = 0 then 'BRA' else 'URY' end)
from generate_series(1, 11) as n;
grant select on organizers to authenticated;
select user_id as org1 from organizers where n = 1 \gset
select user_id as org10 from organizers where n = 10 \gset
select user_id as org11 from organizers where n = 11 \gset
select pg_temp.gold(:'org1') as gold_before \gset

select pg_temp.act_as(:'org1');
select throws_ok($$ select * from public.join_resistance('ARG-01', gen_random_uuid()) $$, '22023', 'not_occupied',
                 'only occupied regions resist');
select results_eq($$ select organizers, battle_id from public.join_resistance('BRA-01', gen_random_uuid()) $$,
                  $$ values (1, null::bigint) $$, 'the first organizer joins');
select throws_ok($$ select * from public.join_resistance('BRA-01', gen_random_uuid()) $$, '22023', 'already_organizer',
                 'organizers are distinct');
reset role;
select is(pg_temp.gold(:'org1'), :'gold_before'::bigint - 200, 'each organizer pays 2 GOLD');
select results_eq($$ select restore_country_code, occupier_country_code, organizers, needed from public.list_occupied_regions() $$,
                  $$ values ('BRA', 'ARG', 1, 10) $$, 'the region would return to Brazil');

-- Organizers 2 to 9, then the tenth starts the battle.
select pg_temp.act_as(:'org1');
reset role;
do $$
declare
  v_user uuid;
begin
  for v_user in select user_id from organizers where n between 2 and 9 order by n loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
    perform public.join_resistance('BRA-01', gen_random_uuid());
  end loop;
end;
$$;
select pg_temp.act_as(:'org10');
select results_eq($$ select organizers, battle_id is not null from public.join_resistance('BRA-01', gen_random_uuid()) $$,
                  $$ values (10, true) $$, 'the tenth organizer starts the battle at once');
reset role;
select id as battle from game.battles where region_code = 'BRA-01' and status = 'active' \gset
select results_eq(format('select kind, attacker_country_code, defender_country_code from game.battles where id = %s', :'battle'),
                  $$ values ('resistance', 'BRA', 'ARG') $$, 'the resistance attacks and the occupier defends');
select pg_temp.act_as(:'org11');
select throws_ok($$ select * from public.join_resistance('BRA-01', gen_random_uuid()) $$, '22023', 'battle_active',
                 'nobody joins while it fights');
reset role;
select results_eq($$ select direction, sum(amount)::bigint from game.supply_changes where reason = 'resistance_fee' group by direction $$,
                  $$ values ('burn', 2000::bigint) $$, 'the ten fees are burned: 20 GOLD');

-- The resistance wins rounds 1 to 5 (organizer 2 is Brazilian, fighting remotely).
select user_id as fighter from organizers where n = 2 \gset
do $$
declare
  v_hour integer;
  v_fighter uuid := (select user_id from organizers where n = 2);
  v_battle bigint := (select id from game.battles where region_code = 'BRA-01' and status = 'active');
begin
  for v_hour in 0 .. 4 loop
    perform set_config('game.fixed_now', (timestamptz '2026-11-08 10:10:00+00' + make_interval(hours => v_hour))::text, true);
    update game.player_stats set energy = 100, energy_at = game.now() where user_id = v_fighter;
    perform set_config('request.jwt.claims', json_build_object('sub', v_fighter, 'role', 'authenticated')::text, true);
    perform public.attack(v_battle, 'attacker', gen_random_uuid());
  end loop;
end;
$$;
select set_config('game.fixed_now', '2026-11-08 15:00:00+00', true);
select is(game.settle_battle(:'battle'), 'finished', 'five rounds and the battle ends');
select is((select winner from game.battles where id = :'battle'), 'attacker', 'the resistance won');
select is((select owner_country_code from game.regions where code = 'BRA-01'), 'BRA', 'the region returns to Brazil');
select is((select status from game.resistance_drives where battle_id = :'battle'), 'won', 'the drive is won');
select is(pg_temp.gold(:'org1'), :'gold_before'::bigint - 200 + 500, 'each organizer receives 5 GOLD');
select results_eq($$ select direction, sum(amount)::bigint from game.supply_changes where reason = 'resistance_reward' group by direction $$,
                  $$ values ('mint', 5000::bigint) $$, 'minted once for the ten organizers');
select is(game.settle_battle(:'battle'), 'finished', 'settling again changes nothing');
select is((select count(*)::integer from game.supply_changes where reason = 'resistance_reward'), 10, 'the rewards are paid once');
select is((select count(*)::integer from public.list_occupied_regions()), 0, 'no region is occupied now');

select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_function_privilege('anon', 'public.join_resistance(text, uuid)', 'EXECUTE'), 'visitors do not organize');

select * from finish();
rollback;

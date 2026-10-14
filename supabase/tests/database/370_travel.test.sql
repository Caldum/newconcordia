-- P2: travel priced by real distance, in the national currency at the recent GOLD rate or 500 per GOLD (ADR 0042).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code in ('ARG', 'ESP');
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'ARG') as bea \gset
update game.citizens set region_code = 'ARG-01' where user_id in (:'ana', :'juan', :'bea');
select game.region_distance_km('ARG-01', 'ARG-02') as km \gset
select game.citizen_account(:'ana', 'ARG') as ana_account \gset
select code as nearest from game.regions where code <> 'ARG-01' and is_enabled
  order by game.region_distance_km('ARG-01', code), code limit 1 \gset

-- Distances and prices. ------------------------------------------------------------------------------------------------
select ok(not exists (select 1 from game.regions where latitude is null or longitude is null),
  'every region has its centroid');
select ok(:km between 500 and 650, 'Buenos Aires to the Litoral is some 580 km');
select ok(game.region_distance_km('ARG-01', 'ESP-03') between 9800 and 10500, 'Buenos Aires to Madrid is some 10,000 km');
select is(game.region_distance_km('ESP-03', 'ARG-01'), game.region_distance_km('ARG-01', 'ESP-03'), 'both ways the same');
reset role;
select pg_temp.act_as(:'ana');
select results_eq($$ select enabled, gold_per_km, currency_code, rate, rate_from_market, region_code from public.get_travel_terms() $$,
  $$ values (true, 0.0001::numeric, 'ARG', 500::numeric, false, 'ARG-01') $$,
  'travel is open; without a recent market a GOLD is worth 500 of the currency');
select is((select price from public.list_travel_destinations() where region_code = 'ARG-02'), ceil(:km * 5)::bigint,
  'a trip costs 0.0001 GOLD per km at that rate, in hundredths');
select is((select region_code from public.list_travel_destinations() limit 1),
  :'nearest',
  'the nearest destination comes first');

-- Travelling. ---------------------------------------------------------------------------------------------------------
reset role;
select balance as before from game.accounts where id = :'ana_account' \gset
reset role;
select pg_temp.act_as(:'ana');
select is(public.travel('ARG-02', '11111111-1111-4111-8111-111111111111'), 'ARG-02', 'the citizen travels at once');
select is(public.travel('ARG-02', '11111111-1111-4111-8111-111111111111'), 'ARG-02', 'a retry with the same key is the same trip');
reset role;
select is((select balance from game.accounts where id = :'ana_account'), :before - ceil(:km * 5)::bigint,
  'the trip is paid once, in pesos');
select is((select region_code from game.citizens where user_id = :'ana'), 'ARG-02', 'the citizen is in the new region');
select is((select count(*)::integer from game.travel_events where user_id = :'ana'), 1, 'the trip is recorded');
select is((select sum(amount)::bigint from game.supply_changes where reason = 'travel' and direction = 'burn' and currency_code = 'ARG'),
  ceil(:km * 5)::bigint, 'and its money is burned');

-- The market's rate. -------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'bea');
select public.fx_post_offer('ARG', 'sell_gold', 10, 80000, gen_random_uuid()) as offer \gset
reset role;
select pg_temp.act_as(:'juan');
select lives_ok(format('select public.fx_take(%s, 10, gen_random_uuid())', :'offer'), 'someone buys GOLD at 800 pesos');
reset role;
select pg_temp.act_as(:'ana');
select results_eq($$ select rate, rate_from_market from public.get_travel_terms() $$, $$ values (800::numeric, true) $$,
  'the trip uses the average price of the last 6 hours');
select is((select price from public.list_travel_destinations() where region_code = 'ARG-01'), ceil(:km * 8)::bigint,
  'so travelling costs more');
select throws_ok($$ select public.travel('ESP-03', gen_random_uuid()) $$, '22023', 'insufficient_funds',
  'a trip the citizen cannot pay is refused');
reset role;
select set_config('game.fixed_now', '2026-11-07 17:00:00+00', true);
reset role;
select pg_temp.act_as(:'ana');
select is((select rate from public.get_travel_terms()), 500::numeric, 'after 6 hours without trades, back to 500');

select * from finish();
rollback;

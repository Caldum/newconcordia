-- The independence war, live: the strikes feed, the pulse per minute and the player's own share (ADR 0046).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

select set_config('game.fixed_random', '0.9', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code = 'ARG';
select pg_temp.new_player('admin@example.com', 'Admin Uno', 'ARG') as admin \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('eva@example.com', 'Eva Paz', 'ARG') as eva \gset
insert into game.admins (user_id) values (:'admin');
update game.player_stats set strength = 10 where user_id = :'juan';
update game.balance_params set value = 1 where key = 'independence_war_enabled';

select set_config('game.fixed_now', '2026-11-07 10:00:10+00', true);
select pg_temp.act_as(:'admin');
select public.admin_start_independence_war('ARG', 100000) as war \gset
reset role;
select pg_temp.act_as(:'ana');
select damage from public.independence_attack(:war, gen_random_uuid());
reset role;
select set_config('game.fixed_now', '2026-11-07 10:01:20+00', true);
select pg_temp.act_as(:'juan');
select damage from public.independence_attack(:war, gen_random_uuid());
reset role;
select set_config('game.fixed_now', '2026-11-07 10:01:40+00', true);
select pg_temp.act_as(:'ana');
select damage from public.independence_attack(:war, gen_random_uuid());
reset role;

-- The feed. ------------------------------------------------------------------------------------------------------------
select results_eq(format('select name, damage from public.independence_feed(%s)', :'war'),
  $$ values ('Ana Gómez', 10::bigint), ('Juan Pérez', 20::bigint), ('Ana Gómez', 10::bigint) $$,
  'the latest strikes come first, with who and how much');
select is((select count(*)::integer from public.independence_feed(:war, 2)), 2, 'as many as asked');
select is((select count(*)::integer from public.independence_feed(:war, 500)), 3, 'never more than 50');
select is((select count(*)::integer from public.independence_feed(:war + 1)), 0, 'another war has its own');
set local role anon;
select is((select count(*)::integer from public.independence_feed(:war)), 3, 'visitors watch it too');
reset role;

-- The pulse. -----------------------------------------------------------------------------------------------------------
select set_config('game.fixed_now', '2026-11-07 10:02:00+00', true);
select results_eq(format('select minute, damage, strikes, fighters from public.independence_pulse(%s)', :'war'),
  $$ values ('2026-11-07 10:00:00+00'::timestamptz, 10::bigint, 1, 1),
            ('2026-11-07 10:01:00+00'::timestamptz, 30::bigint, 2, 2) $$,
  'damage, strikes and fighters minute by minute');
select set_config('game.fixed_now', '2026-11-07 10:30:00+00', true);
select results_eq(format('select minute from public.independence_pulse(%s)', :'war'),
  $$ values ('2026-11-07 10:01:00+00'::timestamptz) $$, 'only the last 30 minutes');

-- My share. ------------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select results_eq(format('select damage, strikes, place, fighters from public.get_my_independence(%s)', :'war'),
  $$ values (20::bigint, 2, 1, 2) $$, 'Ana leads: 20 in two strikes, ties to whoever struck first');
reset role;
select pg_temp.act_as(:'eva');
select results_eq(format('select damage, strikes, place, fighters from public.get_my_independence(%s)', :'war'),
  $$ values (0::bigint, 0, null::integer, 2) $$, 'someone who has not fought has no place yet');
reset role;
set local role anon;
select throws_ok(format('select * from public.get_my_independence(%s)', :'war'), '42501', null, 'and visitors have no share');
reset role;

select * from finish();
rollback;

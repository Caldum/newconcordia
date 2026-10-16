-- W6: the independence war sandbox: off by default, opened by an audited admin, nationals only, the target ends it
-- early, 7 days at most, and the Liberating Hero title to the national with most damage (spec section 6, ADR 0036).
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
select set_config('game.fixed_random', '0.9', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code in ('ARG', 'BRA');

-- Staff accounts are never citizens (ADR 0049).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@example.com', now(), now(), now())
returning id as admin \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
insert into game.admins (user_id) values (:'admin');
update game.player_stats set strength = 10 where user_id = :'juan';

select pg_temp.act_as(:'admin');
select throws_ok($$ select public.admin_start_independence_war('ARG', 25) $$, '22023', 'feature_disabled', 'off by default');
reset role;
update game.balance_params set value = 1 where key = 'independence_war_enabled';
select pg_temp.act_as(:'ana');
select throws_ok($$ select public.admin_start_independence_war('ARG', 25) $$, '42501', 'not_admin', 'only admins open it');
reset role;
select pg_temp.act_as(:'admin');
select throws_ok($$ select public.admin_start_independence_war('ARG', 0) $$, '22023', 'amount_invalid', 'a positive target');
select public.admin_start_independence_war('ARG', 25) as war \gset
select throws_ok($$ select public.admin_start_independence_war('ARG', 25) $$, '22023', 'war_active', 'one at a time');
reset role;
select results_eq($$ select action, target from game.admin_log where action = 'start_independence_war' $$,
                  $$ values ('start_independence_war', 'ARG') $$, 'the admin action is audited');

select pg_temp.act_as(:'bea');
select throws_ok(format('select * from public.independence_attack(%s, gen_random_uuid())', :'war'), '42501', 'not_eligible',
                 'only nationals count');
reset role;
select pg_temp.act_as(:'ana');
select results_eq(format('select damage, energy, war_status from public.independence_attack(%s, %L)', :'war',
                         '00000000-0000-0000-0000-0000000000e9'),
                  $$ values (10::bigint, 90, 'active') $$, 'Ana''s 10 damage counts');
select results_eq(format('select damage, energy from public.independence_attack(%s, %L)', :'war',
                         '00000000-0000-0000-0000-0000000000e9'),
                  $$ values (10::bigint, 90) $$, 'once per key');
reset role;
select pg_temp.act_as(:'juan');
select results_eq(format('select damage, war_status from public.independence_attack(%s, gen_random_uuid())', :'war'),
                  $$ values (20::bigint, 'won') $$, 'Juan''s 20 reach the target of 25: the war is won early');
reset role;
select results_eq(format('select status, damage_total, hero_name from public.get_independence_war(%L)', 'ARG'),
                  $$ values ('won', 30::bigint, 'Juan Pérez') $$, 'the national with most damage is the hero');
select pg_temp.act_as(:'juan');
select results_eq($$ select title, country_code from public.list_my_titles() $$, $$ values ('liberating_hero', 'ARG') $$,
                  'a permanent title');
reset role;
select pg_temp.act_as(:'ana');
select throws_ok(format('select * from public.independence_attack(%s, gen_random_uuid())', :'war'), '22023', 'war_closed',
                 'nothing counts after the end');
reset role;

-- A war that runs out of time.
select pg_temp.act_as(:'admin');
select public.admin_start_independence_war('BRA', 100000) as war2 \gset
reset role;
select pg_temp.act_as(:'bea');
select lives_ok(format('select * from public.independence_attack(%s, gen_random_uuid())', :'war2'), 'Bea fights for Brazil');
reset role;
select set_config('game.fixed_now', '2026-11-14 09:59:00+00', true);
select is((game.hourly_world() ->> 'independence_wars_closed')::integer, 0, 'still open before 7 days');
select set_config('game.fixed_now', '2026-11-14 10:05:00+00', true);
select is((game.hourly_world() ->> 'independence_wars_closed')::integer, 1, 'the hourly job closes it after 7 days');
select results_eq(format('select status, hero_name from public.get_independence_war(%L)', 'BRA'),
                  $$ values ('expired', 'Bea Lima') $$, 'expired, and still with a hero');

select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_table_privilege('authenticated', 'game.independence_wars', 'SELECT'), 'wars are read through functions');

select * from finish();
rollback;

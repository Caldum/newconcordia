-- L2: notifications written with their events (player and country), unread counts, and daily balance telemetry
-- (ADR 0038).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

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
where code in ('ARG', 'BRA');
select pg_temp.new_player('admin@example.com', 'Admin Uno', 'ARG') as admin \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
insert into game.admins (user_id) values (:'admin');

select set_config('game.fixed_now', '2026-11-07 11:00:00+00', true);
select game.injure(:'ana', 'training', 'basic', 5);
insert into game.offices (country_code, office, user_id) values ('ARG', 'minister_health', :'ana');
insert into game.battles (region_code, attacker_country_code, defender_country_code, started_at)
values ('BRA-01', 'ARG', 'BRA', game.now()) returning id as battle \gset

select pg_temp.act_as(:'ana');
select results_eq($$ select kind from public.list_my_notifications() order by notification_id $$,
                  $$ values ('injury'), ('office_taken'), ('battle_started') $$,
                  'her injury, her office and her country''s battle');
select is(public.count_unread_notifications(), 3, 'three unread');
select lives_ok($$ select public.mark_notifications_seen() $$, 'she marks them seen');
select is(public.count_unread_notifications(), 0, 'none unread');
reset role;
select pg_temp.act_as(:'bea');
select results_eq($$ select kind, payload ->> 'attacker' from public.list_my_notifications() $$,
                  $$ values ('battle_started', 'ARG') $$, 'the defender''s citizens hear of the attack; not Ana''s injury');
reset role;

select set_config('game.fixed_now', '2026-11-07 17:00:00+00', true);
update game.battles set rounds_closed = 5, attacker_rounds = 5, status = 'finished', winner = 'attacker',
  finished_at = game.now() where id = :'battle';
select pg_temp.act_as(:'bea');
select results_eq($$ select kind, payload ->> 'winner', unread from public.list_my_notifications() limit 1 $$,
                  $$ values ('battle_finished', 'attacker', true) $$, 'and of its end: automatic news of the conquest');
reset role;
select is((select count(*)::integer from game.notifications where country_code is not null), 4,
          'one notification per country, not per citizen');
select is((select count(*)::integer from game.notifications where delivered_at is null), 6, 'all waiting in the outbox');

-- A new citizen does not get the country's old news.
select pg_temp.new_player('nuevo@example.com', 'Nuevo Recién', 'BRA') as nuevo \gset
-- Sign-up stamps the real clock; pin it to the game clock of this test.
update game.citizens set joined_at = game.now() + interval '1 minute', citizen_since = game.now() + interval '1 minute'
where user_id = :'nuevo';
select pg_temp.act_as(:'nuevo');
select is(public.count_unread_notifications(), 0, 'a new citizen starts with nothing to read');
reset role;

-- Telemetry.
select set_config('game.fixed_now', '2026-11-08 00:10:00+00', true);
select ok(game.take_economy_snapshot() > 0, 'yesterday''s snapshot is taken');
select is(game.take_economy_snapshot(), 0, 'once');
select pg_temp.act_as(:'admin');
select results_eq($$ select minted > 0, circulating > 0 from public.admin_economy_snapshots() where currency_code = 'GOLD' $$,
                  $$ values (true, true) $$, 'admins read GOLD minted and in hands');
reset role;
select pg_temp.act_as(:'ana');
select throws_ok($$ select * from public.admin_economy_snapshots() $$, '42501', 'not_admin', 'only admins');
reset role;

select * from finish();
rollback;

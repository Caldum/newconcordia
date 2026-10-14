-- L1: write rate limit per player and minute, anti-abuse signals recorded once, admin review audited (ADR 0037).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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

select set_config('game.fixed_now', '2026-11-07 10:00:30+00', true);
select pg_temp.new_player('admin@example.com', 'Admin Uno', 'ARG') as admin \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('anita@example.com', 'Anita Gómez', 'ARG') as anita \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
insert into game.admins (user_id) values (:'admin');

-- The rate limit. -------------------------------------------------------------------------------------------------------
update game.balance_params set value = 3 where key = 'rate_limit_writes_per_minute';
select pg_temp.act_as(:'ana');
select lives_ok($$ select public.check_request() $$, 'a first write passes');
select lives_ok($$ select public.check_request() $$, 'a second');
select lives_ok($$ select public.check_request() $$, 'a third');
select throws_ok($$ select public.check_request() $$, 'PT429', 'rate_limited', 'the fourth in the minute gets 429');
reset role;
select set_config('game.fixed_now', '2026-11-07 10:01:05+00', true);
select pg_temp.act_as(:'ana');
select lives_ok($$ select public.check_request() $$, 'a new minute starts again');
reset role;
select pg_temp.act_as(:'juan');
select lives_ok($$ select public.check_request() $$, 'each player has their own count');
reset role;
select set_config('request.jwt.claims', '', true);
select lives_ok($$ select public.check_request() $$, 'visitors are not counted');
select is((select count(*)::integer from game.request_counters where user_id = :'ana'), 2, 'one counter per player and minute');

-- Signals. ---------------------------------------------------------------------------------------------------------------
insert into auth.sessions (user_id, created_at, updated_at, ip) values
  (:'ana', game.now(), game.now(), '203.0.113.7'), (:'anita', game.now(), game.now(), '203.0.113.7'),
  (:'juan', game.now(), game.now(), '198.51.100.2');
select game.post('test_transfer', null, :'ana', array[row(game.citizen_account(:'ana', 'ARG'), game.citizen_account(:'anita', 'ARG'),
                 1000, 'transfer', null)::game.ledger_leg]);
update game.balance_params set value = 1000 where key = 'abuse_large_transfer';
select is(game.scan_abuse(), 2, 'the scan finds a shared address and a large transfer');
select is(game.scan_abuse(), 0, 'and records each signal once');
select results_eq($$ select kind from game.abuse_signals order by kind $$, $$ values ('large_transfer'), ('shared_ip') $$,
                  'the kinds');
select set_config('game.fixed_now', '2026-11-07 12:00:00+00', true);
select ok((game.hourly_world() ->> 'request_counters_removed')::integer >= 2, 'the hourly job removes old counters');

select id as signal from game.abuse_signals where kind = 'shared_ip' \gset
select pg_temp.act_as(:'ana');
select throws_ok($$ select * from public.admin_list_abuse_signals() $$, '42501', 'not_admin', 'only admins see signals');
reset role;
select pg_temp.act_as(:'admin');
select results_eq($$ select kind, user_name, other_name from public.admin_list_abuse_signals() where kind = 'shared_ip' $$,
                  $$ values ('shared_ip', 'Ana Gómez', 'Anita Gómez') $$, 'admins see the accounts, never the address');
select lives_ok(format('select public.admin_review_abuse_signal(%s, %L)', :'signal', 'Hermanas, misma casa'),
                'an admin reviews it');
reset role;
select is((select count(*)::integer from game.admin_log where action = 'review_abuse_signal'), 1, 'the review is audited');

select * from finish();
rollback;

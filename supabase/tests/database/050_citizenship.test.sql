-- D06: citizenship. Acceptance (GDD): an approved request grants citizenship; another without an answer is
-- approved on its own at 72 hours.
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

create function pg_temp.new_player(p_email text, p_name text, p_country text, p_waitlist text default null)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es')
            || coalesce(jsonb_build_object('waitlist_country_code', p_waitlist), '{}'),
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

set local game.fixed_now = '2026-10-08 15:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA', 'URY') as ana \gset
select pg_temp.new_player('pierre@example.com', 'Pierre Martin', 'FRA') as pierre \gset

-- Immediate citizenship with number, capital and dates.
select results_eq(
  $$ select country_code, region_code, citizen_number, joined_at, citizen_since
     from game.citizens where name = 'Camila Ríos' $$,
  $$ values ('ARG', 'ARG-01', 1, '2026-10-08 15:00:00+00'::timestamptz, '2026-10-08 15:00:00+00'::timestamptz) $$,
  'a new player is a citizen at once, numbered, living in the capital region'
);
select is((select citizen_number from game.citizens where name = 'Marcos Villalba'), 2, 'numbers follow in each country');
select is((select citizen_number from game.citizens where name = 'Ana Souza'), 1, 'each country counts its own citizens');
select is(game.citizen_code('ARG', 3413), 'ARG-003413', 'numbers print with the country and six digits');
select is(
  (select count(*) from game.countries where is_active and capital_region_code is null)::int,
  0,
  'every country in play has a capital region'
);

-- Adaptation period.
select is(game.war_damage_factor(:'camila'), 0.5, 'damage counts at half during the first 7 days');
select ok(not game.can_vote_in_elections(:'camila'), 'no voting in elections during the first 7 days');
set local game.fixed_now = '2026-10-15 15:00:00+00';
select is(game.war_damage_factor(:'camila'), 1.0, 'full damage after 7 days');
select ok(game.can_vote_in_elections(:'camila'), 'voting in elections after 7 days');
select ok(not game.can_vote_in_elections(gen_random_uuid()), 'someone without citizenship never votes');

-- Waitlist.
select results_eq(
  $$ select country_code from game.waitlist where user_id = (select user_id from game.citizens where name = 'Ana Souza') $$,
  $$ values ('URY') $$,
  'a sign-up can wait for a country that is not in play'
);
select throws_ok(
  $$ select pg_temp.new_player('x@example.com', 'Equis Ye', 'ARG', 'ESP') $$,
  '22023',
  'waitlist_country_invalid',
  'the waitlist only takes countries that are not in play'
);
select pg_temp.act_as(:'ana');
select results_eq(
  $$ select country_code, place from public.get_my_waitlist() $$,
  $$ values ('URY', 1) $$,
  'players see their place in line'
);
select is(public.count_waitlist('URY'), 1, 'anyone can see how many people wait');
reset role;

-- A change approved by the destination's Interior minister (acceptance, first half).
insert into game.offices (country_code, office, user_id) values ('ARG', 'interior_minister', :'marcos');
insert into game.offices (country_code, office, user_id) values ('FRA', 'president', :'pierre');

select pg_temp.act_as(:'pierre');
select results_eq(
  $$ select status from public.request_citizenship('ARG') $$,
  $$ values ('pending') $$,
  'a request to a country under review waits for an answer'
);
select throws_ok(
  $$ select * from public.request_citizenship('ESP') $$,
  '23505',
  'request_pending',
  'one pending request at a time'
);
select is(
  (select count(*) from public.list_citizenship_requests())::int,
  0,
  'only the destination''s officials see its requests'
);
reset role;
select id as pierre_request from game.citizenship_requests where user_id = :'pierre' \gset
select pg_temp.act_as(:'pierre');
select throws_ok(
  format('select public.decide_citizenship_request(%s, true)', :'pierre_request'),
  '42501',
  'not_allowed',
  'the requester cannot approve their own request'
);
reset role;

select pg_temp.act_as(:'marcos');
select results_eq(
  $$ select citizen_name, from_country_code from public.list_citizenship_requests() $$,
  $$ values ('Pierre Martin', 'FRA') $$,
  'the Interior minister sees the requests to the country'
);
select lives_ok(
  $$ select public.decide_citizenship_request((select request_id from public.list_citizenship_requests() limit 1), true) $$,
  'the Interior minister approves'
);
reset role;
select results_eq(
  $$ select country_code, region_code, citizen_number, citizen_since, last_change_at
     from game.citizens where name = 'Pierre Martin' $$,
  $$ values ('ARG', 'ARG-01', 3, '2026-10-15 15:00:00+00'::timestamptz, '2026-10-15 15:00:00+00'::timestamptz) $$,
  'an approved request grants the new citizenship with a new number'
);
select is(
  (select count(*) from game.offices where user_id = :'pierre')::int,
  0,
  'leaving a country leaves its offices'
);
select ok(not game.can_vote_in_elections(:'pierre'), 'after a change, elections wait 7 days again');

-- Limits.
select pg_temp.act_as(:'pierre');
select throws_ok($$ select * from public.request_citizenship('FRA') $$, '22023', 'change_too_soon', 'one change every 30 days');
select throws_ok($$ select * from public.request_citizenship('ARG') $$, '22023', 'same_country', 'not to the same country');
select throws_ok($$ select * from public.request_citizenship('URY') $$, '22023', 'country_not_in_play', 'only to countries in play');
reset role;

-- A request without an answer is approved at 72 hours (acceptance, second half).
select pg_temp.act_as(:'camila');
select results_eq($$ select status from public.request_citizenship('CHL') $$, $$ values ('pending') $$, 'Camila asks Chile');
reset role;
select is(
  (public.run_job('citizenship_timeouts', '2026-10-18 14:00:00+00') -> 'result' ->> 'approved')::int,
  0,
  'at 71 hours the request is still pending'
);
select is((select country_code from game.citizens where name = 'Camila Ríos'), 'ARG', 'still Argentine before 72 hours');
set local game.fixed_now = '2026-10-18 15:00:00+00';
select is(
  (public.run_job('citizenship_timeouts', '2026-10-18 15:00:00+00') -> 'result' ->> 'approved')::int,
  1,
  'at 72 hours the hourly job approves it'
);
select results_eq(
  $$ select country_code, region_code from game.citizens where name = 'Camila Ríos' $$,
  $$ values ('CHL', 'CHL-03') $$,
  'the request was approved on its own'
);
select is(
  (select decided_by from game.citizenship_requests where user_id = :'camila'),
  'timeout',
  'the record says it was approved for lack of an answer'
);

-- Automatic countries and the waitlist approve at once; players can withdraw.
update game.countries set citizenship_mode = 'automatic' where code = 'ESP';
select pg_temp.act_as(:'marcos');
select results_eq($$ select status from public.request_citizenship('ESP') $$, $$ values ('approved') $$,
  'a country with automatic citizenship approves at once');
reset role;
update game.countries set is_active = true, color = '#7BAFD4', official_name_es = 'República Oriental del Uruguay',
  official_name_en = 'Oriental Republic of Uruguay', capital_region_code = 'ARG-01' where code = 'URY';
select pg_temp.act_as(:'ana');
select results_eq($$ select status from public.request_citizenship('URY') $$, $$ values ('approved') $$,
  'a player who waited moves at once when the country opens');
select is((select count(*) from public.get_my_waitlist())::int, 0, 'and leaves the waitlist');
reset role;
set local game.fixed_now = '2026-12-01 15:00:00+00';
select pg_temp.act_as(:'pierre');
select ok((select status from public.request_citizenship('BRA')) = 'pending', 'Pierre asks Brazil a month later');
select lives_ok($$ select public.cancel_citizenship_request() $$, 'a player withdraws a pending request');
reset role;

select * from finish();
rollback;

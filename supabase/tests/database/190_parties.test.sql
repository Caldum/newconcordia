-- G1: parties, membership, donations and the party leaders' election (spec sections 2 and 3, ADR 0024).
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

insert into game.mint_reasons (kind, authority, description) values ('test', 'system_reward', 'Test funding.');

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
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

create function pg_temp.at(p_at text)
returns void
language sql
as $$
  select set_config('game.fixed_now', p_at, true);
$$;

select pg_temp.at('2026-11-02 10:00:00+00');

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('lucia@example.com', 'Lucía Paz', 'ARG') as lucia \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset
select game.system_account('sink', 'GOLD') as sink_gold \gset

-- Founding: 50 GOLD burned; the founder is member and leader. ------------------------------------------
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.found_party('Frente Federal', 'Las provincias primero', gen_random_uuid()) $$,
  '22023', 'insufficient_funds', 'the 5 GOLD of the grant do not found a party'
);
reset role;
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'camila', 'GOLD'), 10000, 'test', null);
select balance as sink_before from game.accounts where id = :'sink_gold' \gset
select pg_temp.act_as(:'camila');
select public.found_party('Frente Federal', 'Las provincias primero', 'f1000000-0000-4000-8000-000000000001') as party \gset
select is(
  public.found_party('Frente Federal', 'Las provincias primero', 'f1000000-0000-4000-8000-000000000001'),
  :'party'::bigint,
  'the same request founds once'
);
select results_eq(
  $$ select party_id::text, is_leader from public.get_my_party() $$,
  format($$ values (%L, true) $$, :'party'),
  'the founder is a member and the leader'
);
select throws_ok(
  $$ select public.found_party('Otro Partido', '', gen_random_uuid()) $$,
  '22023', 'already_in_party', 'one party at a time'
);
reset role;
select is((select balance from game.accounts where id = :'sink_gold') - :'sink_before'::bigint, 5000::bigint, '50 GOLD were burned');
select is(
  (select count(*)::integer from game.supply_changes where reason = 'party_founding'),
  1,
  'the burn is recorded'
);
select pg_temp.act_as(:'marcos');
select throws_ok(
  $$ select public.found_party('frente federal', '', gen_random_uuid()) $$,
  '22023', 'party_name_taken', 'names are unique per country, whatever the case'
);
select throws_ok(
  $$ select public.found_party('FF', '', gen_random_uuid()) $$,
  '22023', 'party_name_invalid', 'a name has 3 to 40 characters'
);
reset role;
select results_eq(
  format($$ select registration_closes_at, voting_starts_at, voting_ends_at, takes_office_at from game.elections where party_id = %s $$, :'party'),
  $$ values ('2026-11-14 00:00+00'::timestamptz, '2026-11-15 00:00+00'::timestamptz, '2026-11-16 00:00+00'::timestamptz, '2026-11-16 12:00+00'::timestamptz) $$,
  'the leader election: vote on day 15 (UTC), candidacies close 24 h before, office on day 16 at 12:00'
);

-- Membership. -------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select throws_ok(format($$ select public.join_party(%s) $$, :'party'), '42501', 'not_national', 'only citizens of the party''s country join');
reset role;
select pg_temp.act_as(:'marcos');
select lives_ok(format($$ select public.join_party(%s) $$, :'party'), 'a citizen joins');
select lives_ok(format($$ select public.join_party(%s) $$, :'party'), 'joining again changes nothing');
reset role;
select pg_temp.at('2026-11-02 10:05:00+00');
select pg_temp.act_as(:'lucia');
select public.join_party(:'party');
select results_eq(
  format($$ select name, is_leader from public.list_party_members(%s) $$, :'party'),
  $$ values ('Camila Ríos', true), ('Marcos Villalba', false), ('Lucía Paz', false) $$,
  'members, leader first then by seniority'
);
reset role;

-- Donations: GOLD or the national currency, from citizens of the country. ------------------------------------
select pg_temp.act_as(:'marcos');
select public.donate_to_party(:'party', 'ARG', 1000, gen_random_uuid());
select throws_ok(
  format($$ select public.donate_to_party(%s, 'BRA', 100, gen_random_uuid()) $$, :'party'),
  '22023', 'currency_invalid', 'only GOLD or the party''s national currency'
);
reset role;
select pg_temp.act_as(:'ana');
select throws_ok(
  format($$ select public.donate_to_party(%s, 'GOLD', 100, gen_random_uuid()) $$, :'party'),
  '42501', 'not_national', 'foreigners do not fund parties'
);
reset role;
select results_eq(
  $$ select name, members, gold, credit from public.list_parties('ARG') $$,
  $$ values ('Frente Federal', 3, 0::bigint, 1000::bigint) $$,
  'the party''s funds are public'
);

-- Candidacies until 24 h before the vote. ---------------------------------------------------------------
select pg_temp.act_as(:'marcos');
select public.register_candidacy() as marcos_c \gset
reset role;
select pg_temp.at('2026-11-03 10:00:00+00');
select pg_temp.act_as(:'camila');
select public.register_candidacy() as camila_c \gset
reset role;
select pg_temp.at('2026-11-14 00:00:00+00');
select pg_temp.act_as(:'lucia');
select throws_ok($$ select public.register_candidacy() $$, '22023', 'registration_closed', 'candidacies close 24 h before the vote');
reset role;
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG') as pedro \gset
select pg_temp.act_as(:'pedro');
select public.join_party(:'party');
reset role;

-- The vote: an immutable snapshot of members from before candidacies closed. ------------------------------------
select pg_temp.at('2026-11-15 01:00:00+00');
select game.job_elections('2026-11-15 01:00:00+00');
select results_eq(
  format($$ select status from game.elections where party_id = %s and period = '2026-11-01' $$, :'party'),
  $$ values ('voting') $$,
  'the vote opened'
);
select is(
  (select count(*)::integer from game.election_voters as v join game.elections as e on e.id = v.election_id
   where e.party_id = :'party' and e.period = '2026-11-01'),
  3,
  'three members may vote; whoever joined after candidacies closed may not'
);
select pg_temp.act_as(:'lucia');
select lives_ok(format($$ select public.vote(%s) $$, :'marcos_c'), 'a member votes');
select throws_ok(format($$ select public.vote(%s) $$, :'camila_c'), '22023', 'already_voted', 'one ballot each');
select results_eq(
  format($$ select name, votes from public.list_candidates((select election_id from public.get_party_election(%s))) $$, :'party'),
  $$ values ('Marcos Villalba', null::integer), ('Camila Ríos', null::integer) $$,
  'votes stay secret while voting, candidates by seniority'
);
reset role;
select pg_temp.act_as(:'pedro');
select throws_ok(format($$ select public.vote(%s) $$, :'marcos_c'), '42501', 'not_eligible_voter', 'late members are not in the snapshot');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote(:'marcos_c');
reset role;
select pg_temp.act_as(:'camila');
select public.vote(:'camila_c');
reset role;

-- Closing, validation and proclamation on day 16 at 12:00. ---------------------------------------------------
select pg_temp.at('2026-11-16 06:00:00+00');
select game.job_elections('2026-11-16 06:00:00+00');
select results_eq(
  format($$ select status from game.elections where party_id = %s and period = '2026-11-01' $$, :'party'),
  $$ values ('validation') $$,
  'after the vote, 12 hours of validation'
);
select is((select leader_user_id from game.parties where id = :'party'), :'camila'::uuid, 'the outgoing leader keeps the office meanwhile');
select pg_temp.at('2026-11-16 12:00:00+00');
select game.job_elections('2026-11-16 12:00:00+00');
select is((select leader_user_id from game.parties where id = :'party'), :'marcos'::uuid, 'the winner takes office on day 16 at 12:00');
select results_eq(
  format($$ select name, votes, elected from public.list_candidates(%s) $$,
         (select election_id from game.candidacies where id = :'marcos_c')),
  $$ values ('Marcos Villalba', 2, true), ('Camila Ríos', 1, false) $$,
  'the result is public once proclaimed'
);
select ok(
  exists (select 1 from game.elections where party_id = :'party' and period = '2026-12-01'),
  'the next month''s election is open'
);

-- A tie goes to the oldest candidacy. -----------------------------------------------------------------------
select pg_temp.at('2026-12-01 09:00:00+00');
select pg_temp.act_as(:'lucia');
select public.register_candidacy() as lucia_c \gset
reset role;
select pg_temp.at('2026-12-02 09:00:00+00');
select pg_temp.act_as(:'pedro');
select public.register_candidacy() as pedro_c \gset
select lives_ok($$ select public.withdraw_candidacy() $$, 'a candidate withdraws');
select public.register_candidacy();
reset role;
select pg_temp.at('2026-12-15 10:00:00+00');
select game.job_elections('2026-12-15 10:00:00+00');
select pg_temp.act_as(:'camila');
select public.vote(:'lucia_c');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote(:'pedro_c');
reset role;
select pg_temp.at('2026-12-16 12:00:00+00');
select game.job_elections('2026-12-16 12:00:00+00');
select is((select leader_user_id from game.parties where id = :'party'), :'lucia'::uuid, 'one vote each: the older candidacy wins');

-- Leaving: a leader who leaves is replaced by the member with most civil XP. -------------------------------------
select game.add_civil_xp(:'pedro', 900);
select pg_temp.act_as(:'lucia');
select lives_ok($$ select public.leave_party() $$, 'the leader leaves');
select throws_ok($$ select public.leave_party() $$, '22023', 'not_in_party', 'and is no longer a member');
reset role;
select is((select leader_user_id from game.parties where id = :'party'), :'pedro'::uuid, 'the member with most civil XP leads');

-- Changing country loses the party. ---------------------------------------------------------------------
update game.citizens set country_code = 'BRA' where user_id = :'pedro';
select ok(not exists (select 1 from game.party_memberships where user_id = :'pedro'), 'a citizen who changes country leaves the party');
select ok((select leader_user_id from game.parties where id = :'party') in (:'camila'::uuid, :'marcos'::uuid), 'and the leadership passes on');

-- A party nobody belongs to has no leader until someone joins. --------------------------------------------------
select pg_temp.act_as(:'camila');
select public.leave_party();
reset role;
select pg_temp.act_as(:'marcos');
select public.leave_party();
reset role;
select is((select leader_user_id from game.parties where id = :'party'), null, 'an empty party has no leader');
select pg_temp.act_as(:'lucia');
select public.join_party(:'party');
select results_eq($$ select is_leader from public.get_my_party() $$, $$ values (true) $$, 'the first to join leads it');
reset role;

-- Money and privacy. ---------------------------------------------------------------------------------------
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_function_privilege('anon', 'public.vote(bigint)', 'EXECUTE'), 'visitors cannot vote');
select ok(not has_function_privilege('anon', 'public.found_party(text, text, uuid)', 'EXECUTE'), 'nor found parties');
select ok(not has_table_privilege('authenticated', 'game.ballots', 'SELECT'), 'ballots are never readable directly');

select * from finish();
rollback;

-- G3: offices, one per person, atomic succession, resignations, removal for inactivity, impeachment and the
-- minister reward (spec section 2, ADR 0026).
begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

create function pg_temp.new_player(p_email text, p_name text, p_country text, p_xp bigint)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at,
                          updated_at, last_sign_in_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
          now(), now(), now(), '2026-11-07 09:00+00')
  returning id into v_id;
  perform game.add_civil_xp(v_id, p_xp);
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

create function pg_temp.holder(p_country text, p_office text)
returns text
language sql
as $$
  select c.name from game.offices as o join game.citizens as c on c.user_id = o.user_id
  where o.country_code = p_country and o.office = p_office;
$$;

select pg_temp.at('2026-11-07 10:00:00+00');

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG', 22500) as camila \gset
select pg_temp.new_player('lucia@example.com', 'Lucía Paz', 'ARG', 22500) as lucia \gset
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG', 10000) as pedro \gset
select pg_temp.new_player('sofia@example.com', 'Sofía Díaz', 'ARG', 22500) as sofia \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG', 10000) as juan \gset
select pg_temp.new_player('nuevo@example.com', 'Nuevo Recién', 'ARG', 0) as nuevo \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG', 22500) as marcos \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG', 10000) as elena \gset
select pg_temp.new_player('raul@example.com', 'Raúl Ortiz', 'ARG', 11000) as raul \gset
select pg_temp.new_player('tomas@example.com', 'Tomás Luna', 'ARG', 10000) as tomas \gset

-- Two parties, a president and vice president, and a Congress of three from two lists. -------------------------
insert into game.parties (country_code, name, founder_user_id, leader_user_id, founded_at)
values ('ARG', 'Frente Federal', :'camila', :'camila', game.now()) returning id as frente \gset
insert into game.parties (country_code, name, founder_user_id, leader_user_id, founded_at)
values ('ARG', 'Unión Cívica', :'marcos', :'marcos', game.now()) returning id as union_c \gset
insert into game.party_memberships (user_id, party_id, joined_at)
select u, :'frente', game.now() from unnest(array[:'camila', :'lucia', :'pedro', :'elena', :'tomas']::uuid[]) as u;
insert into game.party_memberships (user_id, party_id, joined_at)
select u, :'union_c', game.now() from unnest(array[:'marcos', :'raul', :'sofia']::uuid[]) as u;

insert into game.offices (country_code, office, user_id) values ('ARG', 'president', :'camila'), ('ARG', 'vice_president', :'lucia');
insert into game.mandates (country_code, office, user_id, party_id, began_at)
values ('ARG', 'president', :'camila', :'frente', game.now()), ('ARG', 'vice_president', :'lucia', :'frente', game.now());

insert into game.elections (kind, country_code, period, registration_opens_at, registration_closes_at, voting_starts_at,
                            voting_ends_at, takes_office_at, status, proclaimed_at, seats)
select 'congress', 'ARG', '2026-10-01', c.registration_opens_at, c.registration_closes_at, c.voting_starts_at,
       c.voting_ends_at, c.takes_office_at, 'proclaimed', c.takes_office_at, 3
from game.election_calendar('congress', '2026-10-01') as c
returning id as congress \gset
insert into game.candidacies (election_id, party_id, registered_at) values (:'congress', :'frente', game.now()) returning id as list_a \gset
insert into game.candidacies (election_id, party_id, registered_at) values (:'congress', :'union_c', game.now()) returning id as list_b \gset
insert into game.party_list_members (candidacy_id, position, user_id) values
  (:'list_a', 1, :'elena'), (:'list_a', 2, :'tomas'),
  (:'list_b', 1, :'marcos'), (:'list_b', 2, :'raul'), (:'list_b', 3, :'sofia');
insert into game.mandates (country_code, office, user_id, party_id, election_id, began_at) values
  ('ARG', 'congress', :'elena', :'frente', :'congress', game.now()),
  ('ARG', 'congress', :'marcos', :'union_c', :'congress', game.now()),
  ('ARG', 'congress', :'raul', :'union_c', :'congress', game.now());

-- Appointments: the president names ministers (level 10) and the governor (level 15), one office each. --------
select pg_temp.act_as(:'lucia');
select throws_ok($$ select public.appoint_minister('economy', 'Pedro Gil') $$, '42501', 'not_president', 'only the president appoints');
reset role;
select pg_temp.act_as(:'camila');
select lives_ok($$ select public.appoint_minister('economy', 'Pedro Gil') $$, 'the president appoints a minister');
select throws_ok($$ select public.appoint_minister('interior', 'Juan Pérez') $$, '22023', 'office_invalid', 'five ministries only');
select throws_ok($$ select public.appoint_minister('health', 'Nuevo Recién') $$, '22023', 'level_too_low', 'ministers need civil level 10');
select throws_ok($$ select public.appoint_minister('health', 'Marcos Villalba') $$, '22023', 'office_incompatible', 'a member of Congress cannot also be minister');
select throws_ok($$ select public.appoint_minister('health', 'Pedro Gil') $$, '22023', 'office_incompatible', 'nor one minister two ministries');
select throws_ok($$ select public.appoint_governor('Juan Pérez') $$, '22023', 'level_too_low', 'the governor needs civil level 15');
select lives_ok($$ select public.appoint_governor('Sofía Díaz') $$, 'the president appoints the governor');
select lives_ok($$ select public.appoint_minister('health', 'Juan Pérez') $$, 'a minister needs no party');
select lives_ok($$ select public.appoint_minister('economy', 'Tomás Luna') $$, 'appointing another minister replaces the first');
reset role;
select is(pg_temp.holder('ARG', 'minister_economy'), 'Tomás Luna', 'Tomás leads Economy');
select ok(game.national_office(:'pedro') is null, 'and Pedro has no office left');
select pg_temp.act_as(:'camila');
select lives_ok($$ select public.dismiss_official('economy') $$, 'the president dismisses a minister');
select throws_ok($$ select public.dismiss_official('economy') $$, 'P0002', 'no_office', 'a vacant ministry cannot be dismissed');
select public.appoint_minister('economy', 'Pedro Gil');
reset role;
select results_eq(
  $$ select office, name from public.get_cabinet('ARG') $$,
  $$ values ('president', 'Camila Ríos'), ('vice_president', 'Lucía Paz'), ('minister_economy', 'Pedro Gil'),
            ('minister_health', 'Juan Pérez'), ('central_bank_governor', 'Sofía Díaz') $$,
  'the cabinet in order'
);

-- Locks of the executive. ------------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.resign_office() $$, '22023', 'resignation_needs_congress', 'the president cannot simply resign');
select throws_ok($$ select * from public.request_citizenship('BRA') $$, '42501', 'office_locks_citizenship', 'nor change citizenship in office');
reset role;
select pg_temp.act_as(:'lucia');
select throws_ok($$ select public.leave_party() $$, '42501', 'office_locks_party', 'nor can the vice president change party');
reset role;

-- A seat left in Congress goes to the next on the same list. -------------------------------------------------------
select pg_temp.act_as(:'elena');
select is(public.resign_office(), 'congress', 'a member of Congress resigns at once');
reset role;
select results_eq(
  $$ select name, party_name from public.list_congress('ARG') order by name $$,
  $$ values ('Marcos Villalba', 'Unión Cívica'), ('Raúl Ortiz', 'Unión Cívica'), ('Tomás Luna', 'Frente Federal') $$,
  'Tomás, next on the Frente''s list, takes the seat'
);

-- Resignation of the vice president: Congress approves by simple majority with quorum. ------------------------------
select pg_temp.act_as(:'lucia');
select public.request_resignation() as resignation \gset
select throws_ok($$ select public.request_resignation() $$, '22023', 'motion_open', 'one open motion per person and kind');
reset role;
select pg_temp.act_as(:'pedro');
select throws_ok(format($$ select public.vote_motion(%s, 'yes') $$, :'resignation'), '42501', 'not_in_congress', 'only members of Congress vote');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_motion(:'resignation', 'yes');
select throws_ok(format($$ select public.vote_motion(%s, 'no') $$, :'resignation'), '22023', 'already_voted', 'one vote per member');
reset role;
select pg_temp.act_as(:'raul');
select public.vote_motion(:'resignation', 'yes');
reset role;
select pg_temp.act_as(:'tomas');
select public.vote_motion(:'resignation', 'no');
reset role;
select pg_temp.at('2026-11-08 09:00:00+00');
select game.job_elections('2026-11-08 09:00:00+00');
select is(pg_temp.holder('ARG', 'vice_president'), 'Lucía Paz', 'the vote lasts 24 hours');
select pg_temp.at('2026-11-08 10:05:00+00');
select game.job_elections('2026-11-08 10:05:00+00');
select results_eq(
  format($$ select status, yes, no, abstain from game.congress_motions where id = %s $$, :'resignation'),
  $$ values ('approved', 2, 1, 0) $$,
  'two yes against one no: the resignation is accepted'
);
select is(pg_temp.holder('ARG', 'vice_president'), 'Pedro Gil', 'succession: the minister with a party and most XP becomes vice president');
select is(pg_temp.holder('ARG', 'minister_economy'), null, 'and his ministry is left vacant');
select results_eq(
  $$ select name, choice from public.list_motion_votes((select id from game.congress_motions where kind = 'resignation')) $$,
  $$ values ('Marcos Villalba', 'yes'), ('Raúl Ortiz', 'yes'), ('Tomás Luna', 'no') $$,
  'the roll call is public'
);

-- Impeachment: yes from 2/3 of all members. ----------------------------------------------------------------------
select pg_temp.act_as(:'pedro');
select throws_ok($$ select public.propose_impeachment() $$, '42501', 'not_in_congress', 'only members of Congress propose it');
reset role;
select pg_temp.act_as(:'tomas');
select public.propose_impeachment() as failed_impeachment \gset
select public.vote_motion(:'failed_impeachment', 'yes');
reset role;
select pg_temp.at('2026-11-09 10:05:00+00');
select game.job_elections('2026-11-09 10:05:00+00');
select is((select status from game.congress_motions where id = :'failed_impeachment'), 'rejected', 'one yes of three is not enough');
select pg_temp.act_as(:'marcos');
select public.propose_impeachment() as impeachment \gset
select public.vote_motion(:'impeachment', 'yes');
reset role;
select pg_temp.act_as(:'raul');
select public.vote_motion(:'impeachment', 'yes');
reset role;
select pg_temp.at('2026-11-10 10:05:00+00');
select game.job_elections('2026-11-10 10:05:00+00');
select is(pg_temp.holder('ARG', 'president'), 'Pedro Gil', 'two of three impeach: the vice president becomes president');
select is(pg_temp.holder('ARG', 'vice_president'), 'Marcos Villalba', 'without ministers with a party, the member of Congress with most XP is vice president');
select results_eq(
  $$ select name from public.list_congress('ARG') order by name $$,
  $$ values ('Raúl Ortiz'), ('Tomás Luna') $$,
  'his seat stays vacant: the rest of his list hold offices'
);

-- Removal for 72 hours of inactivity: an absolute majority of all members. -----------------------------------------
update auth.users set last_sign_in_at = '2026-11-10 08:00+00' where id = :'pedro';
select pg_temp.act_as(:'raul');
select throws_ok($$ select public.propose_removal('president') $$, '22023', 'not_inactive', 'only after 72 hours without signing in');
reset role;
update auth.users set last_sign_in_at = '2026-11-06 10:00+00' where id = :'pedro';
select pg_temp.act_as(:'raul');
select public.propose_removal('president') as removal \gset
select public.vote_motion(:'removal', 'yes');
reset role;
select pg_temp.act_as(:'tomas');
select public.vote_motion(:'removal', 'abstain');
reset role;
select pg_temp.at('2026-11-11 10:05:00+00');
select game.job_elections('2026-11-11 10:05:00+00');
select is((select status from game.congress_motions where id = :'removal'), 'rejected', 'one yes of two members is not an absolute majority');
select is(pg_temp.holder('ARG', 'president'), 'Pedro Gil', 'the president stays');

-- The exceptional succession: nobody with a party and level 10 left. ------------------------------------------------
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA', 100) as bea \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA', 400) as ana \gset
insert into game.offices (country_code, office, user_id) values ('BRA', 'president', :'bea');
select game.vacate_executive('BRA', 'president');
select is(pg_temp.holder('BRA', 'president'), 'Ana Souza', 'the national with most civil XP takes the presidency');
select is(
  (select reason from game.succession_events where user_id = :'ana' and office = 'president'),
  'exception',
  'recorded as an exceptional succession'
);
select is(pg_temp.holder('BRA', 'vice_president'), 'Bea Lima', 'and the vice presidency is never left vacant');

-- Ministers earn 5 GOLD per full month in office. ---------------------------------------------------------------------
select pg_temp.at('2027-01-08 10:05:00+00');
select game.job_elections('2027-01-08 10:05:00+00');
select is(
  (select months_rewarded from game.mandates where user_id = :'juan' and office = 'minister_health' and ended_at is null),
  2,
  'two full months, two rewards'
);
select game.job_elections('2027-01-08 11:05:00+00');
select is(
  (select count(*)::integer from game.supply_changes where reason = 'election_reward'),
  2,
  'and never twice'
);

-- Money and privileges. --------------------------------------------------------------------------------------------
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_function_privilege('anon', 'public.appoint_minister(text, text)', 'EXECUTE'), 'visitors appoint nobody');
select ok(not has_function_privilege('anon', 'public.vote_motion(bigint, text)', 'EXECUTE'), 'nor vote motions');
select ok(not has_table_privilege('authenticated', 'game.congress_motions', 'SELECT'), 'motions are read through functions');

select * from finish();
rollback;

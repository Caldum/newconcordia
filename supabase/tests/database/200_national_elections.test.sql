-- G2: Congress by D'Hondt (day 25) and the presidential ticket (day 5), with fees, snapshot, seats and rewards
-- (spec sections 2 and 3, ADR 0025).
begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

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

create function pg_temp.gold(p_account bigint)
returns bigint
language sql
as $$
  select balance from game.accounts where id = p_account;
$$;

select pg_temp.at('2026-11-07 10:00:00+00');

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('lucia@example.com', 'Lucía Paz', 'ARG') as lucia \gset
select pg_temp.new_player('sofia@example.com', 'Sofía Díaz', 'ARG') as sofia \gset
select pg_temp.new_player('pedro@example.com', 'Pedro Gil', 'ARG') as pedro \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('nuevo@example.com', 'Nuevo Recién', 'ARG') as nuevo \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset
-- Levels 15 (22,500 XP), 10 (10,000) and 5 (2,500); Nuevo stays at 0.
select game.add_civil_xp(u, 22500) from unnest(array[:'camila', :'marcos', :'lucia', :'sofia']::uuid[]) as u;
select game.add_civil_xp(:'pedro', 10000), game.add_civil_xp(:'juan', 2500);
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(u, 'GOLD'), 20000, 'test', null)
from unnest(array[:'camila', :'marcos']::uuid[]) as u;

select pg_temp.act_as(:'camila');
select public.found_party('Frente Federal', '', gen_random_uuid()) as frente \gset
select public.donate_to_party(:'frente', 'GOLD', 5000, gen_random_uuid());
reset role;
select pg_temp.at('2026-11-07 10:01:00+00');
select pg_temp.act_as(:'marcos');
select public.found_party('Unión Cívica', '', gen_random_uuid()) as union_c \gset
select public.donate_to_party(:'union_c', 'GOLD', 5000, gen_random_uuid());
reset role;
select pg_temp.act_as(:'lucia');
select public.join_party(:'frente');
reset role;
select pg_temp.act_as(:'pedro');
select public.join_party(:'frente');
reset role;
select pg_temp.act_as(:'juan');
select public.join_party(:'frente');
reset role;
select pg_temp.act_as(:'sofia');
select public.join_party(:'union_c');
reset role;
select game.party_account(:'frente', 'GOLD') as frente_gold \gset
select game.treasury_account('ARG', 'GOLD') as treasury_gold \gset

-- Congress: party lists, 10 GOLD each (5 to the treasury, 5 burned). --------------------------------------------
select pg_temp.act_as(:'lucia');
select throws_ok(
  $$ select public.register_party_list(array['Lucía Paz']) $$,
  '42501', 'not_party_leader', 'only the party leader registers its list'
);
reset role;
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.register_party_list(array['Camila Ríos', 'Juan Pérez']) $$,
  '22023', 'level_too_low', 'list candidates need civil level 10'
);
select throws_ok(
  $$ select public.register_party_list(array['Camila Ríos', 'Sofía Díaz']) $$,
  '22023', 'candidate_invalid', 'only members of the party'
);
reset role;
select pg_temp.gold(:'treasury_gold') as treasury_before \gset
select pg_temp.act_as(:'camila');
select public.register_party_list(array['Camila Ríos', 'Lucía Paz', 'Pedro Gil']) as frente_list \gset
select is(
  public.register_party_list(array['Camila Ríos', 'Lucía Paz', 'Pedro Gil']),
  :'frente_list'::bigint,
  'registering again changes the list without paying again'
);
reset role;
select is(pg_temp.gold(:'frente_gold'), 4000::bigint, 'the party paid 10 GOLD for its list');
select is(pg_temp.gold(:'treasury_gold') - :'treasury_before'::bigint, 500::bigint, '5 of them to the treasury');
select pg_temp.act_as(:'marcos');
select public.register_party_list(array['Marcos Villalba', 'Sofía Díaz']) as union_list \gset
reset role;

-- The snapshot when candidacies close: voters of level ≥ 5, seats from the active ones. -------------------------
update auth.users set last_sign_in_at = '2026-11-20 10:00+00';
update auth.users set last_sign_in_at = '2026-11-10 10:00+00' where id = :'juan';
update game.balance_params set value = 2 where key = 'congress_min_seats';
update game.balance_params set value = 1 where key = 'congress_citizens_per_seat';
select pg_temp.at('2026-11-24 01:00:00+00');
select game.job_elections('2026-11-24 01:00:00+00');
select id as congress from game.elections where kind = 'congress' and country_code = 'ARG' and period = '2026-11-01' \gset
select is((select count(*)::integer from game.election_voters where election_id = :'congress'), 6, 'six nationals of level 5 or more may vote');
select results_eq(
  format($$ select active_citizens, seats from game.elections where id = %s $$, :'congress'),
  $$ values (5, 5) $$,
  'seats are max(min, floor(A / per seat)) with A the voters active in the last 7 days'
);
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.register_party_list(array['Camila Ríos']) $$, '22023', 'registration_closed', 'lists close 24 h before the vote');
reset role;

-- The vote on day 25. -------------------------------------------------------------------------------------------
select pg_temp.at('2026-11-25 01:00:00+00');
select game.job_elections('2026-11-25 01:00:00+00');
select pg_temp.act_as(:'camila');
select public.vote(:'frente_list');
reset role;
select pg_temp.act_as(:'lucia');
select public.vote(:'frente_list');
reset role;
select pg_temp.act_as(:'pedro');
select public.vote(:'frente_list');
reset role;
select pg_temp.act_as(:'juan');
select public.vote(:'frente_list');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote(:'union_list');
reset role;
select pg_temp.act_as(:'sofia');
select public.vote(:'union_list');
reset role;
select pg_temp.act_as(:'nuevo');
select throws_ok(format($$ select public.vote(%s) $$, :'frente_list'), '42501', 'not_eligible_voter', 'civil level 5 to vote');
reset role;
select pg_temp.act_as(:'ana');
select throws_ok(format($$ select public.vote(%s) $$, :'frente_list'), '42501', 'not_eligible_voter', 'only nationals vote');
reset role;
select results_eq(
  format($$ select party_name, votes, seats from public.list_party_lists(%s) $$, :'congress'),
  $$ values ('Frente Federal', null::integer, null::integer), ('Unión Cívica', null::integer, null::integer) $$,
  'results stay secret while voting'
);

-- Proclamation on day 26 at 12:00: D'Hondt, 5 seats, 4 votes to 2. ------------------------------------------------
select pg_temp.at('2026-11-26 12:00:00+00');
select game.job_elections('2026-11-26 12:00:00+00');
select results_eq(
  format($$ select party_name, votes, seats from public.list_party_lists(%s) $$, :'congress'),
  $$ values ('Frente Federal', 4, 3), ('Unión Cívica', 2, 1) $$,
  'quotients 4, 2, 2, 1.33, 1: four seats to the Frente (the tie to the older party), one to the Unión'
);
select results_eq(
  $$ select seats from game.dhondt((select id from game.elections where kind = 'congress' and period = '2026-11-01' and country_code = 'ARG'), 5) order by 1 desc $$,
  $$ values (4), (1) $$,
  'acceptance: D''Hondt gives 4 and 1'
);
select results_eq(
  $$ select name, party_name from public.list_congress('ARG') $$,
  $$ values ('Camila Ríos', 'Frente Federal'), ('Lucía Paz', 'Frente Federal'), ('Pedro Gil', 'Frente Federal'), ('Marcos Villalba', 'Unión Cívica') $$,
  'a list with fewer candidates than seats leaves the rest vacant'
);
update game.balance_params set value = 0.4 where key = 'congress_threshold';
select results_eq(
  format($$ select candidacy_id, seats from game.dhondt(%s, 5) order by seats desc $$, :'congress'),
  format($$ values (%s::bigint, 5), (%s::bigint, 0) $$, :'frente_list', :'union_list'),
  'a list under the threshold of valid votes gets no seats'
);
update game.balance_params set value = 0.01 where key = 'congress_threshold';
select is(
  (select count(*)::integer from game.supply_changes where reason = 'election_reward'),
  4,
  'each elected member of Congress got 5 GOLD'
);

-- The presidency: a ticket of two members of level 15, 20 GOLD (10 to the treasury, 10 burned). ---------------------
select pg_temp.at('2026-11-26 13:00:00+00');
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.register_ticket('Camila Ríos', 'Pedro Gil') $$,
  '22023', 'level_too_low', 'both need civil level 15'
);
select throws_ok(
  $$ select public.register_ticket('Camila Ríos', 'Camila Ríos') $$,
  '22023', 'candidate_invalid', 'two different people'
);
select throws_ok(
  $$ select public.register_ticket('Camila Ríos', 'Sofía Díaz') $$,
  '22023', 'candidate_invalid', 'both members of the party'
);
reset role;
select pg_temp.gold(:'treasury_gold') as treasury_before \gset
select pg_temp.act_as(:'camila');
select public.register_ticket('Camila Ríos', 'Lucía Paz') as frente_ticket \gset
reset role;
select is(pg_temp.gold(:'frente_gold'), 2000::bigint, 'the party paid 20 GOLD');
select is(pg_temp.gold(:'treasury_gold') - :'treasury_before'::bigint, 1000::bigint, '10 of them to the treasury');
select pg_temp.at('2026-11-26 14:00:00+00');
select pg_temp.act_as(:'marcos');
select public.register_ticket('Marcos Villalba', 'Sofía Díaz') as union_ticket \gset
reset role;
select results_eq(
  $$ select registration_closes_at, voting_starts_at, takes_office_at from public.get_national_election('ARG', 'president') $$,
  $$ values ('2026-12-04 00:00+00'::timestamptz, '2026-12-05 00:00+00'::timestamptz, '2026-12-06 12:00+00'::timestamptz) $$,
  'the presidential vote is on day 5, office on day 6 at 12:00'
);

select pg_temp.at('2026-12-04 01:00:00+00');
select game.job_elections('2026-12-04 01:00:00+00');
select pg_temp.at('2026-12-05 01:00:00+00');
select game.job_elections('2026-12-05 01:00:00+00');
select pg_temp.act_as(:'camila');
select public.vote(:'frente_ticket');
reset role;
select pg_temp.act_as(:'lucia');
select public.vote(:'frente_ticket');
reset role;
select pg_temp.act_as(:'pedro');
select public.vote(:'frente_ticket');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote(:'union_ticket');
reset role;
select pg_temp.act_as(:'sofia');
select public.vote(:'union_ticket');
reset role;
select pg_temp.act_as(:'juan');
select public.vote(:'union_ticket');
reset role;
select pg_temp.act_as(:'juan');
select results_eq(
  $$ select ballots, i_voted, i_can_vote from public.get_national_election('ARG', 'president') $$,
  $$ values (6, true, false) $$,
  'six ballots; who voted cannot vote again'
);
reset role;
select pg_temp.gold(game.citizen_account(:'camila', 'GOLD')) as camila_gold \gset
select pg_temp.at('2026-12-06 12:00:00+00');
select game.job_elections('2026-12-06 12:00:00+00');
select results_eq(
  $$ select office, name, party_name from public.get_government('ARG') $$,
  $$ values ('president', 'Camila Ríos', 'Frente Federal'), ('vice_president', 'Lucía Paz', 'Frente Federal') $$,
  'three votes each: the older ticket wins and takes office on day 6 at 12:00'
);
select ok(game.holds_office(:'camila', 'ARG', array['president']), 'the president holds the office');
select is(pg_temp.gold(game.citizen_account(:'camila', 'GOLD')) - :'camila_gold'::bigint, 1000::bigint, 'the president got 10 GOLD');
select results_eq(
  $$ select name from public.list_congress('ARG') $$,
  $$ values ('Pedro Gil'), ('Marcos Villalba') $$,
  'president and vice president leave their seats in Congress'
);
select results_eq(
  format($$ select party_name, votes, elected from public.list_tickets(%s) $$,
         (select election_id from game.candidacies where id = :'frente_ticket')),
  $$ values ('Frente Federal', 3, true), ('Unión Cívica', 3, false) $$,
  'the result is public'
);

-- Two elected terms in a row, then one out. ---------------------------------------------------------------------
insert into game.elections (kind, country_code, period, registration_opens_at, registration_closes_at,
                            voting_starts_at, voting_ends_at, takes_office_at, status, proclaimed_at, snapshot_at)
select 'president', 'ARG', '2026-11-01', c.registration_opens_at, c.registration_closes_at, c.voting_starts_at,
       c.voting_ends_at, c.takes_office_at, 'proclaimed', c.takes_office_at, c.registration_closes_at
from game.election_calendar('president', '2026-11-01') as c
returning id as november \gset
insert into game.mandates (country_code, office, user_id, party_id, election_id, began_at, ended_at)
values ('ARG', 'president', :'camila', :'frente', :'november', '2026-11-06 12:00+00', '2026-12-06 12:00+00');
select pg_temp.at('2026-12-07 10:00:00+00');
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.register_ticket('Camila Ríos', 'Lucía Paz') $$,
  '22023', 'term_limit', 'after two elected terms in a row the president sits one out'
);
select lives_ok($$ select public.register_ticket('Lucía Paz', 'Camila Ríos') $$, 'but may run as vice president');
select lives_ok($$ select public.withdraw_party_candidacy('president') $$, 'a ticket can be withdrawn while candidacies are open');
select throws_ok($$ select public.withdraw_party_candidacy('president') $$, 'P0002', 'candidacy_not_found', 'only once');
reset role;
select is(pg_temp.gold(:'frente_gold'), 0::bigint, 'the fee is not returned');
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.register_ticket('Lucía Paz', 'Camila Ríos') $$,
  '22023', 'insufficient_funds', 'registering again pays again'
);
reset role;

-- Money and privacy. -----------------------------------------------------------------------------------------------
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);
select ok(not has_function_privilege('anon', 'public.register_ticket(text, text)', 'EXECUTE'), 'visitors cannot register tickets');
select ok(not has_function_privilege('anon', 'public.register_party_list(text[])', 'EXECUTE'), 'nor lists');
select ok(not has_table_privilege('authenticated', 'game.mandates', 'SELECT'), 'mandates are read through functions');

select * from finish();
rollback;

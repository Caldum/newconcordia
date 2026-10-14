-- G2 · National elections: the presidential ticket (day 5) and Congress by D'Hondt (day 25), on the generic
-- elections of G1 (spec sections 2 and 3, ADR 0025).
--
-- elections            + snapshot_at, active_citizens and seats (Congress)
-- candidacies          + party_id and running_mate_user_id: a party's ticket or list; user_id is the
--                        presidential candidate and stays null for a list
-- game.party_list_members  a list's candidates in order
-- game.mandates        who was elected to what and when (president, vice president, Congress); G3 adds
--                      succession
-- game.offices         gains the president and vice president on proclamation (it already had them)
-- Registration opens when the previous election of the same kind takes office and closes 24 h before the
-- vote; the voter snapshot (nationals of civil level ≥ 5) and the seats `max(8, floor(A/50))` are taken
-- when candidacies close.
-- public.register_ticket, withdraw_ticket, register_party_list, withdraw_party_list, get_national_election,
--   list_tickets, list_party_lists, get_government, list_congress, get_last_national_election
--
-- Errors (ADR 0005): not_party_leader, candidate_invalid, level_too_low, term_limit, registration_closed,
-- candidacy_not_found, insufficient_funds, plus those of G1.
--
-- Rollback: drop the public functions created here; restore game.election_calendar, game.advance_election
-- and game.job_elections from 20261016090000; drop game.mandates, game.party_list_members, the candidacies
-- columns party_id and running_mate_user_id (after deleting national candidacies, their ballots and voters)
-- restoring candidacies.user_id not null, the elections columns snapshot_at, active_citizens and seats; delete
-- the national elections, the election_reward mint reason and the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('election_vote_day_president', 5, 'Day of the month (UTC) of the presidential election.'),
  ('election_vote_day_congress', 25, 'Day of the month (UTC) of the congressional election.'),
  ('voter_civil_level', 5, 'Civil level to vote in national elections.'),
  ('president_civil_level', 15, 'Civil level to run for president or vice president.'),
  ('congress_civil_level', 10, 'Civil level to stand on a party list for Congress (ADR 0025).'),
  ('president_consecutive_terms', 2, 'Elected presidential terms in a row before one out.'),
  ('presidential_ticket_gold', 2000, 'GOLD hundredths a party pays for its presidential ticket.'),
  ('presidential_ticket_treasury', 1000, 'Of the ticket price, GOLD hundredths to the treasury; the rest is burned.'),
  ('party_list_gold', 1000, 'GOLD hundredths a party pays for its list for Congress.'),
  ('party_list_treasury', 500, 'Of the list price, GOLD hundredths to the treasury; the rest is burned.'),
  ('congress_min_seats', 8, 'Seats in Congress at least.'),
  ('congress_citizens_per_seat', 50, 'Active citizens per seat above the minimum.'),
  ('congress_active_days', 7, 'Days since the last sign-in for a citizen to count as active.'),
  ('congress_threshold', 0.01, 'Share of valid votes a list needs to get seats.'),
  ('reward_president_gold', 1000, 'GOLD hundredths for the elected president.'),
  ('reward_vice_president_gold', 500, 'GOLD hundredths for the elected vice president.'),
  ('reward_congress_gold', 500, 'GOLD hundredths for each elected member of Congress.');

insert into game.mint_reasons (kind, authority, description) values
  ('election_reward', 'system_reward', 'Reward for the elected president, vice president and members of Congress.');

-- Schema ------------------------------------------------------------------------------------------------

alter table game.elections add column snapshot_at timestamptz;
alter table game.elections add column active_citizens integer check (active_citizens >= 0);
alter table game.elections add column seats integer check (seats >= 0);
comment on column game.elections.seats is 'Seats in play (Congress), fixed with the snapshot.';

-- A list has no single candidate: its candidates are in game.party_list_members.
-- squawk-ignore ban-drop-not-null
alter table game.candidacies alter column user_id drop not null;
-- squawk-ignore adding-foreign-key-constraint
alter table game.candidacies add column party_id bigint references game.parties (id);
-- squawk-ignore adding-foreign-key-constraint
alter table game.candidacies add column running_mate_user_id uuid references game.citizens (user_id);
alter table game.candidacies add column seats integer check (seats >= 0);
comment on column game.candidacies.party_id is 'The party of a ticket or a list; null for a party leader candidacy.';
-- squawk-ignore require-concurrent-index-creation
create unique index candidacies_party_key on game.candidacies (election_id, party_id) where party_id is not null;
-- squawk-ignore require-concurrent-index-creation
create index candidacies_running_mate_idx on game.candidacies (running_mate_user_id) where running_mate_user_id is not null;

create table game.party_list_members (
  candidacy_id bigint not null references game.candidacies (id),
  position integer not null check (position >= 1),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  primary key (candidacy_id, position),
  unique (candidacy_id, user_id)
);
alter table game.party_list_members enable row level security;
comment on table game.party_list_members is 'A party list for Congress, in order.';
create index party_list_members_user_idx on game.party_list_members (user_id);

create table game.mandates (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  office text not null check (office in ('president', 'vice_president', 'congress')),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  party_id bigint references game.parties (id),
  election_id bigint references game.elections (id),
  elected boolean not null default true,
  began_at timestamptz not null,
  ended_at timestamptz,
  constraint mandates_dates check (ended_at is null or ended_at >= began_at)
);
alter table game.mandates enable row level security;
comment on table game.mandates is 'Who held each elected office and when; elected = false for succession (G3).';
create index mandates_current_idx on game.mandates (country_code, office) where ended_at is null;
create index mandates_user_idx on game.mandates (user_id);
create index mandates_election_idx on game.mandates (election_id);
create index mandates_party_idx on game.mandates (party_id) where party_id is not null;

-- Calendar ------------------------------------------------------------------------------------------------

-- Registration opens when the previous election of the same kind takes office.
create or replace function game.election_calendar(p_kind text, p_period date)
returns table (
  registration_opens_at timestamptz, registration_closes_at timestamptz, voting_starts_at timestamptz,
  voting_ends_at timestamptz, takes_office_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with d as (
    select game.param('election_vote_day_' || p_kind)::integer - 1 as day_offset,
           make_interval(hours => game.param('election_registration_lead_hours')::integer) as lead,
           make_interval(hours => game.param('election_vote_hours')::integer) as vote,
           make_interval(hours => game.param('election_validation_hours')::integer) as validation
  ),
  v as (
    select (p_period + d.day_offset)::timestamp at time zone 'UTC' as starts,
           ((p_period - interval '1 month')::date + d.day_offset)::timestamp at time zone 'UTC' as previous_starts,
           d.lead, d.vote, d.validation
    from d
  )
  select v.previous_starts + v.vote + v.validation, v.starts - v.lead, v.starts, v.starts + v.vote,
         v.starts + v.vote + v.validation
  from v;
$$;

-- The national election of a kind that still takes candidacies at p_at. Created on first use.
create function game.national_election(p_country_code text, p_kind text, p_at timestamptz default game.now())
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_period date := date_trunc('month', p_at at time zone 'UTC')::date;
  v_cal record;
  v_id bigint;
begin
  select * into v_cal from game.election_calendar(p_kind, v_period);
  if p_at >= v_cal.registration_closes_at then
    v_period := (v_period + interval '1 month')::date;
    select * into v_cal from game.election_calendar(p_kind, v_period);
  end if;
  insert into game.elections (kind, country_code, period, registration_opens_at, registration_closes_at,
                              voting_starts_at, voting_ends_at, takes_office_at)
  values (p_kind, p_country_code, v_period, v_cal.registration_opens_at, v_cal.registration_closes_at,
          v_cal.voting_starts_at, v_cal.voting_ends_at, v_cal.takes_office_at)
  on conflict (kind, country_code, coalesce(party_id, 0), period) do nothing;
  select id into v_id from game.elections
  where kind = p_kind and country_code = p_country_code and party_id is null and period = v_period;
  return v_id;
end;
$$;

-- Snapshot ---------------------------------------------------------------------------------------------------

-- Who may vote, frozen when candidacies close: the party's members for a leader election; for a national one
-- the nationals of civil level ≥ voter_civil_level, and the seats from those active in the last days.
create function game.take_snapshot(p_election game.elections)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_active integer;
begin
  if p_election.kind = 'party_leader' then
    insert into game.election_voters (election_id, user_id)
    select p_election.id, m.user_id from game.party_memberships as m
    where m.party_id = p_election.party_id and m.joined_at < p_election.registration_closes_at
    on conflict do nothing;
  else
    insert into game.election_voters (election_id, user_id)
    select p_election.id, c.user_id
    from game.citizens as c
    join game.player_stats as s on s.user_id = c.user_id
    where c.country_code = p_election.country_code
      and game.level_for_experience(s.experience) >= game.param('voter_civil_level')
    on conflict do nothing;
  end if;
  if p_election.kind = 'congress' then
    select count(*)::integer into v_active
    from game.election_voters as v
    join auth.users as u on u.id = v.user_id
    where v.election_id = p_election.id
      and u.last_sign_in_at >= p_election.registration_closes_at - make_interval(days => game.param('congress_active_days')::integer);
    update game.elections
    set active_citizens = v_active,
        seats = greatest(game.param('congress_min_seats')::integer,
                         floor(v_active / game.param('congress_citizens_per_seat'))::integer)
    where id = p_election.id;
  end if;
  update game.elections set snapshot_at = game.now() where id = p_election.id;
end;
$$;

-- Rewards -----------------------------------------------------------------------------------------------------

create function game.election_reward(p_election_id bigint, p_user_id uuid, p_office text, p_param text)
returns void
language sql
set search_path = ''
as $$
  select game.post(
    'election_reward', 'election_reward:' || p_election_id::text || ':' || p_office || ':' || p_user_id::text, null,
    array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(p_user_id, 'GOLD'),
              game.param(p_param)::bigint, 'election_reward', null)::game.ledger_leg]
  );
$$;

-- Proclamations ---------------------------------------------------------------------------------------------------

create function game.proclaim_party_leader(p_election game.elections)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_winner game.candidacies;
begin
  -- The most votes win; ties go to the oldest candidacy. A candidate who left the party cannot win.
  select c.* into v_winner from game.candidacies as c
  join game.party_memberships as m on m.user_id = c.user_id and m.party_id = p_election.party_id
  where c.election_id = p_election.id and c.withdrawn_at is null and c.votes > 0
  order by c.votes desc, c.registered_at, c.id
  limit 1;
  if found then
    update game.candidacies set elected = true where id = v_winner.id;
    update game.parties set leader_user_id = v_winner.user_id where id = p_election.party_id;
  end if;
end;
$$;

create function game.proclaim_president(p_election game.elections)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_winner game.candidacies;
  v_now timestamptz := game.now();
begin
  -- The most votes win; ties go to the oldest ticket. Both must still be nationals and members of its party.
  select c.* into v_winner from game.candidacies as c
  join game.citizens as p on p.user_id = c.user_id and p.country_code = p_election.country_code
  join game.citizens as vp on vp.user_id = c.running_mate_user_id and vp.country_code = p_election.country_code
  join game.party_memberships as pm on pm.user_id = c.user_id and pm.party_id = c.party_id
  join game.party_memberships as vm on vm.user_id = c.running_mate_user_id and vm.party_id = c.party_id
  where c.election_id = p_election.id and c.withdrawn_at is null and c.votes > 0
  order by c.votes desc, c.registered_at, c.id
  limit 1;
  if not found then
    return;  -- The outgoing authorities stay.
  end if;
  update game.candidacies set elected = true where id = v_winner.id;
  update game.mandates set ended_at = v_now
  where country_code = p_election.country_code and office in ('president', 'vice_president') and ended_at is null;
  insert into game.mandates (country_code, office, user_id, party_id, election_id, began_at) values
    (p_election.country_code, 'president', v_winner.user_id, v_winner.party_id, p_election.id, v_now),
    (p_election.country_code, 'vice_president', v_winner.running_mate_user_id, v_winner.party_id, p_election.id, v_now);
  delete from game.offices
  where country_code = p_election.country_code and office in ('president', 'vice_president');
  -- Nobody holds two national offices: the winners leave any other they had, Congress included.
  delete from game.offices where user_id in (v_winner.user_id, v_winner.running_mate_user_id);
  update game.mandates set ended_at = v_now
  where office = 'congress' and ended_at is null and user_id in (v_winner.user_id, v_winner.running_mate_user_id);
  insert into game.offices (country_code, office, user_id, since) values
    (p_election.country_code, 'president', v_winner.user_id, v_now),
    (p_election.country_code, 'vice_president', v_winner.running_mate_user_id, v_now);
  perform game.election_reward(p_election.id, v_winner.user_id, 'president', 'reward_president_gold');
  perform game.election_reward(p_election.id, v_winner.running_mate_user_id, 'vice_president', 'reward_vice_president_gold');
end;
$$;

-- D'Hondt: each list's votes divided by 1, 2, 3…; the highest quotients take the seats. Lists under the
-- threshold of valid votes get none; equal quotients go to the oldest party, then the lower id.
create function game.dhondt(p_election_id bigint, p_seats integer)
returns table (candidacy_id bigint, seats integer)
language sql
stable
set search_path = ''
as $$
  with lists as (
    select c.id, c.votes, p.founded_at, p.id as party_id
    from game.candidacies as c
    join game.parties as p on p.id = c.party_id
    where c.election_id = p_election_id and c.withdrawn_at is null and c.votes > 0
  ),
  valid as (select coalesce(sum(votes), 0) as total from lists),
  eligible as (
    select l.* from lists as l, valid
    where l.votes::numeric >= valid.total * game.param('congress_threshold')
  ),
  quotients as (
    select e.id, e.votes::numeric / d as quotient, e.founded_at, e.party_id
    from eligible as e
    cross join generate_series(1, greatest(p_seats, 0)) as d
  ),
  winners as (
    select q.id from quotients as q
    order by q.quotient desc, q.founded_at, q.party_id
    limit greatest(p_seats, 0)
  )
  select l.id, (select count(*)::integer from winners as w where w.id = l.id)
  from lists as l;
$$;
comment on function game.dhondt(bigint, integer) is 'Seats per list by D''Hondt with the threshold; ties by party seniority.';

create function game.proclaim_congress(p_election game.elections)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := game.now();
  v_list record;
  v_member record;
  v_taken integer;
begin
  update game.candidacies as c set seats = 0 where c.election_id = p_election.id;
  update game.mandates set ended_at = v_now
  where country_code = p_election.country_code and office = 'congress' and ended_at is null;
  for v_list in select d.candidacy_id, d.seats from game.dhondt(p_election.id, coalesce(p_election.seats, 0)) as d where d.seats > 0 loop
    v_taken := 0;
    -- In list order, skipping who left the party or the country or holds the presidency; seats a list cannot
    -- fill stay vacant.
    for v_member in
      select lm.user_id, c.party_id
      from game.party_list_members as lm
      join game.candidacies as c on c.id = lm.candidacy_id
      join game.citizens as ci on ci.user_id = lm.user_id and ci.country_code = p_election.country_code
      join game.party_memberships as m on m.user_id = lm.user_id and m.party_id = c.party_id
      where lm.candidacy_id = v_list.candidacy_id
        and not exists (select 1 from game.offices as o
                        where o.user_id = lm.user_id and o.office in ('president', 'vice_president'))
      order by lm.position
    loop
      exit when v_taken >= v_list.seats;
      insert into game.mandates (country_code, office, user_id, party_id, election_id, began_at)
      values (p_election.country_code, 'congress', v_member.user_id, v_member.party_id, p_election.id, v_now);
      perform game.election_reward(p_election.id, v_member.user_id, 'congress', 'reward_congress_gold');
      v_taken := v_taken + 1;
    end loop;
    update game.candidacies set seats = v_taken, elected = v_taken > 0 where id = v_list.candidacy_id;
  end loop;
end;
$$;

-- Advancing ----------------------------------------------------------------------------------------------------

create or replace function game.advance_election(p_election_id bigint)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_e game.elections;
  v_now timestamptz := game.now();
begin
  select * into v_e from game.elections where id = p_election_id for update;
  if v_e.snapshot_at is null and v_e.status = 'registration' and v_now >= v_e.registration_closes_at then
    perform game.take_snapshot(v_e);
    select * into v_e from game.elections where id = p_election_id;
  end if;
  if v_e.status = 'registration' and v_now >= v_e.voting_starts_at then
    v_e.status := 'voting';
  end if;
  if v_e.status = 'voting' and v_now >= v_e.voting_ends_at then
    v_e.status := 'validation';
  end if;
  if v_e.status = 'validation' and v_now >= v_e.takes_office_at then
    update game.candidacies as c
    set votes = (select count(*)::integer from game.ballots as b where b.candidacy_id = c.id)
    where c.election_id = v_e.id;
    case v_e.kind
      when 'party_leader' then perform game.proclaim_party_leader(v_e);
      when 'president' then perform game.proclaim_president(v_e);
      else perform game.proclaim_congress(v_e);
    end case;
    v_e.status := 'proclaimed';
    v_e.proclaimed_at := v_now;
  end if;
  update game.elections set status = v_e.status, proclaimed_at = v_e.proclaimed_at where id = v_e.id;
  return v_e.status;
end;
$$;
comment on function game.advance_election(bigint) is 'Snapshot, open, close, tally and proclaim as the clock allows.';

create or replace function game.job_elections(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_advanced integer := 0;
  v_party record;
  v_country record;
begin
  for v_id in
    select id from game.elections
    where status <> 'proclaimed' and (registration_closes_at <= game.now())
    order by id
  loop
    perform game.advance_election(v_id);
    v_advanced := v_advanced + 1;
  end loop;
  -- Every party and every country in play always has an election taking candidacies.
  for v_party in select id from game.parties loop
    perform game.party_election(v_party.id);
  end loop;
  for v_country in select code from game.countries where is_active loop
    perform game.national_election(v_country.code, 'president');
    perform game.national_election(v_country.code, 'congress');
  end loop;
  return jsonb_build_object('advanced', v_advanced);
end;
$$;

-- Candidacies ---------------------------------------------------------------------------------------------------

-- The caller's party, which they must lead.
create function game.require_party_leader(p_citizen game.citizens)
returns game.parties
language plpgsql
stable
set search_path = ''
as $$
declare
  v_party game.parties;
begin
  select p.* into v_party from game.parties as p
  join game.party_memberships as m on m.party_id = p.id and m.user_id = p_citizen.user_id
  where p.leader_user_id = p_citizen.user_id;
  if not found then
    raise exception 'not_party_leader' using errcode = '42501';
  end if;
  return v_party;
end;
$$;

-- A member of the party, national, with the civil level; null name or anyone else refused.
create function game.party_candidate(p_party game.parties, p_name text, p_level_param text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user uuid;
  v_experience bigint;
begin
  select c.user_id, s.experience into v_user, v_experience
  from game.citizens as c
  join game.party_memberships as m on m.user_id = c.user_id and m.party_id = p_party.id
  join game.player_stats as s on s.user_id = c.user_id
  where lower(c.name) = lower(btrim(coalesce(p_name, ''))) and c.country_code = p_party.country_code;
  if v_user is null then
    raise exception 'candidate_invalid' using errcode = '22023';
  end if;
  if game.level_for_experience(v_experience) < game.param(p_level_param) then
    raise exception 'level_too_low' using errcode = '22023';
  end if;
  return v_user;
end;
$$;

-- Opens, or reopens, the party's candidacy in a national election, paying its fee from the party's GOLD when
-- it was not active. Returns the candidacy.
create function game.open_party_candidacy(p_party game.parties, p_kind text, p_actor uuid)
returns game.candidacies
language plpgsql
set search_path = ''
as $$
declare
  v_election game.elections;
  v_election_id bigint := game.national_election(p_party.country_code, p_kind);
  v_candidacy game.candidacies;
  v_price bigint := game.param(case p_kind when 'president' then 'presidential_ticket_gold' else 'party_list_gold' end)::bigint;
  v_treasury bigint := game.param(case p_kind when 'president' then 'presidential_ticket_treasury' else 'party_list_treasury' end)::bigint;
begin
  select * into v_election from game.elections where id = v_election_id for update;
  if game.now() < v_election.registration_opens_at or game.now() >= v_election.registration_closes_at then
    raise exception 'registration_closed' using errcode = '22023';
  end if;
  select * into v_candidacy from game.candidacies where election_id = v_election.id and party_id = p_party.id;
  if found and v_candidacy.withdrawn_at is null then
    return v_candidacy;
  end if;
  perform game.post(
    case p_kind when 'president' then 'presidential_ticket' else 'party_list' end,
    'candidacy_fee:' || v_election.id::text || ':' || p_party.id::text || ':' || clock_timestamp()::text, p_actor,
    array[
      row(game.party_account(p_party.id, 'GOLD'), game.treasury_account(p_party.country_code, 'GOLD'), v_treasury,
          'candidacy_fee', null)::game.ledger_leg,
      row(game.party_account(p_party.id, 'GOLD'), game.system_account('sink', 'GOLD'), v_price - v_treasury,
          'candidacy_fee', null)::game.ledger_leg
    ]
  );
  if v_candidacy.id is null then
    insert into game.candidacies (election_id, party_id, registered_at)
    values (v_election.id, p_party.id, game.now())
    returning * into v_candidacy;
  else
    update game.candidacies set withdrawn_at = null, registered_at = game.now()
    where id = v_candidacy.id
    returning * into v_candidacy;
  end if;
  return v_candidacy;
end;
$$;

create function public.register_ticket(p_president text, p_vice_president text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party game.parties := game.require_party_leader(v_citizen);
  v_president uuid := game.party_candidate(v_party, p_president, 'president_civil_level');
  v_vice uuid := game.party_candidate(v_party, p_vice_president, 'president_civil_level');
  v_candidacy game.candidacies;
  v_period date;
begin
  if v_president = v_vice then
    raise exception 'candidate_invalid' using errcode = '22023';
  end if;
  v_candidacy := game.open_party_candidacy(v_party, 'president', v_citizen.user_id);
  -- At most two elected terms in a row, then one out (spec section 2).
  select period into v_period from game.elections where id = v_candidacy.election_id;
  if (select count(*) from game.mandates as m
      join game.elections as e on e.id = m.election_id
      where m.user_id = v_president and m.office = 'president' and m.elected
        and e.period >= (v_period - make_interval(months => game.param('president_consecutive_terms')::integer))::date
        and e.period < v_period) >= game.param('president_consecutive_terms') then
    raise exception 'term_limit' using errcode = '22023';
  end if;
  update game.candidacies set user_id = v_president, running_mate_user_id = v_vice where id = v_candidacy.id;
  return v_candidacy.id;
end;
$$;
comment on function public.register_ticket(text, text) is
  'The party leader registers (or changes) the party''s presidential ticket; 20 GOLD from the party when new.';
grant execute on function public.register_ticket(text, text) to authenticated;

create function public.register_party_list(p_names text[])
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party game.parties := game.require_party_leader(v_citizen);
  v_users uuid[] := '{}';
  v_name text;
  v_user uuid;
  v_candidacy game.candidacies;
begin
  if coalesce(cardinality(p_names), 0) = 0 or cardinality(p_names) > 100 then
    raise exception 'candidate_invalid' using errcode = '22023';
  end if;
  foreach v_name in array p_names loop
    v_user := game.party_candidate(v_party, v_name, 'congress_civil_level');
    if v_user = any (v_users) then
      raise exception 'candidate_invalid' using errcode = '22023';
    end if;
    v_users := v_users || v_user;
  end loop;
  v_candidacy := game.open_party_candidacy(v_party, 'congress', v_citizen.user_id);
  delete from game.party_list_members where candidacy_id = v_candidacy.id;
  insert into game.party_list_members (candidacy_id, position, user_id)
  select v_candidacy.id, u.position, u.user_id
  from unnest(v_users) with ordinality as u (user_id, position);
  return v_candidacy.id;
end;
$$;
comment on function public.register_party_list(text[]) is
  'The party leader registers (or reorders) the party''s list for Congress; 10 GOLD from the party when new.';
grant execute on function public.register_party_list(text[]) to authenticated;

create function public.withdraw_party_candidacy(p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party game.parties := game.require_party_leader(v_citizen);
  v_election game.elections;
  v_election_id bigint;
begin
  if p_kind not in ('president', 'congress') then
    raise exception 'candidacy_not_found' using errcode = 'P0002';
  end if;
  v_election_id := game.national_election(v_party.country_code, p_kind);
  select * into v_election from game.elections where id = v_election_id for update;
  if game.now() >= v_election.registration_closes_at then
    raise exception 'registration_closed' using errcode = '22023';
  end if;
  update game.candidacies set withdrawn_at = game.now()
  where election_id = v_election.id and party_id = v_party.id and withdrawn_at is null;
  if not found then
    raise exception 'candidacy_not_found' using errcode = 'P0002';
  end if;
end;
$$;
comment on function public.withdraw_party_candidacy(text) is
  'The party leader withdraws the ticket or the list while candidacies are open; the fee is not returned.';
grant execute on function public.withdraw_party_candidacy(text) to authenticated;

-- Reads ------------------------------------------------------------------------------------------------------

-- The country's current national election of a kind: the one voting or validating, else the one taking
-- candidacies; and what the player can do in it.
create function public.get_national_election(p_country_code text, p_kind text)
returns table (
  election_id bigint, status text, registration_opens_at timestamptz, registration_closes_at timestamptz,
  voting_starts_at timestamptz, voting_ends_at timestamptz, takes_office_at timestamptz, seats integer,
  candidacies integer, voters integer, ballots integer, i_voted boolean, i_can_vote boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select * from game.elections
    where kind = p_kind and country_code = p_country_code and party_id is null and status <> 'proclaimed'
    order by period
    limit 1
  )
  select e.id,
         case when game.now() >= e.voting_ends_at then 'validation'
              when game.now() >= e.voting_starts_at then 'voting'
              else 'registration' end,
         e.registration_opens_at, e.registration_closes_at, e.voting_starts_at, e.voting_ends_at, e.takes_office_at,
         e.seats,
         (select count(*)::integer from game.candidacies as c where c.election_id = e.id and c.withdrawn_at is null),
         (select count(*)::integer from game.election_voters as v where v.election_id = e.id),
         (select count(*)::integer from game.ballots as b where b.election_id = e.id),
         exists (select 1 from game.ballots as b where b.election_id = e.id and b.voter_user_id = auth.uid()),
         game.now() >= e.voting_starts_at and game.now() < e.voting_ends_at
           and exists (select 1 from game.election_voters as v where v.election_id = e.id and v.user_id = auth.uid())
           and game.can_vote_in_elections(auth.uid())
           and not exists (select 1 from game.ballots as b where b.election_id = e.id and b.voter_user_id = auth.uid())
  from e;
$$;
comment on function public.get_national_election(text, text) is 'A country''s current presidential or congressional election.';
grant execute on function public.get_national_election(text, text) to anon, authenticated;

create function public.list_tickets(p_election_id bigint)
returns table (
  candidacy_id bigint, party_name text, president_name text, vice_president_name text, registered_at timestamptz,
  votes integer, elected boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, p.name, pr.name, vp.name, c.registered_at,
         case when e.status = 'proclaimed' then c.votes end, c.elected
  from game.candidacies as c
  join game.elections as e on e.id = c.election_id and e.kind = 'president'
  join game.parties as p on p.id = c.party_id
  join game.citizens as pr on pr.user_id = c.user_id
  join game.citizens as vp on vp.user_id = c.running_mate_user_id
  where c.election_id = p_election_id and c.withdrawn_at is null
  order by case when e.status = 'proclaimed' then c.votes end desc nulls last, c.registered_at, c.id;
$$;
comment on function public.list_tickets(bigint) is 'Presidential tickets of an election; votes once proclaimed.';
grant execute on function public.list_tickets(bigint) to anon, authenticated;

create function public.list_party_lists(p_election_id bigint)
returns table (
  candidacy_id bigint, party_name text, candidates text[], registered_at timestamptz, votes integer, seats integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, p.name,
         array(select ci.name from game.party_list_members as lm
               join game.citizens as ci on ci.user_id = lm.user_id
               where lm.candidacy_id = c.id order by lm.position),
         c.registered_at,
         case when e.status = 'proclaimed' then c.votes end,
         case when e.status = 'proclaimed' then c.seats end
  from game.candidacies as c
  join game.elections as e on e.id = c.election_id and e.kind = 'congress'
  join game.parties as p on p.id = c.party_id
  where c.election_id = p_election_id and c.withdrawn_at is null
  order by case when e.status = 'proclaimed' then c.votes end desc nulls last, p.founded_at, p.id;
$$;
comment on function public.list_party_lists(bigint) is 'Party lists for Congress, in order; votes and seats once proclaimed.';
grant execute on function public.list_party_lists(bigint) to anon, authenticated;

create function public.get_last_national_election(p_country_code text, p_kind text)
returns table (election_id bigint, proclaimed_at timestamptz, ballots integer, seats integer)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.proclaimed_at, (select count(*)::integer from game.ballots as b where b.election_id = e.id), e.seats
  from game.elections as e
  where e.kind = p_kind and e.country_code = p_country_code and e.party_id is null and e.status = 'proclaimed'
  order by e.period desc
  limit 1;
$$;
grant execute on function public.get_last_national_election(text, text) to anon, authenticated;

create function public.get_government(p_country_code text)
returns table (office text, name text, party_name text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.office, c.name, p.name, m.began_at
  from game.mandates as m
  join game.citizens as c on c.user_id = m.user_id
  left join game.parties as p on p.id = m.party_id
  where m.country_code = p_country_code and m.office in ('president', 'vice_president') and m.ended_at is null
  order by m.office = 'vice_president';
$$;
comment on function public.get_government(text) is 'The country''s president and vice president in office.';
grant execute on function public.get_government(text) to anon, authenticated;

create function public.list_congress(p_country_code text)
returns table (name text, party_name text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, p.name, m.began_at
  from game.mandates as m
  join game.citizens as c on c.user_id = m.user_id
  left join game.parties as p on p.id = m.party_id
  where m.country_code = p_country_code and m.office = 'congress' and m.ended_at is null
  order by p.name, m.id;
$$;
comment on function public.list_congress(text) is 'The members of Congress in office.';
grant execute on function public.list_congress(text) to anon, authenticated;

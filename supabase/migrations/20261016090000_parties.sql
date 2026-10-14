-- G1 · Parties, membership, donations and the party leaders' election (spec sections 2 and 3, ADR 0024).
--
-- game.parties              national parties; founding burns 50 GOLD; the founder is the first leader
-- game.party_memberships    one party per citizen; lost when the citizen changes country
-- accounts kind 'party'     party funds, filled by donations in GOLD or the national currency
-- game.elections            generic elections (party leaders now; president and Congress in G2) with their
--                           UTC calendar and the state machine registration → voting → validation → proclaimed
-- game.candidacies, game.election_voters (immutable snapshot), game.ballots (secret: only totals are public)
-- game.job_elections        hourly: opens each party's election, takes the snapshot, closes, tallies, proclaims
-- public.found_party, join_party, leave_party, donate_to_party, register_candidacy, withdraw_candidacy,
--   vote, list_parties, get_party, list_party_members, get_my_party, get_party_election, list_candidates
--
-- Errors (ADR 0005): party_name_invalid, party_name_taken, already_in_party, not_in_party, party_not_found,
-- not_national, registration_closed, already_candidate, candidacy_not_found, voting_closed, not_eligible_voter,
-- already_voted, currency_invalid, amount_invalid, insufficient_funds.
--
-- Rollback: drop the public functions created here, the trigger citizens_leave_party and its function, the
-- elections job and its scheduled_jobs row, game.ballots, game.election_voters, game.candidacies,
-- game.elections; restore list_my_movements from 20261013100000; delete party accounts once empty and drop
-- accounts.party_id restoring accounts_kind_check and accounts_owner_matches_kind from 20261013100000 and
-- 20261009210000; drop game.party_memberships, game.parties and the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('party_founding_gold', 5000, 'GOLD hundredths burned to found a party (spec section 3).'),
  ('election_vote_day_party_leader', 15, 'Day of the month (UTC) when party leaders are elected.'),
  ('election_registration_lead_hours', 24, 'Candidacies close this many hours before the vote.'),
  ('election_vote_hours', 24, 'How long a vote lasts.'),
  ('election_validation_hours', 12, 'Anti-fraud validation between the end of the vote and taking office.');

-- Parties ----------------------------------------------------------------------------------------------

create table game.parties (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  name text not null check (char_length(btrim(name)) between 3 and 40 and name = btrim(name)),
  description text not null default '' check (char_length(description) <= 160),
  founder_user_id uuid not null references game.citizens (user_id),
  leader_user_id uuid references game.citizens (user_id),
  creation_key text unique check (char_length(creation_key) <= 200),
  founded_at timestamptz not null
);
alter table game.parties enable row level security;
comment on table game.parties is 'National parties. Funded by donations; the leader is elected every month (day 15).';
create unique index parties_name_key on game.parties (country_code, lower(name));
create index parties_leader_idx on game.parties (leader_user_id) where leader_user_id is not null;
create index parties_founder_idx on game.parties (founder_user_id);

create table game.party_memberships (
  user_id uuid primary key references game.citizens (user_id) on delete cascade,
  party_id bigint not null references game.parties (id),
  joined_at timestamptz not null
);
alter table game.party_memberships enable row level security;
comment on table game.party_memberships is 'One party per citizen.';
create index party_memberships_party_idx on game.party_memberships (party_id, joined_at);

-- Party accounts ---------------------------------------------------------------------------------------

-- squawk-ignore adding-foreign-key-constraint
alter table game.accounts add column party_id bigint references game.parties (id);
-- Both checks are replaced right below, in the same transaction, by wider ones that admit party accounts.
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_kind_check
  check (kind in ('citizen', 'treasury', 'issuer', 'sink', 'company', 'escrow', 'party'));
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_owner_matches_kind;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_owner_matches_kind check (
  case kind
    when 'citizen' then user_id is not null and country_code is null and company_id is null and party_id is null
    when 'treasury' then user_id is null and country_code is not null and company_id is null and party_id is null
    when 'company' then user_id is null and country_code is null and company_id is not null and party_id is null
    when 'party' then user_id is null and country_code is null and company_id is null and party_id is not null
    else user_id is null and country_code is null and company_id is null and party_id is null
  end
);
-- squawk-ignore require-concurrent-index-creation
create unique index accounts_party_key on game.accounts (party_id, currency_code) where kind = 'party';
comment on column game.accounts.kind is 'citizen, treasury, company, party, escrow (one per hold), issuer or sink.';

create function game.party_account(p_party_id bigint, p_currency text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.accounts (currency_code, kind, party_id)
  values (p_currency, 'party', p_party_id)
  on conflict (party_id, currency_code) where kind = 'party' do nothing;
  select id into v_id from game.accounts where kind = 'party' and party_id = p_party_id and currency_code = p_currency;
  return v_id;
end;
$$;
comment on function game.party_account(bigint, text) is 'A party''s funds in a currency, opened on first use.';

-- Elections --------------------------------------------------------------------------------------------

create table game.elections (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('party_leader', 'president', 'congress')),
  country_code text not null references game.countries (code),
  party_id bigint references game.parties (id),
  period date not null check (extract(day from period) = 1),
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  voting_starts_at timestamptz not null,
  voting_ends_at timestamptz not null,
  takes_office_at timestamptz not null,
  status text not null default 'registration'
    check (status in ('registration', 'voting', 'validation', 'proclaimed', 'incident')),
  proclaimed_at timestamptz,
  constraint elections_party_only_for_leaders check ((kind = 'party_leader') = (party_id is not null)),
  constraint elections_calendar check (
    registration_opens_at <= registration_closes_at and registration_closes_at <= voting_starts_at
    and voting_starts_at < voting_ends_at and voting_ends_at <= takes_office_at
  ),
  constraint elections_proclaimed check ((status = 'proclaimed') = (proclaimed_at is not null))
);
alter table game.elections enable row level security;
comment on table game.elections is
  'Elections with their UTC calendar: registration → voting → validation → proclaimed (or incident).';
create unique index elections_period_key on game.elections (kind, country_code, coalesce(party_id, 0), period);
create index elections_party_idx on game.elections (party_id, period) where party_id is not null;
create index elections_open_idx on game.elections (voting_starts_at) where status <> 'proclaimed';

create table game.candidacies (
  id bigint generated always as identity primary key,
  election_id bigint not null references game.elections (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  registered_at timestamptz not null,
  withdrawn_at timestamptz,
  votes integer check (votes >= 0),
  elected boolean not null default false,
  unique (election_id, user_id)
);
alter table game.candidacies enable row level security;
comment on table game.candidacies is 'Who runs in an election; votes are filled when it is proclaimed.';
create index candidacies_user_idx on game.candidacies (user_id);

create table game.election_voters (
  election_id bigint not null references game.elections (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  primary key (election_id, user_id)
);
alter table game.election_voters enable row level security;
comment on table game.election_voters is 'Immutable snapshot of who may vote, taken when the vote opens.';
create index election_voters_user_idx on game.election_voters (user_id);

create table game.ballots (
  id bigint generated always as identity primary key,
  election_id bigint not null references game.elections (id),
  voter_user_id uuid not null references game.citizens (user_id) on delete cascade,
  candidacy_id bigint not null references game.candidacies (id),
  cast_at timestamptz not null,
  unique (election_id, voter_user_id)
);
alter table game.ballots enable row level security;
comment on table game.ballots is 'One secret ballot per voter and election; only totals are ever public.';
create index ballots_candidacy_idx on game.ballots (candidacy_id);
create index ballots_voter_idx on game.ballots (voter_user_id);

-- The UTC calendar of a monthly election: vote on its day from 00:00 for election_vote_hours, candidacies
-- close election_registration_lead_hours before, office is taken after election_validation_hours.
create function game.election_calendar(p_kind text, p_period date)
returns table (
  registration_opens_at timestamptz, registration_closes_at timestamptz, voting_starts_at timestamptz,
  voting_ends_at timestamptz, takes_office_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with v as (
    select (p_period + (game.param('election_vote_day_' || p_kind)::integer - 1))::timestamp at time zone 'UTC' as starts
  )
  select p_period::timestamp at time zone 'UTC',
         v.starts - make_interval(hours => game.param('election_registration_lead_hours')::integer),
         v.starts,
         v.starts + make_interval(hours => game.param('election_vote_hours')::integer),
         v.starts + make_interval(hours => (game.param('election_vote_hours') + game.param('election_validation_hours'))::integer)
  from v;
$$;
comment on function game.election_calendar(text, date) is 'Registration, vote and taking office of a monthly election, in UTC.';

-- The party's election that still takes candidacies at p_at: this month's, or next month's once this
-- month's registration closed. Created on first use.
create function game.party_election(p_party_id bigint, p_at timestamptz default game.now())
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_period date := date_trunc('month', p_at at time zone 'UTC')::date;
  v_country text := (select country_code from game.parties where id = p_party_id);
  v_cal record;
  v_id bigint;
begin
  select * into v_cal from game.election_calendar('party_leader', v_period);
  if p_at >= v_cal.registration_closes_at then
    v_period := (v_period + interval '1 month')::date;
    select * into v_cal from game.election_calendar('party_leader', v_period);
  end if;
  insert into game.elections (kind, country_code, party_id, period, registration_opens_at, registration_closes_at,
                              voting_starts_at, voting_ends_at, takes_office_at)
  values ('party_leader', v_country, p_party_id, v_period, v_cal.registration_opens_at, v_cal.registration_closes_at,
          v_cal.voting_starts_at, v_cal.voting_ends_at, v_cal.takes_office_at)
  on conflict (kind, country_code, coalesce(party_id, 0), period) do nothing;
  select id into v_id from game.elections
  where kind = 'party_leader' and party_id = p_party_id and period = v_period;
  return v_id;
end;
$$;

-- The party's most recent election that has started voting and is not proclaimed, if any.
create function game.party_running_election(p_party_id bigint)
returns bigint
language sql
stable
set search_path = ''
as $$
  select id from game.elections
  where party_id = p_party_id and status <> 'proclaimed' and voting_starts_at <= game.now()
  order by period desc
  limit 1;
$$;

-- Party leadership ---------------------------------------------------------------------------------------

-- A vacant leadership goes to the member with the most civil XP, then the oldest membership, then the id.
create function game.fill_party_leader(p_party_id bigint)
returns void
language sql
set search_path = ''
as $$
  update game.parties as p
  set leader_user_id = (
    select m.user_id from game.party_memberships as m
    join game.player_stats as s on s.user_id = m.user_id
    where m.party_id = p_party_id
    order by s.experience desc, m.joined_at, m.user_id
    limit 1
  )
  where p.id = p_party_id;
$$;

-- Removes a citizen from their party: their open candidacies go, and a leader is replaced.
create function game.remove_party_member(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_party_id bigint;
begin
  delete from game.party_memberships where user_id = p_user_id returning party_id into v_party_id;
  if v_party_id is null then
    return;
  end if;
  update game.candidacies as c set withdrawn_at = game.now()
  from game.elections as e
  where e.id = c.election_id and e.party_id = v_party_id and e.status in ('registration', 'voting')
    and c.user_id = p_user_id and c.withdrawn_at is null;
  if (select leader_user_id from game.parties where id = v_party_id) = p_user_id then
    perform game.fill_party_leader(v_party_id);
  end if;
end;
$$;

-- Changing country loses the party (GDD, ADR 0007).
create function game.citizens_leave_party()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform game.remove_party_member(new.user_id);
  return new;
end;
$$;
create trigger citizens_leave_party
after update of country_code on game.citizens
for each row when (old.country_code is distinct from new.country_code)
execute function game.citizens_leave_party();

-- Advancing an election ------------------------------------------------------------------------------

-- Moves an election as far as the clock allows: snapshot of voters when the vote opens, validation when it
-- closes, tally and proclamation when office is taken. Idempotent.
create function game.advance_election(p_election_id bigint)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_e game.elections;
  v_now timestamptz := game.now();
  v_winner game.candidacies;
begin
  select * into v_e from game.elections where id = p_election_id for update;
  if v_e.status = 'registration' and v_now >= v_e.voting_starts_at then
    -- Members since before candidacies closed; the ballot itself checks the adaptation period.
    insert into game.election_voters (election_id, user_id)
    select v_e.id, m.user_id from game.party_memberships as m
    where m.party_id = v_e.party_id and m.joined_at < v_e.registration_closes_at
    on conflict do nothing;
    v_e.status := 'voting';
  end if;
  if v_e.status = 'voting' and v_now >= v_e.voting_ends_at then
    v_e.status := 'validation';
  end if;
  if v_e.status = 'validation' and v_now >= v_e.takes_office_at then
    update game.candidacies as c
    set votes = (select count(*)::integer from game.ballots as b where b.candidacy_id = c.id)
    where c.election_id = v_e.id;
    -- The most votes win; ties go to the oldest candidacy (spec section 3). A candidate who left the party
    -- cannot win.
    select c.* into v_winner from game.candidacies as c
    join game.party_memberships as m on m.user_id = c.user_id and m.party_id = v_e.party_id
    where c.election_id = v_e.id and c.withdrawn_at is null and c.votes > 0
    order by c.votes desc, c.registered_at, c.id
    limit 1;
    if found then
      update game.candidacies set elected = true where id = v_winner.id;
      update game.parties set leader_user_id = v_winner.user_id where id = v_e.party_id;
    end if;
    v_e.status := 'proclaimed';
    v_e.proclaimed_at := v_now;
  end if;
  update game.elections set status = v_e.status, proclaimed_at = v_e.proclaimed_at where id = v_e.id;
  return v_e.status;
end;
$$;
comment on function game.advance_election(bigint) is 'Snapshot, close, tally and proclaim as the clock allows.';

create function game.job_elections(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_advanced integer := 0;
  v_party record;
begin
  for v_id in select id from game.elections where status <> 'proclaimed' and voting_starts_at <= game.now() order by id loop
    perform game.advance_election(v_id);
    v_advanced := v_advanced + 1;
  end loop;
  -- Every party always has an election taking candidacies.
  for v_party in select id from game.parties loop
    perform game.party_election(v_party.id);
  end loop;
  return jsonb_build_object('advanced', v_advanced);
end;
$$;

insert into game.scheduled_jobs (name, cadence, origin, description)
values ('elections', interval '1 hour', '2000-01-01 00:00:00+00',
        'Opens, closes, tallies and proclaims elections on their UTC calendar.');

-- API: parties -------------------------------------------------------------------------------------------

create function public.found_party(p_name text, p_description text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'party:' || auth.uid()::text || ':' || p_key::text;
  v_name text := btrim(coalesce(p_name, ''));
  v_id bigint;
begin
  select id into v_id from game.parties where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if char_length(v_name) not between 3 and 40 or char_length(coalesce(p_description, '')) > 160 then
    raise exception 'party_name_invalid' using errcode = '22023';
  end if;
  perform 1 from game.citizens where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.party_memberships where user_id = v_citizen.user_id) then
    raise exception 'already_in_party' using errcode = '22023';
  end if;
  if exists (select 1 from game.parties where country_code = v_citizen.country_code and lower(name) = lower(v_name)) then
    raise exception 'party_name_taken' using errcode = '22023';
  end if;

  insert into game.parties (country_code, name, description, founder_user_id, leader_user_id, creation_key, founded_at)
  values (v_citizen.country_code, v_name, btrim(coalesce(p_description, '')), v_citizen.user_id, v_citizen.user_id,
          v_key, game.now())
  returning id into v_id;
  -- The founding price leaves the game.
  perform game.post(
    'party_founding', v_key, v_citizen.user_id,
    array[row(game.citizen_account(v_citizen.user_id, 'GOLD'), game.system_account('sink', 'GOLD'),
              game.param('party_founding_gold')::bigint, 'party_founding', null)::game.ledger_leg]
  );
  insert into game.party_memberships (user_id, party_id, joined_at) values (v_citizen.user_id, v_id, game.now());
  perform game.party_election(v_id);
  return v_id;
exception when unique_violation then
  raise exception 'party_name_taken' using errcode = '22023';
end;
$$;
comment on function public.found_party(text, text, uuid) is
  'Founds a party in the player''s country for 50 GOLD, burned; the founder is its first member and leader.';
grant execute on function public.found_party(text, text, uuid) to authenticated;

create function public.join_party(p_party_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party game.parties;
begin
  select * into v_party from game.parties where id = p_party_id;
  if not found then
    raise exception 'party_not_found' using errcode = 'P0002';
  end if;
  if v_party.country_code <> v_citizen.country_code then
    raise exception 'not_national' using errcode = '42501';
  end if;
  perform 1 from game.citizens where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.party_memberships where user_id = v_citizen.user_id) then
    if (select party_id from game.party_memberships where user_id = v_citizen.user_id) = p_party_id then
      return;
    end if;
    raise exception 'already_in_party' using errcode = '22023';
  end if;
  insert into game.party_memberships (user_id, party_id, joined_at) values (v_citizen.user_id, p_party_id, game.now());
  -- A party without members has no leader: the first to join takes it.
  if v_party.leader_user_id is null then
    perform game.fill_party_leader(p_party_id);
  end if;
end;
$$;
comment on function public.join_party(bigint) is 'Joins a party of the player''s country; one party at a time.';
grant execute on function public.join_party(bigint) to authenticated;

create function public.leave_party()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  perform 1 from game.citizens where user_id = v_citizen.user_id for update;
  if not exists (select 1 from game.party_memberships where user_id = v_citizen.user_id) then
    raise exception 'not_in_party' using errcode = '22023';
  end if;
  perform game.remove_party_member(v_citizen.user_id);
end;
$$;
comment on function public.leave_party() is 'Leaves the party; a leader who leaves is replaced by the member with most civil XP.';
grant execute on function public.leave_party() to authenticated;

create function public.donate_to_party(p_party_id bigint, p_currency text, p_amount bigint, p_key uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party game.parties;
begin
  select * into v_party from game.parties where id = p_party_id;
  if not found then
    raise exception 'party_not_found' using errcode = 'P0002';
  end if;
  if v_party.country_code <> v_citizen.country_code then
    raise exception 'not_national' using errcode = '42501';
  end if;
  if p_currency is null or p_currency not in ('GOLD', v_party.country_code) then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  perform game.post(
    'party_donation', 'donation:' || auth.uid()::text || ':' || p_key::text, v_citizen.user_id,
    array[row(game.citizen_account(v_citizen.user_id, p_currency), game.party_account(p_party_id, p_currency),
              p_amount, 'party_donation', null)::game.ledger_leg]
  );
end;
$$;
comment on function public.donate_to_party(bigint, text, bigint, uuid) is
  'Donates GOLD or the national currency to a party of the player''s country.';
grant execute on function public.donate_to_party(bigint, text, bigint, uuid) to authenticated;

-- API: the leader election ---------------------------------------------------------------------------------

create function public.register_candidacy()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party_id bigint := (select party_id from game.party_memberships where user_id = v_citizen.user_id);
  v_election game.elections;
  v_election_id bigint;
  v_id bigint;
begin
  if v_party_id is null then
    raise exception 'not_in_party' using errcode = '22023';
  end if;
  -- Created on first use: its id first, so the locking query sees the new row.
  v_election_id := game.party_election(v_party_id);
  select * into v_election from game.elections where id = v_election_id for update;
  if game.now() < v_election.registration_opens_at or game.now() >= v_election.registration_closes_at then
    raise exception 'registration_closed' using errcode = '22023';
  end if;
  select id into v_id from game.candidacies where election_id = v_election.id and user_id = v_citizen.user_id;
  if found then
    update game.candidacies set withdrawn_at = null where id = v_id;
    return v_id;
  end if;
  insert into game.candidacies (election_id, user_id, registered_at)
  values (v_election.id, v_citizen.user_id, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.register_candidacy() is 'Runs for leader of the player''s party in its next election.';
grant execute on function public.register_candidacy() to authenticated;

create function public.withdraw_candidacy()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party_id bigint := (select party_id from game.party_memberships where user_id = v_citizen.user_id);
  v_election game.elections;
  v_election_id bigint;
begin
  if v_party_id is null then
    raise exception 'not_in_party' using errcode = '22023';
  end if;
  -- Created on first use: its id first, so the locking query sees the new row.
  v_election_id := game.party_election(v_party_id);
  select * into v_election from game.elections where id = v_election_id for update;
  if game.now() >= v_election.registration_closes_at then
    raise exception 'registration_closed' using errcode = '22023';
  end if;
  update game.candidacies set withdrawn_at = game.now()
  where election_id = v_election.id and user_id = v_citizen.user_id and withdrawn_at is null;
  if not found then
    raise exception 'candidacy_not_found' using errcode = 'P0002';
  end if;
end;
$$;
comment on function public.withdraw_candidacy() is 'Withdraws the player''s candidacy while candidacies are open.';
grant execute on function public.withdraw_candidacy() to authenticated;

create function public.vote(p_candidacy_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_candidacy game.candidacies;
  v_election game.elections;
begin
  select * into v_candidacy from game.candidacies where id = p_candidacy_id;
  if not found or v_candidacy.withdrawn_at is not null then
    raise exception 'candidacy_not_found' using errcode = 'P0002';
  end if;
  perform game.advance_election(v_candidacy.election_id);
  select * into v_election from game.elections where id = v_candidacy.election_id;
  if v_election.status <> 'voting' then
    raise exception 'voting_closed' using errcode = '22023';
  end if;
  if not exists (select 1 from game.election_voters where election_id = v_election.id and user_id = v_citizen.user_id)
     or not game.can_vote_in_elections(v_citizen.user_id) then
    raise exception 'not_eligible_voter' using errcode = '42501';
  end if;
  insert into game.ballots (election_id, voter_user_id, candidacy_id, cast_at)
  values (v_election.id, v_citizen.user_id, p_candidacy_id, game.now());
exception when unique_violation then
  raise exception 'already_voted' using errcode = '22023';
end;
$$;
comment on function public.vote(bigint) is 'Casts the player''s one secret ballot in an election they may vote in.';
grant execute on function public.vote(bigint) to authenticated;

-- Reads --------------------------------------------------------------------------------------------------

create function public.list_parties(p_country_code text)
returns table (
  party_id bigint, name text, description text, leader_name text, members integer, founded_at timestamptz,
  gold bigint, credit bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.description, l.name,
         (select count(*)::integer from game.party_memberships as m where m.party_id = p.id),
         p.founded_at,
         coalesce((select a.balance from game.accounts as a where a.kind = 'party' and a.party_id = p.id and a.currency_code = 'GOLD'), 0),
         coalesce((select a.balance from game.accounts as a where a.kind = 'party' and a.party_id = p.id and a.currency_code = p.country_code), 0)
  from game.parties as p
  left join game.citizens as l on l.user_id = p.leader_user_id
  where p.country_code = p_country_code
  order by 5 desc, p.founded_at, p.id;
$$;
comment on function public.list_parties(text) is 'A country''s parties, largest first, with their leader and public funds.';
grant execute on function public.list_parties(text) to anon, authenticated;

create function public.list_party_members(p_party_id bigint)
returns table (name text, civil_level integer, joined_at timestamptz, is_leader boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, game.level_for_experience(s.experience), m.joined_at, p.leader_user_id = m.user_id
  from game.party_memberships as m
  join game.parties as p on p.id = m.party_id
  join game.citizens as c on c.user_id = m.user_id
  join game.player_stats as s on s.user_id = m.user_id
  where m.party_id = p_party_id
  order by p.leader_user_id = m.user_id desc, m.joined_at, c.name;
$$;
comment on function public.list_party_members(bigint) is 'A party''s members, leader first.';
grant execute on function public.list_party_members(bigint) to anon, authenticated;

create function public.get_my_party()
returns table (party_id bigint, joined_at timestamptz, is_leader boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.party_id, m.joined_at, p.leader_user_id = m.user_id
  from game.party_memberships as m
  join game.parties as p on p.id = m.party_id
  where m.user_id = auth.uid();
$$;
comment on function public.get_my_party() is 'The signed-in player''s party, or no rows.';
grant execute on function public.get_my_party() to authenticated;

-- The party's current leader election: the one voting or being validated, else the one taking candidacies.
create function public.get_party_election(p_party_id bigint)
returns table (
  election_id bigint, status text, registration_closes_at timestamptz, voting_starts_at timestamptz,
  voting_ends_at timestamptz, takes_office_at timestamptz, candidates integer, voters integer, ballots integer,
  i_am_candidate boolean, i_voted boolean, i_can_vote boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select * from game.elections
    where party_id = p_party_id and status <> 'proclaimed'
    order by period
    limit 1
  )
  select e.id,
         -- The hourly job may not have moved it yet: the phase follows the clock.
         case when game.now() >= e.takes_office_at then 'validation'
              when game.now() >= e.voting_ends_at then 'validation'
              when game.now() >= e.voting_starts_at then 'voting'
              else 'registration' end,
         e.registration_closes_at, e.voting_starts_at, e.voting_ends_at, e.takes_office_at,
         (select count(*)::integer from game.candidacies as c where c.election_id = e.id and c.withdrawn_at is null),
         case when e.status = 'registration' then
           (select count(*)::integer from game.party_memberships as m
            where m.party_id = p_party_id and m.joined_at < e.registration_closes_at)
         else (select count(*)::integer from game.election_voters as v where v.election_id = e.id) end,
         (select count(*)::integer from game.ballots as b where b.election_id = e.id),
         exists (select 1 from game.candidacies as c where c.election_id = e.id and c.user_id = auth.uid() and c.withdrawn_at is null),
         exists (select 1 from game.ballots as b where b.election_id = e.id and b.voter_user_id = auth.uid()),
         game.now() >= e.voting_starts_at and game.now() < e.voting_ends_at
           and game.can_vote_in_elections(auth.uid())
           and (exists (select 1 from game.election_voters as v where v.election_id = e.id and v.user_id = auth.uid())
                or (e.status = 'registration' and exists (
                  select 1 from game.party_memberships as m
                  where m.user_id = auth.uid() and m.party_id = p_party_id and m.joined_at < e.registration_closes_at)))
           and not exists (select 1 from game.ballots as b where b.election_id = e.id and b.voter_user_id = auth.uid())
  from e;
$$;
comment on function public.get_party_election(bigint) is 'The party''s current leader election and what the player can do in it.';
grant execute on function public.get_party_election(bigint) to anon, authenticated;

-- Candidates of an election; votes only once it is proclaimed (ballots are secret until then).
create function public.list_candidates(p_election_id bigint)
returns table (candidacy_id bigint, name text, civil_level integer, registered_at timestamptz, votes integer, elected boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, ci.name, game.level_for_experience(s.experience), c.registered_at,
         case when e.status = 'proclaimed' then c.votes end, c.elected
  from game.candidacies as c
  join game.elections as e on e.id = c.election_id
  join game.citizens as ci on ci.user_id = c.user_id
  join game.player_stats as s on s.user_id = c.user_id
  where c.election_id = p_election_id and c.withdrawn_at is null
  order by case when e.status = 'proclaimed' then c.votes end desc nulls last, c.registered_at, c.id;
$$;
comment on function public.list_candidates(bigint) is 'Who runs in an election; votes once it is proclaimed.';
grant execute on function public.list_candidates(bigint) to anon, authenticated;

-- The last proclaimed leader election of a party, for its result.
create function public.get_last_party_election(p_party_id bigint)
returns table (election_id bigint, proclaimed_at timestamptz, ballots integer)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.proclaimed_at, (select count(*)::integer from game.ballots as b where b.election_id = e.id)
  from game.elections as e
  where e.party_id = p_party_id and e.status = 'proclaimed'
  order by e.period desc
  limit 1;
$$;
grant execute on function public.get_last_party_election(bigint) to anon, authenticated;

-- Movements name parties too ------------------------------------------------------------------------------

create or replace function public.list_my_movements(
  p_currency text default null,
  p_before bigint default null,
  p_limit integer default 50
)
returns table (
  posting_id bigint,
  created_at timestamptz,
  kind text,
  memo text,
  currency_code text,
  amount bigint,
  balance_after bigint,
  counterparty_kind text,
  counterparty_name text,
  counterparty_country_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.id from game.accounts as a where a.kind = 'citizen' and a.user_id = auth.uid()
  )
  select p.id, p.created_at, p.kind, p.memo, p.currency_code,
         case when p.credit_account_id in (select id from mine) then p.amount else -p.amount end,
         case when p.credit_account_id in (select id from mine) then p.credit_balance_after else p.debit_balance_after end,
         other.kind, coalesce(other_citizen.name, other_company.name, other_party.name), other.country_code
  from game.ledger_postings as p
  join game.accounts as other
    on other.id = case when p.credit_account_id in (select id from mine) then p.debit_account_id else p.credit_account_id end
  left join game.citizens as other_citizen on other_citizen.user_id = other.user_id
  left join game.companies as other_company on other_company.id = other.company_id
  left join game.parties as other_party on other_party.id = other.party_id
  where (p.debit_account_id in (select id from mine) or p.credit_account_id in (select id from mine))
    and (p_currency is null or p.currency_code = p_currency)
    and (p_before is null or p.id < p_before)
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

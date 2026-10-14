-- G3 · Offices: five ministries and the Central Bank governor, one national office per person, atomic succession,
-- resignations, removal for inactivity and impeachment (spec section 2, ADR 0026).
--
-- game.offices         president, vice president, the five ministers and the Central Bank governor (the
--                      Interior ministry of D06 is gone: citizenship requests are reviewed by the president)
-- game.mandates        every national office, ministers and governor included, with months rewarded
-- game.succession_events  who took an office by succession or appointment and why
-- game.congress_motions, game.motion_votes  24-hour votes of Congress: the resignation of the president or
--                      vice president, their removal after 72 h of inactivity, and impeachment of the president
-- Succession: the vice president takes a vacant presidency; a vacant vice presidency (or both) goes to the
-- ministers, then members of Congress, then other nationals with civil level ≥ 10 and a party, most civil XP
-- first, ties to the oldest account; without anyone eligible, the national with most civil XP.
-- public.appoint_minister, dismiss_minister, appoint_governor, dismiss_governor, resign_office,
--   request_resignation, propose_removal, propose_impeachment, vote_motion, get_cabinet, get_my_office,
--   list_motions, list_motion_votes; leave_party refuses the president and vice president
--
-- Errors (ADR 0005): not_president, not_in_congress, office_invalid, office_incompatible, level_too_low,
-- candidate_invalid, no_office, resignation_needs_congress, office_locks_party, office_locks_citizenship,
-- not_inactive, motion_open, motion_not_found, voting_closed, already_voted.
--
-- Rollback: drop the public functions created here, the triggers offices_cancel_citizenship,
-- mandates_cancel_citizenship and citizenship_requests_office_lock with their functions, game.motion_votes,
-- game.congress_motions, game.succession_events; restore leave_party from 20261016090000, the proclaim
-- functions and game.job_elections from 20261017090000; restore the offices and mandates office checks and drop
-- mandates.months_rewarded; delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('minister_civil_level', 10, 'Civil level to be appointed minister.'),
  ('governor_civil_level', 15, 'Civil level to be appointed Central Bank governor.'),
  ('succession_civil_level', 10, 'Civil level for the ordinary succession of president and vice president.'),
  ('reward_minister_gold', 500, 'GOLD hundredths for each full month a minister completes in office.'),
  ('motion_vote_hours', 24, 'How long Congress votes a motion.'),
  ('inactivity_removal_hours', 72, 'Hours without signing in that allow Congress to remove the president or vice president.');

-- Offices and mandates ------------------------------------------------------------------------------------

delete from game.offices where office = 'interior_minister';
-- Replaced right below, in the same transaction, by the offices of specification v3.1.
-- squawk-ignore ban-drop-constraint
alter table game.offices drop constraint offices_office_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.offices add constraint offices_office_check check (office in (
  'president', 'vice_president', 'minister_economy', 'minister_defense', 'minister_foreign_affairs',
  'minister_health', 'minister_development', 'central_bank_governor'
));
-- squawk-ignore require-concurrent-index-creation
create unique index offices_one_per_person on game.offices (user_id);

-- squawk-ignore ban-drop-constraint
alter table game.mandates drop constraint mandates_office_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.mandates add constraint mandates_office_check check (office in (
  'president', 'vice_president', 'congress', 'minister_economy', 'minister_defense', 'minister_foreign_affairs',
  'minister_health', 'minister_development', 'central_bank_governor'
));
alter table game.mandates add column months_rewarded integer not null default 0 check (months_rewarded >= 0);
comment on column game.mandates.months_rewarded is 'Full months a minister was rewarded for.';

create table game.succession_events (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  office text not null,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  previous_office text,
  reason text not null check (reason in ('succession', 'exception', 'appointment', 'list')),
  happened_at timestamptz not null
);
alter table game.succession_events enable row level security;
comment on table game.succession_events is 'Offices taken by succession, appointment or the next on a party list.';
create index succession_events_country_idx on game.succession_events (country_code, happened_at);
create index succession_events_user_idx on game.succession_events (user_id);

-- The national office a citizen holds: an office, 'congress', or null.
create function game.national_office(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select office from game.offices where user_id = p_user_id),
    (select 'congress' from game.mandates where user_id = p_user_id and office = 'congress' and ended_at is null limit 1)
  );
$$;

-- Office holders cannot change citizenship (spec section 2); taking office cancels a pending request.
create function game.citizenship_requests_office_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if game.national_office(new.user_id) is not null then
    raise exception 'office_locks_citizenship' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger citizenship_requests_office_lock
before insert on game.citizenship_requests
for each row execute function game.citizenship_requests_office_lock();

create function game.cancel_citizenship_requests()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update game.citizenship_requests
  set status = 'cancelled', decided_by = 'rule', decided_at = game.now()
  where user_id = new.user_id and status = 'pending';
  return new;
end;
$$;
create trigger offices_cancel_citizenship
after insert on game.offices
for each row execute function game.cancel_citizenship_requests();
create trigger mandates_cancel_citizenship
after insert on game.mandates
for each row execute function game.cancel_citizenship_requests();

-- Taking and leaving offices -------------------------------------------------------------------------------

-- Ends whatever national office the citizen holds; a seat in Congress passes to the next on the list.
create function game.leave_national_office(p_user_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_office text := game.national_office(p_user_id);
  v_seat game.mandates;
begin
  if v_office is null then
    return null;
  end if;
  if v_office = 'congress' then
    update game.mandates set ended_at = game.now()
    where user_id = p_user_id and office = 'congress' and ended_at is null
    returning * into v_seat;
    perform game.fill_congress_vacancy(v_seat);
  else
    delete from game.offices where user_id = p_user_id;
    update game.mandates set ended_at = game.now()
    where user_id = p_user_id and office = v_office and ended_at is null;
  end if;
  return v_office;
end;
$$;

-- A seat left during the term goes to the next eligible candidate of the same list; otherwise it stays vacant.
create function game.fill_congress_vacancy(p_seat game.mandates)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_next uuid;
begin
  if p_seat.election_id is null or p_seat.party_id is null then
    return;
  end if;
  select lm.user_id into v_next
  from game.candidacies as c
  join game.party_list_members as lm on lm.candidacy_id = c.id
  join game.citizens as ci on ci.user_id = lm.user_id and ci.country_code = p_seat.country_code
  join game.party_memberships as m on m.user_id = lm.user_id and m.party_id = c.party_id
  where c.election_id = p_seat.election_id and c.party_id = p_seat.party_id
    and game.national_office(lm.user_id) is null
    and not exists (select 1 from game.mandates as old
                    where old.user_id = lm.user_id and old.election_id = p_seat.election_id)
  order by lm.position
  limit 1;
  if v_next is null then
    return;
  end if;
  insert into game.mandates (country_code, office, user_id, party_id, election_id, elected, began_at)
  values (p_seat.country_code, 'congress', v_next, p_seat.party_id, p_seat.election_id, false, game.now());
  insert into game.succession_events (country_code, office, user_id, reason, happened_at)
  values (p_seat.country_code, 'congress', v_next, 'list', game.now());
end;
$$;

-- Puts a citizen in an office (not Congress), leaving the one they had.
create function game.take_office(p_country_code text, p_office text, p_user_id uuid, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_previous text := game.leave_national_office(p_user_id);
begin
  insert into game.offices (country_code, office, user_id, since) values (p_country_code, p_office, p_user_id, game.now());
  insert into game.mandates (country_code, office, user_id, party_id, elected, began_at)
  values (p_country_code, p_office, p_user_id,
          (select party_id from game.party_memberships where user_id = p_user_id), false, game.now());
  insert into game.succession_events (country_code, office, user_id, previous_office, reason, happened_at)
  values (p_country_code, p_office, p_user_id, v_previous, p_reason, game.now());
end;
$$;

-- Who succeeds to an executive office: ministers, then members of Congress, then other nationals, with civil
-- level ≥ succession_civil_level and a party; most civil XP first, ties to the oldest account. Without anyone
-- eligible, the national with most civil XP (PD-07, deterministic). Never the president or vice president.
create function game.successor(p_country_code text)
returns table (user_id uuid, exceptional boolean)
language sql
stable
set search_path = ''
as $$
  (
    select c.user_id, false
    from game.citizens as c
    join game.player_stats as s on s.user_id = c.user_id
    join game.party_memberships as m on m.user_id = c.user_id
    where c.country_code = p_country_code
      and game.level_for_experience(s.experience) >= game.param('succession_civil_level')
      and coalesce(game.national_office(c.user_id), '') not in ('president', 'vice_president')
    order by case when game.national_office(c.user_id) like 'minister_%' then 1
                  when game.national_office(c.user_id) = 'congress' then 2
                  else 3 end,
             s.experience desc, c.joined_at, c.user_id
    limit 1
  )
  union all
  (
    select c.user_id, true
    from game.citizens as c
    join game.player_stats as s on s.user_id = c.user_id
    where c.country_code = p_country_code
      and coalesce(game.national_office(c.user_id), '') not in ('president', 'vice_president')
    order by s.experience desc, c.joined_at, c.user_id
    limit 1
  )
  limit 1;
$$;

-- Fills a vacant presidency (with the vice president when there is one) and a vacant vice presidency, at once.
create function game.fill_executive(p_country_code text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_vice uuid;
  v_next record;
begin
  if not exists (select 1 from game.offices where country_code = p_country_code and office = 'president') then
    select user_id into v_vice from game.offices where country_code = p_country_code and office = 'vice_president';
    if v_vice is not null then
      perform game.take_office(p_country_code, 'president', v_vice, 'succession');
    else
      select * into v_next from game.successor(p_country_code);
      if v_next.user_id is not null then
        perform game.take_office(p_country_code, 'president', v_next.user_id,
                                 case when v_next.exceptional then 'exception' else 'succession' end);
      end if;
    end if;
  end if;
  if not exists (select 1 from game.offices where country_code = p_country_code and office = 'vice_president') then
    select * into v_next from game.successor(p_country_code);
    if v_next.user_id is not null then
      perform game.take_office(p_country_code, 'vice_president', v_next.user_id,
                               case when v_next.exceptional then 'exception' else 'succession' end);
    end if;
  end if;
end;
$$;
comment on function game.fill_executive(text) is 'Atomic succession: the presidency and vice presidency are never left vacant.';

-- Removes the holder of an executive office and fills it at once.
create function game.vacate_executive(p_country_code text, p_office text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_holder uuid := (select user_id from game.offices where country_code = p_country_code and office = p_office);
begin
  if v_holder is not null then
    perform game.leave_national_office(v_holder);
  end if;
  perform game.fill_executive(p_country_code);
end;
$$;

-- Proclamations now respect the one-office rule ------------------------------------------------------------

create or replace function game.proclaim_president(p_election game.elections)
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
  -- The outgoing executive leaves; the winners leave any office or seat they had (one office per person).
  perform game.leave_national_office(o.user_id)
  from game.offices as o where o.country_code = p_election.country_code and o.office in ('president', 'vice_president');
  perform game.leave_national_office(v_winner.user_id);
  perform game.leave_national_office(v_winner.running_mate_user_id);
  insert into game.offices (country_code, office, user_id, since) values
    (p_election.country_code, 'president', v_winner.user_id, v_now),
    (p_election.country_code, 'vice_president', v_winner.running_mate_user_id, v_now);
  insert into game.mandates (country_code, office, user_id, party_id, election_id, began_at) values
    (p_election.country_code, 'president', v_winner.user_id, v_winner.party_id, p_election.id, v_now),
    (p_election.country_code, 'vice_president', v_winner.running_mate_user_id, v_winner.party_id, p_election.id, v_now);
  perform game.election_reward(p_election.id, v_winner.user_id, 'president', 'reward_president_gold');
  perform game.election_reward(p_election.id, v_winner.running_mate_user_id, 'vice_president', 'reward_vice_president_gold');
end;
$$;

create or replace function game.proclaim_congress(p_election game.elections)
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
    -- In list order, skipping who left the party or the country or holds another national office; seats a
    -- list cannot fill stay vacant.
    for v_member in
      select lm.user_id, c.party_id
      from game.party_list_members as lm
      join game.candidacies as c on c.id = lm.candidacy_id
      join game.citizens as ci on ci.user_id = lm.user_id and ci.country_code = p_election.country_code
      join game.party_memberships as m on m.user_id = lm.user_id and m.party_id = c.party_id
      where lm.candidacy_id = v_list.candidacy_id
        and not exists (select 1 from game.offices as o where o.user_id = lm.user_id)
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

-- Party lock -----------------------------------------------------------------------------------------------------

create or replace function public.leave_party()
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
  -- The president and vice president cannot change party during the term (spec section 2).
  if game.national_office(v_citizen.user_id) in ('president', 'vice_president') then
    raise exception 'office_locks_party' using errcode = '42501';
  end if;
  perform game.remove_party_member(v_citizen.user_id);
end;
$$;

-- Appointments --------------------------------------------------------------------------------------------------

create function game.require_president(p_citizen game.citizens)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not game.holds_office(p_citizen.user_id, p_citizen.country_code, array['president']) then
    raise exception 'not_president' using errcode = '42501';
  end if;
end;
$$;

-- A national of civil level from p_level_param who holds no national office, by name.
create function game.appointee(p_country_code text, p_name text, p_level_param text)
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
  join game.player_stats as s on s.user_id = c.user_id
  where lower(c.name) = lower(btrim(coalesce(p_name, ''))) and c.country_code = p_country_code;
  if v_user is null then
    raise exception 'candidate_invalid' using errcode = '22023';
  end if;
  if game.level_for_experience(v_experience) < game.param(p_level_param) then
    raise exception 'level_too_low' using errcode = '22023';
  end if;
  if game.national_office(v_user) is not null then
    raise exception 'office_incompatible' using errcode = '22023';
  end if;
  return v_user;
end;
$$;

create function public.appoint_minister(p_ministry text, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_office text := 'minister_' || coalesce(p_ministry, '');
  v_user uuid;
begin
  perform game.require_president(v_citizen);
  if p_ministry is null or p_ministry not in ('economy', 'defense', 'foreign_affairs', 'health', 'development') then
    raise exception 'office_invalid' using errcode = '22023';
  end if;
  v_user := game.appointee(v_citizen.country_code, p_name, 'minister_civil_level');
  perform game.leave_national_office(o.user_id)
  from game.offices as o where o.country_code = v_citizen.country_code and o.office = v_office;
  perform game.take_office(v_citizen.country_code, v_office, v_user, 'appointment');
end;
$$;
comment on function public.appoint_minister(text, text) is 'The president appoints (or replaces) a minister: a national of civil level ≥ 10 without another office.';
grant execute on function public.appoint_minister(text, text) to authenticated;

create function public.appoint_governor(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_user uuid;
begin
  perform game.require_president(v_citizen);
  v_user := game.appointee(v_citizen.country_code, p_name, 'governor_civil_level');
  perform game.leave_national_office(o.user_id)
  from game.offices as o where o.country_code = v_citizen.country_code and o.office = 'central_bank_governor';
  perform game.take_office(v_citizen.country_code, 'central_bank_governor', v_user, 'appointment');
end;
$$;
comment on function public.appoint_governor(text) is 'The president appoints (or replaces) the Central Bank governor: a national of civil level ≥ 15 without another office.';
grant execute on function public.appoint_governor(text) to authenticated;

-- The president removes a minister ('economy', …) or the governor ('central_bank_governor').
create function public.dismiss_official(p_office text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_office text := case when p_office = 'central_bank_governor' then p_office else 'minister_' || coalesce(p_office, '') end;
  v_holder uuid;
begin
  perform game.require_president(v_citizen);
  if v_office not in ('minister_economy', 'minister_defense', 'minister_foreign_affairs', 'minister_health',
                      'minister_development', 'central_bank_governor') then
    raise exception 'office_invalid' using errcode = '22023';
  end if;
  select user_id into v_holder from game.offices where country_code = v_citizen.country_code and office = v_office;
  if v_holder is null then
    raise exception 'no_office' using errcode = 'P0002';
  end if;
  perform game.leave_national_office(v_holder);
end;
$$;
comment on function public.dismiss_official(text) is 'The president removes a minister or the governor; the office stays vacant.';
grant execute on function public.dismiss_official(text) to authenticated;

-- Ministers, the governor and members of Congress resign at once; the president and vice president need Congress.
create function public.resign_office()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_office text := game.national_office(v_citizen.user_id);
begin
  if v_office is null then
    raise exception 'no_office' using errcode = 'P0002';
  end if;
  if v_office in ('president', 'vice_president') then
    raise exception 'resignation_needs_congress' using errcode = '22023';
  end if;
  return game.leave_national_office(v_citizen.user_id);
end;
$$;
comment on function public.resign_office() is 'Leaves a ministry, the Central Bank or a seat in Congress (filled from the list).';
grant execute on function public.resign_office() to authenticated;

-- Congress motions ----------------------------------------------------------------------------------------------

create table game.congress_motions (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  kind text not null check (kind in ('resignation', 'inactivity_removal', 'impeachment')),
  target_user_id uuid not null references game.citizens (user_id) on delete cascade,
  target_office text not null check (target_office in ('president', 'vice_president')),
  proposed_by uuid not null references game.citizens (user_id) on delete cascade,
  members integer not null check (members >= 0),
  opened_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  yes integer,
  no integer,
  abstain integer,
  closed_at timestamptz,
  constraint congress_motions_closed check ((status = 'open') = (closed_at is null))
);
alter table game.congress_motions enable row level security;
comment on table game.congress_motions is
  'Votes of Congress on the resignation, removal for inactivity or impeachment of the president or vice president.';
create unique index congress_motions_one_open on game.congress_motions (target_user_id, kind) where status = 'open';
create index congress_motions_country_idx on game.congress_motions (country_code, opened_at);
create index congress_motions_open_idx on game.congress_motions (closes_at) where status = 'open';
create index congress_motions_proposer_idx on game.congress_motions (proposed_by);

create table game.motion_votes (
  motion_id bigint not null references game.congress_motions (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  choice text not null check (choice in ('yes', 'no', 'abstain')),
  cast_at timestamptz not null,
  primary key (motion_id, user_id)
);
alter table game.motion_votes enable row level security;
comment on table game.motion_votes is 'Roll call of Congress: public, one vote per member and motion.';
create index motion_votes_user_idx on game.motion_votes (user_id);

create function game.open_motion(p_country_code text, p_kind text, p_target uuid, p_office text, p_by uuid)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.congress_motions (country_code, kind, target_user_id, target_office, proposed_by, members,
                                     opened_at, closes_at)
  values (p_country_code, p_kind, p_target, p_office, p_by,
          (select count(*)::integer from game.mandates
           where country_code = p_country_code and office = 'congress' and ended_at is null),
          game.now(), game.now() + make_interval(hours => game.param('motion_vote_hours')::integer))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'motion_open' using errcode = '22023';
end;
$$;

-- Counts a motion once its 24 hours are over. Resignation: quorum (an absolute majority of the members takes
-- part, abstentions included) and more yes than no. Removal for inactivity: yes from an absolute majority of all
-- members. Impeachment: yes from at least 2/3 of all members. Approval vacates the office and fills it at once.
create function game.close_motion(p_motion_id bigint)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_m game.congress_motions;
  v_yes integer;
  v_no integer;
  v_abstain integer;
  v_approved boolean;
begin
  select * into v_m from game.congress_motions where id = p_motion_id for update;
  if v_m.status <> 'open' or game.now() < v_m.closes_at then
    return v_m.status;
  end if;
  select count(*) filter (where choice = 'yes')::integer, count(*) filter (where choice = 'no')::integer,
         count(*) filter (where choice = 'abstain')::integer
  into v_yes, v_no, v_abstain
  from game.motion_votes where motion_id = v_m.id;
  v_approved := v_m.members > 0 and case v_m.kind
    when 'resignation' then (v_yes + v_no + v_abstain) * 2 > v_m.members and v_yes > v_no
    when 'inactivity_removal' then v_yes * 2 > v_m.members
    else v_yes * 3 >= v_m.members * 2
  end;
  update game.congress_motions
  set status = case when v_approved then 'approved' else 'rejected' end,
      yes = v_yes, no = v_no, abstain = v_abstain, closed_at = game.now()
  where id = v_m.id;
  if v_approved and game.holds_office(v_m.target_user_id, v_m.country_code, array[v_m.target_office]) then
    perform game.vacate_executive(v_m.country_code, v_m.target_office);
  end if;
  return case when v_approved then 'approved' else 'rejected' end;
end;
$$;

create function game.require_congress_member(p_citizen game.citizens)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if coalesce(game.national_office(p_citizen.user_id), '') <> 'congress' then
    raise exception 'not_in_congress' using errcode = '42501';
  end if;
end;
$$;

create function public.request_resignation()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_office text := game.national_office(v_citizen.user_id);
begin
  if v_office is null or v_office not in ('president', 'vice_president') then
    raise exception 'no_office' using errcode = 'P0002';
  end if;
  return game.open_motion(v_citizen.country_code, 'resignation', v_citizen.user_id, v_office, v_citizen.user_id);
end;
$$;
comment on function public.request_resignation() is 'The president or vice president asks Congress to accept their resignation.';
grant execute on function public.request_resignation() to authenticated;

create function public.propose_removal(p_office text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_target uuid;
begin
  perform game.require_congress_member(v_citizen);
  if p_office is null or p_office not in ('president', 'vice_president') then
    raise exception 'office_invalid' using errcode = '22023';
  end if;
  select user_id into v_target from game.offices where country_code = v_citizen.country_code and office = p_office;
  if v_target is null then
    raise exception 'no_office' using errcode = 'P0002';
  end if;
  if coalesce((select last_sign_in_at from auth.users where id = v_target), '-infinity')
     > game.now() - make_interval(hours => game.param('inactivity_removal_hours')::integer) then
    raise exception 'not_inactive' using errcode = '22023';
  end if;
  return game.open_motion(v_citizen.country_code, 'inactivity_removal', v_target, p_office, v_citizen.user_id);
end;
$$;
comment on function public.propose_removal(text) is
  'A member of Congress proposes removing the president or vice president after 72 hours without signing in.';
grant execute on function public.propose_removal(text) to authenticated;

create function public.propose_impeachment()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_target uuid;
begin
  perform game.require_congress_member(v_citizen);
  select user_id into v_target from game.offices where country_code = v_citizen.country_code and office = 'president';
  if v_target is null then
    raise exception 'no_office' using errcode = 'P0002';
  end if;
  return game.open_motion(v_citizen.country_code, 'impeachment', v_target, 'president', v_citizen.user_id);
end;
$$;
comment on function public.propose_impeachment() is 'A member of Congress opens the impeachment of the president.';
grant execute on function public.propose_impeachment() to authenticated;

create function public.vote_motion(p_motion_id bigint, p_choice text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_m game.congress_motions;
begin
  perform game.close_motion(p_motion_id);
  select * into v_m from game.congress_motions where id = p_motion_id;
  if not found or v_m.country_code <> v_citizen.country_code then
    raise exception 'motion_not_found' using errcode = 'P0002';
  end if;
  if v_m.status <> 'open' then
    raise exception 'voting_closed' using errcode = '22023';
  end if;
  perform game.require_congress_member(v_citizen);
  if p_choice is null or p_choice not in ('yes', 'no', 'abstain') then
    raise exception 'office_invalid' using errcode = '22023';
  end if;
  insert into game.motion_votes (motion_id, user_id, choice, cast_at) values (p_motion_id, v_citizen.user_id, p_choice, game.now());
exception when unique_violation then
  raise exception 'already_voted' using errcode = '22023';
end;
$$;
comment on function public.vote_motion(bigint, text) is 'A member of Congress votes yes, no or abstain on a motion; votes are public.';
grant execute on function public.vote_motion(bigint, text) to authenticated;

-- The hourly job also closes motions and rewards ministers ------------------------------------------------------

-- 5 GOLD for each full month a minister completes in office (spec section 3).
create function game.reward_ministers()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_m game.mandates;
  v_months integer;
  v_paid integer := 0;
begin
  for v_m in select * from game.mandates where office like 'minister_%' and ended_at is null for update loop
    v_months := (extract(year from age(game.now(), v_m.began_at)) * 12 + extract(month from age(game.now(), v_m.began_at)))::integer;
    while v_m.months_rewarded < v_months loop
      v_m.months_rewarded := v_m.months_rewarded + 1;
      perform game.post(
        'election_reward', 'minister_reward:' || v_m.id::text || ':' || v_m.months_rewarded::text, null,
        array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(v_m.user_id, 'GOLD'),
                  game.param('reward_minister_gold')::bigint, 'election_reward', null)::game.ledger_leg]
      );
      v_paid := v_paid + 1;
    end loop;
    update game.mandates set months_rewarded = v_m.months_rewarded where id = v_m.id;
  end loop;
  return v_paid;
end;
$$;

create or replace function game.job_elections(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_advanced integer := 0;
  v_closed integer := 0;
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
  for v_id in select id from game.congress_motions where status = 'open' and closes_at <= game.now() order by id loop
    perform game.close_motion(v_id);
    v_closed := v_closed + 1;
  end loop;
  -- Every party and every country in play always has an election taking candidacies.
  for v_party in select id from game.parties loop
    perform game.party_election(v_party.id);
  end loop;
  for v_country in select code from game.countries where is_active loop
    perform game.national_election(v_country.code, 'president');
    perform game.national_election(v_country.code, 'congress');
  end loop;
  return jsonb_build_object('advanced', v_advanced, 'motions', v_closed, 'minister_rewards', game.reward_ministers());
end;
$$;
update game.scheduled_jobs
set description = 'Moves elections on their UTC calendar, closes motions of Congress and rewards ministers.'
where name = 'elections';

-- Reads --------------------------------------------------------------------------------------------------------

create function public.get_cabinet(p_country_code text)
returns table (office text, name text, party_name text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.office, c.name, p.name, o.since
  from game.offices as o
  join game.citizens as c on c.user_id = o.user_id
  left join game.party_memberships as m on m.user_id = o.user_id
  left join game.parties as p on p.id = m.party_id
  where o.country_code = p_country_code
  order by array_position(array['president', 'vice_president', 'minister_economy', 'minister_defense',
                                'minister_foreign_affairs', 'minister_health', 'minister_development',
                                'central_bank_governor'], o.office);
$$;
comment on function public.get_cabinet(text) is 'Who holds each executive office of a country.';
grant execute on function public.get_cabinet(text) to anon, authenticated;

create function public.get_my_office()
returns table (office text, country_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select game.national_office(c.user_id), c.country_code
  from game.citizens as c
  where c.user_id = auth.uid() and game.national_office(c.user_id) is not null;
$$;
comment on function public.get_my_office() is 'The signed-in player''s national office, or no rows.';
grant execute on function public.get_my_office() to authenticated;

create function public.list_motions(p_country_code text)
returns table (
  motion_id bigint, kind text, target_name text, target_office text, proposed_by_name text, members integer,
  opened_at timestamptz, closes_at timestamptz, status text, yes integer, no integer, abstain integer,
  my_vote text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.kind, t.name, m.target_office, p.name, m.members, m.opened_at, m.closes_at,
         case when m.status = 'open' and game.now() >= m.closes_at then 'counting' else m.status end,
         coalesce(m.yes, (select count(*)::integer from game.motion_votes as v where v.motion_id = m.id and v.choice = 'yes')),
         coalesce(m.no, (select count(*)::integer from game.motion_votes as v where v.motion_id = m.id and v.choice = 'no')),
         coalesce(m.abstain, (select count(*)::integer from game.motion_votes as v where v.motion_id = m.id and v.choice = 'abstain')),
         (select v.choice from game.motion_votes as v where v.motion_id = m.id and v.user_id = auth.uid())
  from game.congress_motions as m
  join game.citizens as t on t.user_id = m.target_user_id
  join game.citizens as p on p.user_id = m.proposed_by
  where m.country_code = p_country_code
  order by m.status <> 'open', m.opened_at desc
  limit 20;
$$;
comment on function public.list_motions(text) is 'Open and recent motions of Congress with their public count.';
grant execute on function public.list_motions(text) to anon, authenticated;

create function public.list_motion_votes(p_motion_id bigint)
returns table (name text, choice text, cast_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, v.choice, v.cast_at
  from game.motion_votes as v
  join game.citizens as c on c.user_id = v.user_id
  where v.motion_id = p_motion_id
  order by v.cast_at;
$$;
comment on function public.list_motion_votes(bigint) is 'The public roll call of a motion.';
grant execute on function public.list_motion_votes(bigint) to anon, authenticated;

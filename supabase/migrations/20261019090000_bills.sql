-- G4 · Bills and decrees: initiative limits, 24-hour votes of Congress, quorum and majorities, budget escrow,
-- atomic execution or approved-but-not-executed, the vice president's tie-break, presidential decrees
-- (spec sections 2, 3 and 12.5, ADR 0027).
--
-- game.bills               a bill from its presentation: kind, terms, the seats it counts over, the count and how
--                          it ended (voting → rejected | executed | not_executed); never withdrawn
-- game.bill_reservations   the holds that lock every unit a bill would spend, per currency and origin, from its
--                          presentation; released on rejection or failed execution, captured on execution
-- game.bill_votes          the public roll call: one vote per member of Congress and bill
-- game.decrees             administrative decrees of the president: published text, no money
-- Kinds: ordinary (text only), taxes (VAT, tariff, work tax, export tax, minimum wage) and gold_transfer (GOLD
-- from the Treasury to another country's Treasury). Simple majority of valid votes (yes and no); ties go to the
-- vice president's tie-break. Quorum: an absolute majority of the seats occupied at presentation takes part.
-- Initiative per term: president unlimited, ministers 1, members of Congress 3, the vice president and the
-- governor none.
-- congress_motions.tiebreak: the vice president also breaks ties on resignations (not their own).
--
-- public.propose_bill, vote_bill, break_tie, break_motion_tie, issue_decree, list_bills, list_bill_votes,
--   get_my_initiative, list_decrees; the hourly elections job also closes bills.
--
-- Errors (ADR 0005): no_initiative, initiative_exhausted, bill_kind_invalid, bill_title_invalid,
-- bill_terms_invalid, country_invalid, country_inactive, insufficient_funds, bill_not_found, voting_closed,
-- already_voted, choice_invalid, not_vice_president, not_president, decree_invalid, motion_not_found.
--
-- Rollback: drop the public functions created here, game.close_bill, game.execute_bill, game.release_bill,
-- game.bill_terms, game.initiative, game.decrees, game.bill_votes, game.bill_reservations, game.bills and
-- congress_motions.tiebreak; restore game.close_motion and game.job_elections from 20261018090000; delete the
-- balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('bill_vote_hours', 24, 'How long Congress votes a bill.'),
  ('bills_per_term_congress', 3, 'Bills a member of Congress may present per term.'),
  ('bills_per_term_minister', 1, 'Bills a minister may present per term.');

-- Bills ----------------------------------------------------------------------------------------------------------

create table game.bills (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  kind text not null check (kind in ('ordinary', 'taxes', 'gold_transfer')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  terms jsonb not null default '{}'::jsonb,
  majority text not null check (majority in ('simple', 'two_thirds')),
  proposed_by uuid not null references game.citizens (user_id) on delete cascade,
  proposer_office text not null,
  mandate_id bigint references game.mandates (id),
  members integer not null check (members >= 0),
  opened_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'voting' check (status in ('voting', 'rejected', 'executed', 'not_executed')),
  yes integer,
  no integer,
  abstain integer,
  tiebreak text check (tiebreak in ('yes', 'no')),
  failure text check (char_length(failure) <= 200),
  idempotency_key uuid unique,
  closed_at timestamptz,
  constraint bills_closed check ((status = 'voting') = (closed_at is null))
);
alter table game.bills enable row level security;
comment on table game.bills is 'Bills presented to Congress; they cannot be withdrawn. Funds are locked from presentation.';
comment on column game.bills.members is 'Seats occupied at presentation: the base of the quorum.';
comment on column game.bills.failure is 'Why an approved bill could not be executed (approved but not executed).';
create index bills_country_idx on game.bills (country_code, opened_at);
create index bills_voting_idx on game.bills (closes_at) where status = 'voting';
create index bills_mandate_idx on game.bills (mandate_id) where mandate_id is not null;
create index bills_proposer_idx on game.bills (proposed_by);

create table game.bill_reservations (
  bill_id bigint not null references game.bills (id),
  hold_id bigint not null unique references game.ledger_holds (id),
  primary key (bill_id, hold_id)
);
alter table game.bill_reservations enable row level security;
comment on table game.bill_reservations is 'The holds that lock what a bill would spend, from presentation until it ends.';

create table game.bill_votes (
  bill_id bigint not null references game.bills (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  choice text not null check (choice in ('yes', 'no', 'abstain')),
  cast_at timestamptz not null,
  primary key (bill_id, user_id)
);
alter table game.bill_votes enable row level security;
comment on table game.bill_votes is 'Roll call of Congress on bills: public, one vote per member and bill.';
create index bill_votes_user_idx on game.bill_votes (user_id);

alter table game.congress_motions add column tiebreak text check (tiebreak in ('yes', 'no'));
comment on column game.congress_motions.tiebreak is 'The vice president''s vote, counted only on a tied resignation.';

-- Terms of each kind ---------------------------------------------------------------------------------------------

-- Checks and normalizes the terms of a bill. Taxes: any of vat, tariff, work_tax, export_tax (fractions within
-- their legal ranges) and minimum_wage (hundredths). Gold transfer: {country_code, amount} in GOLD hundredths.
create function game.bill_terms(p_country_code text, p_kind text, p_terms jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_terms jsonb := coalesce(p_terms, '{}'::jsonb);
  v_key text;
  v_value numeric;
  v_out jsonb := '{}'::jsonb;
  v_ranges constant jsonb := '{"vat": 0.25, "tariff": 0.50, "work_tax": 0.30, "export_tax": 1}'::jsonb;
begin
  if jsonb_typeof(v_terms) <> 'object' then
    raise exception 'bill_terms_invalid' using errcode = '22023';
  end if;
  case p_kind
    when 'ordinary' then
      return '{}'::jsonb;
    when 'taxes' then
      for v_key in select jsonb_object_keys(v_terms) loop
        if jsonb_typeof(v_terms -> v_key) <> 'number' then
          raise exception 'bill_terms_invalid' using errcode = '22023';
        end if;
        v_value := (v_terms ->> v_key)::numeric;
        if v_key = 'minimum_wage' then
          if v_value < 0 or v_value <> trunc(v_value) then
            raise exception 'bill_terms_invalid' using errcode = '22023';
          end if;
        elsif not v_ranges ? v_key or v_value < 0 or v_value > (v_ranges ->> v_key)::numeric
              or v_value <> round(v_value, 4) then
          raise exception 'bill_terms_invalid' using errcode = '22023';
        end if;
        v_out := v_out || jsonb_build_object(v_key, v_value);
      end loop;
      if v_out = '{}'::jsonb then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      return v_out;
    when 'gold_transfer' then
      if jsonb_typeof(v_terms -> 'amount') <> 'number' or jsonb_typeof(v_terms -> 'country_code') <> 'string' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_value := (v_terms ->> 'amount')::numeric;
      if v_value <= 0 or v_value <> trunc(v_value) or v_value > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      if v_terms ->> 'country_code' = p_country_code
         or not exists (select 1 from game.countries where code = v_terms ->> 'country_code') then
        raise exception 'country_invalid' using errcode = '22023';
      end if;
      return jsonb_build_object('country_code', v_terms ->> 'country_code', 'amount', v_value::bigint);
    else
      raise exception 'bill_kind_invalid' using errcode = '22023';
  end case;
end;
$$;

-- Who may present a bill and the mandate it counts against: the president without limit, ministers and members of
-- Congress up to their per-term allowance; the vice president, the governor and everyone else have no initiative.
create function game.initiative(p_user_id uuid)
returns table (office text, mandate_id bigint, used integer, allowed integer)
language sql
stable
set search_path = ''
as $$
  with o as (select game.national_office(p_user_id) as office),
  m as (
    select o.office,
           (select id from game.mandates
            where user_id = p_user_id and office = o.office and ended_at is null
            order by began_at desc limit 1) as mandate_id
    from o
  )
  select m.office, m.mandate_id,
         (select count(*)::integer from game.bills as b where b.mandate_id = m.mandate_id),
         case when m.office = 'president' then null
              when m.office like 'minister_%' then game.param('bills_per_term_minister')::integer
              when m.office = 'congress' then game.param('bills_per_term_congress')::integer
              else 0 end
  from m;
$$;

-- Applies an approved bill. Raises on any failure; the caller runs it in a subtransaction.
create function game.execute_bill(p_bill game.bills)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_hold bigint;
begin
  case p_bill.kind
    when 'ordinary' then
      null;
    when 'taxes' then
      update game.country_policies
      set vat = coalesce((p_bill.terms ->> 'vat')::numeric, vat),
          tariff = coalesce((p_bill.terms ->> 'tariff')::numeric, tariff),
          work_tax = coalesce((p_bill.terms ->> 'work_tax')::numeric, work_tax),
          export_tax = coalesce((p_bill.terms ->> 'export_tax')::numeric, export_tax),
          minimum_wage = coalesce((p_bill.terms ->> 'minimum_wage')::bigint, minimum_wage)
      where country_code = p_bill.country_code;
    when 'gold_transfer' then
      if not (select is_active from game.countries where code = p_bill.terms ->> 'country_code') then
        raise exception 'country_inactive' using errcode = '22023';
      end if;
      select hold_id into v_hold from game.bill_reservations where bill_id = p_bill.id;
      perform game.capture_hold(
        v_hold,
        array[row(null, game.treasury_account(p_bill.terms ->> 'country_code', 'GOLD'),
                  (p_bill.terms ->> 'amount')::bigint, 'gold_transfer', p_bill.title)::game.ledger_leg],
        'bill_execute:' || p_bill.id::text, p_bill.proposed_by
      );
  end case;
end;
$$;

-- Returns every unit still locked by a bill to where it came from.
create function game.release_bill(p_bill_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_hold bigint;
begin
  for v_hold in
    select r.hold_id from game.bill_reservations as r
    join game.ledger_holds as h on h.id = r.hold_id
    where r.bill_id = p_bill_id and h.status = 'open'
    order by r.hold_id
  loop
    perform game.release_hold(v_hold, 'bill_release:' || v_hold::text);
  end loop;
end;
$$;

-- Counts a bill once its 24 hours are over. Quorum: an absolute majority of the seats occupied at presentation
-- takes part (abstentions count). Simple majority: more yes than no, a tie goes to the vice president's tie-break;
-- two thirds: 3 × yes ≥ 2 × (yes + no). Approval executes atomically; a failure reverts every effect, releases the
-- funds and leaves the bill approved but not executed.
create function game.close_bill(p_bill_id bigint)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_bill game.bills;
  v_yes integer;
  v_no integer;
  v_abstain integer;
  v_approved boolean;
  v_status text;
  v_failure text;
begin
  select * into v_bill from game.bills where id = p_bill_id for update;
  if not found or v_bill.status <> 'voting' or game.now() < v_bill.closes_at then
    return v_bill.status;
  end if;
  select count(*) filter (where choice = 'yes')::integer, count(*) filter (where choice = 'no')::integer,
         count(*) filter (where choice = 'abstain')::integer
  into v_yes, v_no, v_abstain
  from game.bill_votes where bill_id = v_bill.id;
  v_approved := (v_yes + v_no + v_abstain) * 2 > v_bill.members and v_yes + v_no > 0 and case v_bill.majority
    when 'simple' then v_yes > v_no or (v_yes = v_no and v_bill.tiebreak is not distinct from 'yes')
    else v_yes * 3 >= (v_yes + v_no) * 2
  end;

  if not v_approved then
    v_status := 'rejected';
  else
    begin
      perform game.execute_bill(v_bill);
      v_status := 'executed';
    exception when others then
      get stacked diagnostics v_failure = message_text;
      v_status := 'not_executed';
    end;
  end if;
  if v_status <> 'executed' then
    perform game.release_bill(v_bill.id);
  end if;
  update game.bills
  set status = v_status, yes = v_yes, no = v_no, abstain = v_abstain, failure = left(v_failure, 200),
      closed_at = game.now()
  where id = v_bill.id;
  return v_status;
end;
$$;

-- Resignations now count the vice president's tie-break ------------------------------------------------------------

create or replace function game.close_motion(p_motion_id bigint)
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
    when 'resignation' then (v_yes + v_no + v_abstain) * 2 > v_m.members
                            and (v_yes > v_no or (v_yes = v_no and v_yes > 0 and v_m.tiebreak is not distinct from 'yes'))
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

-- Actions --------------------------------------------------------------------------------------------------------

create function public.propose_bill(p_kind text, p_title text, p_body text, p_terms jsonb, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_initiative record;
  v_terms jsonb;
  v_id bigint;
  v_hold bigint;
begin
  if p_key is not null then
    select id into v_id from game.bills where idempotency_key = p_key;
    if found then
      return v_id;
    end if;
  end if;
  select * into v_initiative from game.initiative(v_citizen.user_id);
  if v_initiative.office is null or v_initiative.allowed = 0 then
    raise exception 'no_initiative' using errcode = '42501';
  end if;
  if v_initiative.allowed is not null then
    -- Serializes the proposals of one mandate so the allowance cannot be exceeded under concurrency.
    perform 1 from game.mandates where id = v_initiative.mandate_id for update;
    if (select count(*) from game.bills where mandate_id = v_initiative.mandate_id) >= v_initiative.allowed then
      raise exception 'initiative_exhausted' using errcode = '22023';
    end if;
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 120 or char_length(coalesce(p_body, '')) > 4000 then
    raise exception 'bill_title_invalid' using errcode = '22023';
  end if;
  v_terms := game.bill_terms(v_citizen.country_code, p_kind, p_terms);

  insert into game.bills (country_code, kind, title, body, terms, majority, proposed_by, proposer_office, mandate_id,
                          members, opened_at, closes_at, idempotency_key)
  values (v_citizen.country_code, p_kind, btrim(p_title), coalesce(btrim(p_body), ''), v_terms, 'simple',
          v_citizen.user_id, v_initiative.office, v_initiative.mandate_id,
          (select count(*)::integer from game.mandates
           where country_code = v_citizen.country_code and office = 'congress' and ended_at is null),
          game.now(), game.now() + make_interval(hours => game.param('bill_vote_hours')::integer), p_key)
  returning id into v_id;

  if p_kind = 'gold_transfer' then
    v_hold := game.hold(game.treasury_account(v_citizen.country_code, 'GOLD'), (v_terms ->> 'amount')::bigint,
                        'bill', 'bill:' || v_id::text, 'bill_hold:' || v_id::text, v_citizen.user_id);
    insert into game.bill_reservations (bill_id, hold_id) values (v_id, v_hold);
  end if;
  return v_id;
end;
$$;
comment on function public.propose_bill(text, text, text, jsonb, uuid) is
  'Presents a bill to Congress: voting opens for 24 hours and the funds it would spend are locked at once.';
grant execute on function public.propose_bill(text, text, text, jsonb, uuid) to authenticated;

create function public.vote_bill(p_bill_id bigint, p_choice text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_bill game.bills;
begin
  perform game.close_bill(p_bill_id);
  select * into v_bill from game.bills where id = p_bill_id;
  if not found or v_bill.country_code <> v_citizen.country_code then
    raise exception 'bill_not_found' using errcode = 'P0002';
  end if;
  if v_bill.status <> 'voting' then
    raise exception 'voting_closed' using errcode = '22023';
  end if;
  perform game.require_congress_member(v_citizen);
  if p_choice is null or p_choice not in ('yes', 'no', 'abstain') then
    raise exception 'choice_invalid' using errcode = '22023';
  end if;
  insert into game.bill_votes (bill_id, user_id, choice, cast_at) values (p_bill_id, v_citizen.user_id, p_choice, game.now());
exception when unique_violation then
  raise exception 'already_voted' using errcode = '22023';
end;
$$;
comment on function public.vote_bill(bigint, text) is 'A member of Congress votes yes, no or abstain on a bill; votes are public.';
grant execute on function public.vote_bill(bigint, text) to authenticated;

create function game.require_vice_president(p_citizen game.citizens)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not game.holds_office(p_citizen.user_id, p_citizen.country_code, array['vice_president']) then
    raise exception 'not_vice_president' using errcode = '42501';
  end if;
end;
$$;

-- The vice president presides over Congress and votes only to break ties: the vote is cast while voting is open
-- and counts only if the count ends tied. It cannot be changed.
create function public.break_tie(p_bill_id bigint, p_choice text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_bill game.bills;
begin
  perform game.close_bill(p_bill_id);
  select * into v_bill from game.bills where id = p_bill_id for update;
  if not found or v_bill.country_code <> v_citizen.country_code then
    raise exception 'bill_not_found' using errcode = 'P0002';
  end if;
  if v_bill.status <> 'voting' then
    raise exception 'voting_closed' using errcode = '22023';
  end if;
  perform game.require_vice_president(v_citizen);
  if p_choice is null or p_choice not in ('yes', 'no') then
    raise exception 'choice_invalid' using errcode = '22023';
  end if;
  if v_bill.tiebreak is not null then
    raise exception 'already_voted' using errcode = '22023';
  end if;
  update game.bills set tiebreak = p_choice where id = p_bill_id;
end;
$$;
comment on function public.break_tie(bigint, text) is
  'The vice president''s tie-break on a bill: counted only if yes and no end tied.';
grant execute on function public.break_tie(bigint, text) to authenticated;

create function public.break_motion_tie(p_motion_id bigint, p_choice text)
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
  select * into v_m from game.congress_motions where id = p_motion_id for update;
  if not found or v_m.country_code <> v_citizen.country_code or v_m.kind <> 'resignation' then
    raise exception 'motion_not_found' using errcode = 'P0002';
  end if;
  if v_m.status <> 'open' then
    raise exception 'voting_closed' using errcode = '22023';
  end if;
  perform game.require_vice_president(v_citizen);
  if v_m.target_user_id = v_citizen.user_id then
    raise exception 'not_vice_president' using errcode = '42501';
  end if;
  if p_choice is null or p_choice not in ('yes', 'no') then
    raise exception 'choice_invalid' using errcode = '22023';
  end if;
  if v_m.tiebreak is not null then
    raise exception 'already_voted' using errcode = '22023';
  end if;
  update game.congress_motions set tiebreak = p_choice where id = p_motion_id;
end;
$$;
comment on function public.break_motion_tie(bigint, text) is
  'The vice president''s tie-break on the president''s resignation: counted only on a tie.';
grant execute on function public.break_motion_tie(bigint, text) to authenticated;

-- Decrees --------------------------------------------------------------------------------------------------------

create table game.decrees (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  issued_by uuid not null references game.citizens (user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  idempotency_key uuid unique,
  issued_at timestamptz not null
);
alter table game.decrees enable row level security;
comment on table game.decrees is 'Administrative decrees of the president: public text within the law, never money.';
create index decrees_country_idx on game.decrees (country_code, issued_at);
create index decrees_issued_by_idx on game.decrees (issued_by);

create function public.issue_decree(p_title text, p_body text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_id bigint;
begin
  if p_key is not null then
    select id into v_id from game.decrees where idempotency_key = p_key;
    if found then
      return v_id;
    end if;
  end if;
  perform game.require_president(v_citizen);
  if p_title is null or char_length(btrim(p_title)) not between 3 and 120
     or p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'decree_invalid' using errcode = '22023';
  end if;
  insert into game.decrees (country_code, issued_by, title, body, idempotency_key, issued_at)
  values (v_citizen.country_code, v_citizen.user_id, btrim(p_title), btrim(p_body), p_key, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.issue_decree(text, text, uuid) is 'The president publishes an administrative decree.';
grant execute on function public.issue_decree(text, text, uuid) to authenticated;

-- The hourly job also closes bills -------------------------------------------------------------------------------

create or replace function game.job_elections(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_advanced integer := 0;
  v_closed integer := 0;
  v_bills integer := 0;
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
  for v_id in select id from game.bills where status = 'voting' and closes_at <= game.now() order by id loop
    perform game.close_bill(v_id);
    v_bills := v_bills + 1;
  end loop;
  -- Every party and every country in play always has an election taking candidacies.
  for v_party in select id from game.parties loop
    perform game.party_election(v_party.id);
  end loop;
  for v_country in select code from game.countries where is_active loop
    perform game.national_election(v_country.code, 'president');
    perform game.national_election(v_country.code, 'congress');
  end loop;
  return jsonb_build_object('advanced', v_advanced, 'motions', v_closed, 'bills', v_bills,
                            'minister_rewards', game.reward_ministers());
end;
$$;
update game.scheduled_jobs
set description = 'Moves elections on their UTC calendar, closes motions and bills of Congress and rewards ministers.'
where name = 'elections';

-- Reads ----------------------------------------------------------------------------------------------------------

create function public.list_bills(p_country_code text)
returns table (
  bill_id bigint, kind text, title text, body text, terms jsonb, majority text, proposed_by_name text,
  proposer_office text, members integer, opened_at timestamptz, closes_at timestamptz, status text, yes integer,
  no integer, abstain integer, tiebreak text, failure text, my_vote text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.kind, b.title, b.body, b.terms, b.majority, c.name, b.proposer_office, b.members, b.opened_at,
         b.closes_at,
         case when b.status = 'voting' and game.now() >= b.closes_at then 'counting' else b.status end,
         coalesce(b.yes, (select count(*)::integer from game.bill_votes as v where v.bill_id = b.id and v.choice = 'yes')),
         coalesce(b.no, (select count(*)::integer from game.bill_votes as v where v.bill_id = b.id and v.choice = 'no')),
         coalesce(b.abstain, (select count(*)::integer from game.bill_votes as v where v.bill_id = b.id and v.choice = 'abstain')),
         b.tiebreak, b.failure,
         (select v.choice from game.bill_votes as v where v.bill_id = b.id and v.user_id = auth.uid())
  from game.bills as b
  join game.citizens as c on c.user_id = b.proposed_by
  where b.country_code = p_country_code
  order by b.status <> 'voting', b.opened_at desc
  limit 30;
$$;
comment on function public.list_bills(text) is 'Bills under vote and recent ones, with their public count and outcome.';
grant execute on function public.list_bills(text) to anon, authenticated;

create function public.list_bill_votes(p_bill_id bigint)
returns table (name text, choice text, cast_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, v.choice, v.cast_at
  from game.bill_votes as v
  join game.citizens as c on c.user_id = v.user_id
  where v.bill_id = p_bill_id
  order by v.cast_at;
$$;
comment on function public.list_bill_votes(bigint) is 'The public roll call of a bill.';
grant execute on function public.list_bill_votes(bigint) to anon, authenticated;

create function public.get_my_initiative()
returns table (office text, used integer, allowed integer)
language sql
stable
security definer
set search_path = ''
as $$
  select i.office, i.used, i.allowed
  from game.initiative(auth.uid()) as i
  where i.office is not null;
$$;
comment on function public.get_my_initiative() is
  'The bills the signed-in player presented this term and may present (allowed null: no limit).';
grant execute on function public.get_my_initiative() to authenticated;

create function public.list_decrees(p_country_code text)
returns table (decree_id bigint, title text, body text, issued_by_name text, issued_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.title, d.body, c.name, d.issued_at
  from game.decrees as d
  join game.citizens as c on c.user_id = d.issued_by
  where d.country_code = p_country_code
  order by d.issued_at desc
  limit 20;
$$;
comment on function public.list_decrees(text) is 'The latest decrees of a country.';
grant execute on function public.list_decrees(text) to anon, authenticated;

-- D06 · Citizenship (brief section 3): immediate citizenship, 7-day adaptation, waitlist and changes.
--
-- - Every citizen gets a number in their country (ARG-003413) and lives in the capital region.
-- - Adaptation: during the first 7 days of the account war damage counts at half; voting in elections waits
--   7 days after the current citizenship started (sign-up or change).
-- - Waitlist: a sign-up can ask for a country that is not in play; the player starts elsewhere and moves
--   at once when that country opens.
-- - Changes are requested from the other country. Its rule decides: automatic approval, or review by its
--   Interior minister or president. Unanswered requests are approved after 72 hours by the hourly
--   citizenship_timeouts job. At most one change every 30 days. Leaving a country leaves its offices.
-- - game.offices holds who governs; elections and appointments fill it from D19 and D20.
--
-- Errors are stable codes (ADR 0005): no_citizen, country_not_in_play, same_country, change_too_soon,
-- request_pending, request_not_found, not_allowed, waitlist_country_invalid.
--
-- Rollback: drop the public functions created here, the job and its scheduled_jobs row, the tables
-- game.citizenship_requests, game.offices, game.waitlist, game.citizen_counters, the new citizens and
-- countries columns, and restore get_my_citizen and create_citizen_for_new_user from 20261009153427.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Lock advice from squawk is acknowledged statement by statement below: game.countries has 250 static
-- rows and game.citizens is empty in the hosted projects (the game is not open yet), so the brief locks
-- of a plain constraint or index are harmless and keep the migration simple.

-- Countries: capital region and citizenship rule -----------------------------------------------------

-- squawk-ignore adding-foreign-key-constraint
alter table game.countries add column capital_region_code text references game.regions (code);
alter table game.countries add column citizenship_mode text not null default 'review';
-- squawk-ignore constraint-missing-not-valid
alter table game.countries add constraint countries_citizenship_mode_is_known
  check (citizenship_mode in ('automatic', 'review'));
comment on column game.countries.capital_region_code is 'Region where new citizens live.';
comment on column game.countries.citizenship_mode is
  'automatic: requests are approved at once; review: the Interior minister or the president decides (72 h limit).';

update game.countries as c
set capital_region_code = v.region
from (
  values ('ARG', 'ARG-01'), ('BRA', 'BRA-08'), ('CAN', 'CAN-03'), ('CHL', 'CHL-03'), ('DEU', 'DEU-04'),
         ('ESP', 'ESP-03'), ('FRA', 'FRA-01'), ('GBR', 'GBR-01'), ('ITA', 'ITA-03'), ('MEX', 'MEX-05'),
         ('PRT', 'PRT-01'), ('PRY', 'PRY-03'), ('USA', 'USA-05')
) as v (country, region)
where c.code = v.country;

-- squawk-ignore constraint-missing-not-valid
alter table game.countries add constraint countries_active_have_capital
  check (not is_active or capital_region_code is not null);

-- Citizens: number, residence and dates ----------------------------------------------------------------

create table game.citizen_counters (
  country_code text primary key references game.countries (code),
  last_number integer not null check (last_number >= 0)
);
alter table game.citizen_counters enable row level security;
comment on table game.citizen_counters is 'Last citizen number given in each country.';

create function game.next_citizen_number(p_country_code text)
returns integer
language sql
set search_path = ''
as $$
  -- The upsert locks the country's row, so concurrent sign-ups get consecutive numbers.
  insert into game.citizen_counters as counter (country_code, last_number)
  values (p_country_code, 1)
  on conflict (country_code) do update set last_number = counter.last_number + 1
  returning last_number;
$$;

alter table game.citizens add column citizen_number integer;
-- squawk-ignore adding-foreign-key-constraint
alter table game.citizens add column region_code text references game.regions (code);
alter table game.citizens add column joined_at timestamptz;
alter table game.citizens add column citizen_since timestamptz;
alter table game.citizens add column last_change_at timestamptz;
comment on column game.citizens.citizen_number is 'Number in the current country, shown as ARG-003413.';
comment on column game.citizens.region_code is 'Region where the citizen lives.';
comment on column game.citizens.joined_at is 'When the account got its first citizenship (adaptation starts here).';
comment on column game.citizens.citizen_since is 'When the current citizenship started (voting in elections waits 7 days).';
comment on column game.citizens.last_change_at is 'Last change of country; the next one waits 30 days.';

-- Citizens created before this migration (local and test data only) get their citizenship now.
update game.citizens as c
set citizen_number = game.next_citizen_number(c.country_code),
    region_code = (select capital_region_code from game.countries where code = c.country_code),
    joined_at = c.created_at,
    citizen_since = c.created_at
where c.citizen_number is null;

-- squawk-ignore adding-not-nullable-field
alter table game.citizens alter column citizen_number set not null;
-- squawk-ignore adding-not-nullable-field
alter table game.citizens alter column region_code set not null;
-- squawk-ignore adding-not-nullable-field
alter table game.citizens alter column joined_at set not null;
-- squawk-ignore adding-not-nullable-field
alter table game.citizens alter column citizen_since set not null;
-- squawk-ignore constraint-missing-not-valid
alter table game.citizens add constraint citizens_number_is_positive check (citizen_number > 0);
-- squawk-ignore require-concurrent-index-creation
create unique index citizens_country_number_key on game.citizens (country_code, citizen_number);
-- squawk-ignore require-concurrent-index-creation
create index citizens_region_code_idx on game.citizens (region_code);

-- New citizens get a number, the capital and today's date.
create function game.assign_citizenship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.citizen_number := game.next_citizen_number(new.country_code);
  new.region_code := (select capital_region_code from game.countries where code = new.country_code);
  new.joined_at := game.now();
  new.citizen_since := new.joined_at;
  new.last_change_at := null;
  return new;
end;
$$;

create trigger citizens_assign_citizenship
before insert on game.citizens
for each row execute function game.assign_citizenship();

create function game.citizen_code(p_country_code text, p_number integer)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_country_code || '-' || lpad(p_number::text, 6, '0');
$$;
comment on function game.citizen_code(text, integer) is 'Citizen number as printed: ARG-003413.';

-- Adaptation rules, for the war (D16) and elections (D19) modules.
create function game.war_damage_factor(p_user_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case when game.now() < c.joined_at + interval '7 days' then 0.5 else 1 end
  from game.citizens as c
  where c.user_id = p_user_id;
$$;
comment on function game.war_damage_factor(uuid) is 'Damage multiplier: 0.5 during the first 7 days of the account.';

create function game.can_vote_in_elections(p_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select game.now() >= c.citizen_since + interval '7 days' from game.citizens as c where c.user_id = p_user_id),
    false
  );
$$;
comment on function game.can_vote_in_elections(uuid) is 'Elections need 7 days in the current citizenship.';

-- Waitlist -------------------------------------------------------------------------------------------

create table game.waitlist (
  user_id uuid primary key references auth.users (id) on delete cascade,
  country_code text not null references game.countries (code),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
alter table game.waitlist enable row level security;
comment on table game.waitlist is 'Players waiting for a country that is not in play. One country per player.';
create index waitlist_country_created_idx on game.waitlist (country_code, created_at);

create function game.join_waitlist(p_user_id uuid, p_country_code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from game.countries where code = p_country_code and not is_active) then
    raise exception 'waitlist_country_invalid' using errcode = '22023';
  end if;
  insert into game.waitlist (user_id, country_code, created_at)
  values (p_user_id, p_country_code, game.now())
  on conflict (user_id) do update
    set country_code = excluded.country_code, created_at = excluded.created_at, notified_at = null
    where game.waitlist.country_code is distinct from excluded.country_code;
end;
$$;

-- The sign-up trigger now also handles the waitlist choice.
create or replace function game.create_citizen_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.email_confirmed_at is not null
      or new.raw_user_meta_data is not distinct from old.raw_user_meta_data then
      return new;
    end if;
    delete from game.citizens where user_id = new.id;
    delete from game.waitlist where user_id = new.id;
  end if;

  if new.raw_user_meta_data ? 'citizen_name' then
    perform game.create_citizen(
      new.id,
      new.raw_user_meta_data ->> 'citizen_name',
      new.raw_user_meta_data ->> 'country_code',
      coalesce(new.raw_user_meta_data ->> 'locale', 'es'),
      new.raw_user_meta_data ->> 'signup_key'
    );
  end if;
  if nullif(new.raw_user_meta_data ->> 'waitlist_country_code', '') is not null then
    perform game.join_waitlist(new.id, new.raw_user_meta_data ->> 'waitlist_country_code');
  end if;
  return new;
end;
$$;

-- Offices --------------------------------------------------------------------------------------------

create table game.offices (
  country_code text not null references game.countries (code),
  office text not null check (office in ('president', 'vice_president', 'interior_minister')),
  user_id uuid not null references auth.users (id) on delete cascade,
  since timestamptz not null default now(),
  primary key (country_code, office)
);
alter table game.offices enable row level security;
comment on table game.offices is 'Who holds each office of a country. Elections and appointments (D19, D20) fill it.';
create index offices_user_id_idx on game.offices (user_id);

create function game.holds_office(p_user_id uuid, p_country_code text, p_offices text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from game.offices
    where user_id = p_user_id and country_code = p_country_code and office = any (p_offices)
  );
$$;

-- Citizenship changes --------------------------------------------------------------------------------

create table game.citizenship_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_country_code text not null references game.countries (code),
  to_country_code text not null references game.countries (code),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  -- How it was decided: rule (automatic mode), waitlist, office (minister or president), timeout (72 h).
  decided_by text check (decided_by in ('rule', 'waitlist', 'office', 'timeout', 'player')),
  decided_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null,
  decided_at timestamptz,
  constraint citizenship_requests_other_country check (from_country_code <> to_country_code),
  constraint citizenship_requests_decided_when_closed check (
    (status = 'pending') = (decided_at is null) and (status = 'pending') = (decided_by is null)
  )
);
alter table game.citizenship_requests enable row level security;
comment on table game.citizenship_requests is 'Requests to change citizenship, decided by the destination country.';
create unique index citizenship_requests_one_pending on game.citizenship_requests (user_id)
  where status = 'pending';
create index citizenship_requests_pending_by_country on game.citizenship_requests (to_country_code, created_at)
  where status = 'pending';
create index citizenship_requests_user_id_idx on game.citizenship_requests (user_id);

-- Applies an approval: new country, number and residence; offices in the old country are left.
create function game.approve_citizenship_request(p_request_id bigint, p_decided_by text, p_decider uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_request game.citizenship_requests;
begin
  update game.citizenship_requests
  set status = 'approved', decided_by = p_decided_by, decided_by_user_id = p_decider, decided_at = game.now()
  where id = p_request_id and status = 'pending'
  returning * into v_request;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  delete from game.offices where user_id = v_request.user_id;
  update game.citizens
  set country_code = v_request.to_country_code,
      citizen_number = game.next_citizen_number(v_request.to_country_code),
      region_code = (select capital_region_code from game.countries where code = v_request.to_country_code),
      citizen_since = game.now(),
      last_change_at = game.now()
  where user_id = v_request.user_id;
  delete from game.waitlist where user_id = v_request.user_id and country_code = v_request.to_country_code;
end;
$$;

-- Hourly job: requests without an answer for 72 hours are approved.
create function game.job_citizenship_timeouts(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_request record;
  v_approved integer := 0;
begin
  for v_request in
    select id from game.citizenship_requests
    where status = 'pending' and created_at <= p_slot - interval '72 hours'
    order by created_at
    for update skip locked
  loop
    perform game.approve_citizenship_request(v_request.id, 'timeout', null);
    v_approved := v_approved + 1;
  end loop;
  return jsonb_build_object('approved', v_approved);
end;
$$;

insert into game.scheduled_jobs (name, cadence, origin, description)
values ('citizenship_timeouts', interval '1 hour', '2000-01-01 00:00:00+00',
        'Approves citizenship requests left unanswered for 72 hours.');

-- API: the player's own citizenship --------------------------------------------------------------------

-- The return type grows, which needs a new function. Only this web calls it, and it ignores extra columns.
-- squawk-ignore ban-drop-function
drop function public.get_my_citizen();

create function public.get_my_citizen()
returns table (
  name text,
  country_code text,
  locale text,
  citizen_code text,
  region_code text,
  joined_at timestamptz,
  citizen_since timestamptz,
  adaptation_ends_at timestamptz,
  votes_in_elections_from timestamptz,
  next_change_from timestamptz,
  reviews_citizenship boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.country_code, c.locale,
         game.citizen_code(c.country_code, c.citizen_number),
         c.region_code, c.joined_at, c.citizen_since,
         c.joined_at + interval '7 days',
         c.citizen_since + interval '7 days',
         c.last_change_at + interval '30 days',
         game.holds_office(c.user_id, c.country_code, array['president', 'interior_minister'])
  from game.citizens as c
  where c.user_id = auth.uid();
$$;
comment on function public.get_my_citizen() is 'The citizen of the signed-in account, with citizenship dates, or no rows.';
grant execute on function public.get_my_citizen() to authenticated;

create function public.get_my_waitlist()
returns table (country_code text, joined_at timestamptz, place integer)
language sql
stable
security definer
set search_path = ''
as $$
  select w.country_code, w.created_at,
         (select count(*) from game.waitlist as o
          where o.country_code = w.country_code
            and (o.created_at, o.user_id) <= (w.created_at, w.user_id))::integer
  from game.waitlist as w
  where w.user_id = auth.uid();
$$;
comment on function public.get_my_waitlist() is 'The country the player waits for and their place in line.';
grant execute on function public.get_my_waitlist() to authenticated;

create function public.count_waitlist(p_country_code text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from game.waitlist where country_code = p_country_code;
$$;
comment on function public.count_waitlist(text) is 'How many people wait for a country.';
grant execute on function public.count_waitlist(text) to anon, authenticated;

create function public.join_waitlist(p_country_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform game.join_waitlist(auth.uid(), p_country_code);
end;
$$;
comment on function public.join_waitlist(text) is 'Waits for a country that is not in play (replaces any earlier choice).';
grant execute on function public.join_waitlist(text) to authenticated;

create function public.leave_waitlist()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from game.waitlist where user_id = auth.uid();
$$;
comment on function public.leave_waitlist() is 'Stops waiting for a country.';
grant execute on function public.leave_waitlist() to authenticated;

-- API: citizenship changes ---------------------------------------------------------------------------

create function public.get_citizenship_rules(p_country_code text)
returns table (country_code text, mode text, election_wait_days integer, answer_hours integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.code, c.citizenship_mode, 7, 72
  from game.countries as c
  where c.code = p_country_code and c.is_active;
$$;
comment on function public.get_citizenship_rules(text) is 'What a country asks of new citizens.';
grant execute on function public.get_citizenship_rules(text) to anon, authenticated;

create function public.request_citizenship(p_country_code text)
returns table (request_id bigint, status text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_citizen game.citizens;
  v_target game.countries;
  v_request_id bigint;
begin
  select * into v_citizen from game.citizens where user_id = auth.uid() for update;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  select * into v_target from game.countries where code = p_country_code and is_active;
  if not found then
    raise exception 'country_not_in_play' using errcode = '22023';
  end if;
  if v_target.code = v_citizen.country_code then
    raise exception 'same_country' using errcode = '22023';
  end if;
  if v_citizen.last_change_at is not null and game.now() < v_citizen.last_change_at + interval '30 days' then
    raise exception 'change_too_soon' using errcode = '22023';
  end if;
  if exists (select 1 from game.citizenship_requests where user_id = v_citizen.user_id and status = 'pending') then
    raise exception 'request_pending' using errcode = '23505';
  end if;

  insert into game.citizenship_requests (user_id, from_country_code, to_country_code, created_at)
  values (v_citizen.user_id, v_citizen.country_code, v_target.code, game.now())
  returning id into v_request_id;

  -- Players who waited for this country move at once; so does anyone when its rule is automatic.
  if exists (select 1 from game.waitlist where user_id = v_citizen.user_id and country_code = v_target.code) then
    perform game.approve_citizenship_request(v_request_id, 'waitlist', null);
    return query select v_request_id, 'approved'::text;
  elsif v_target.citizenship_mode = 'automatic' then
    perform game.approve_citizenship_request(v_request_id, 'rule', null);
    return query select v_request_id, 'approved'::text;
  else
    return query select v_request_id, 'pending'::text;
  end if;
end;
$$;
comment on function public.request_citizenship(text) is 'Asks another country for citizenship; approved at once or left for review.';
grant execute on function public.request_citizenship(text) to authenticated;

create function public.cancel_citizenship_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update game.citizenship_requests
  set status = 'cancelled', decided_by = 'player', decided_by_user_id = auth.uid(), decided_at = game.now()
  where user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
end;
$$;
comment on function public.cancel_citizenship_request() is 'Withdraws the player''s pending request.';
grant execute on function public.cancel_citizenship_request() to authenticated;

create function public.get_my_citizenship_request()
returns table (
  request_id bigint,
  to_country_code text,
  status text,
  created_at timestamptz,
  decided_at timestamptz,
  answer_by timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.to_country_code, r.status, r.created_at, r.decided_at, r.created_at + interval '72 hours'
  from game.citizenship_requests as r
  where r.user_id = auth.uid()
  order by r.created_at desc, r.id desc
  limit 1;
$$;
comment on function public.get_my_citizenship_request() is 'The player''s latest citizenship request.';
grant execute on function public.get_my_citizenship_request() to authenticated;

-- API: review by the destination country -------------------------------------------------------------

create function public.list_citizenship_requests()
returns table (
  request_id bigint,
  citizen_name text,
  from_country_code text,
  account_age_days integer,
  created_at timestamptz,
  answer_by timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, c.name, r.from_country_code,
         floor(extract(epoch from game.now() - c.joined_at) / 86400)::integer,
         r.created_at, r.created_at + interval '72 hours'
  from game.citizenship_requests as r
  join game.citizens as c on c.user_id = r.user_id
  join game.citizens as me on me.user_id = auth.uid()
  where r.status = 'pending'
    and r.to_country_code = me.country_code
    and game.holds_office(me.user_id, me.country_code, array['president', 'interior_minister'])
  order by r.created_at;
$$;
comment on function public.list_citizenship_requests() is
  'Pending requests to the caller''s country; empty unless the caller is its president or Interior minister.';
grant execute on function public.list_citizenship_requests() to authenticated;

create function public.decide_citizenship_request(p_request_id bigint, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request game.citizenship_requests;
begin
  select * into v_request from game.citizenship_requests where id = p_request_id and status = 'pending' for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if not game.holds_office(auth.uid(), v_request.to_country_code, array['president', 'interior_minister']) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_approve then
    perform game.approve_citizenship_request(p_request_id, 'office', auth.uid());
  else
    update game.citizenship_requests
    set status = 'rejected', decided_by = 'office', decided_by_user_id = auth.uid(), decided_at = game.now()
    where id = p_request_id;
  end if;
end;
$$;
comment on function public.decide_citizenship_request(bigint, boolean) is
  'The destination''s president or Interior minister approves or rejects a request.';
grant execute on function public.decide_citizenship_request(bigint, boolean) to authenticated;

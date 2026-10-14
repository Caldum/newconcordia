-- L2 · Notifications (the outbox of game events), automatic world news, and balance telemetry
-- (spec sections 12.7 and 14, GDD D25–D26, ADR 0038).
--
-- game.notifications        events for one player or for every citizen of a country (no fan-out per citizen);
--                           written by triggers in the same transaction as the event, so they are an outbox: e-mail
--                           delivery can read them later (delivered_at)
-- game.notification_reads   up to when each player has seen their notifications
-- Events: injuries, offices taken, citizenship decisions (player); battles started and finished, bills presented,
-- motions opened, war authorizations and the voting of national elections (country); bills closed (proposer).
-- game.economy_snapshots    per day and currency: minted, burned, circulating and held money; taken by the hourly job
--
-- public.list_my_notifications, count_unread_notifications, mark_notifications_seen, admin_economy_snapshots
--
-- Rollback: drop the triggers and functions *_notify, the public functions created here,
-- game.economy_snapshots, game.take_economy_snapshot, game.notification_reads, game.notifications, game.notify;
-- restore game.hourly_world from 20261029090000.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table game.notifications (
  id bigint generated always as identity primary key,
  user_id uuid references game.citizens (user_id) on delete cascade,
  country_code text references game.countries (code),
  kind text not null check (kind ~ '^[a-z_]{3,40}$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  delivered_at timestamptz,
  constraint notifications_one_audience check ((user_id is null) <> (country_code is null))
);
alter table game.notifications enable row level security;
comment on table game.notifications is
  'Game events for a player or a whole country, written with the event: an outbox for screens and later e-mail.';
create index notifications_user_idx on game.notifications (user_id, created_at) where user_id is not null;
create index notifications_country_idx on game.notifications (country_code, created_at) where country_code is not null;
create index notifications_undelivered_idx on game.notifications (created_at) where delivered_at is null;

create table game.notification_reads (
  user_id uuid primary key references game.citizens (user_id) on delete cascade,
  seen_until timestamptz not null
);
alter table game.notification_reads enable row level security;
comment on table game.notification_reads is 'Up to when each player has seen their notifications.';

create function game.notify(p_user_id uuid, p_country_code text, p_kind text, p_payload jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into game.notifications (user_id, country_code, kind, payload, created_at)
  values (p_user_id, p_country_code, p_kind, coalesce(p_payload, '{}'::jsonb), game.now());
$$;

-- Triggers ----------------------------------------------------------------------------------------------------------

create function game.injuries_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.health_lost > 0 then
    perform game.notify(new.user_id, null, 'injury',
                        jsonb_build_object('cause', new.cause, 'health_lost', new.health_lost, 'health_after', new.health_after));
  end if;
  return null;
end;
$$;
create trigger injuries_notify after insert on game.injuries for each row execute function game.injuries_notify();

create function game.offices_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from game.citizens where user_id = new.user_id) then
    perform game.notify(new.user_id, null, 'office_taken', jsonb_build_object('office', new.office));
  end if;
  return null;
end;
$$;
create trigger offices_notify after insert on game.offices for each row execute function game.offices_notify();

create function game.citizenship_requests_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending'
     and exists (select 1 from game.citizens where user_id = new.user_id) then
    perform game.notify(new.user_id, null, 'citizenship_' || new.status,
                        jsonb_build_object('country_code', new.to_country_code));
  end if;
  return null;
end;
$$;
create trigger citizenship_requests_notify after update on game.citizenship_requests
for each row execute function game.citizenship_requests_notify();

create function game.battles_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payload jsonb := jsonb_build_object('battle_id', new.id, 'region_code', new.region_code, 'kind', new.kind,
                                        'attacker', new.attacker_country_code, 'defender', new.defender_country_code,
                                        'winner', new.winner);
begin
  if tg_op = 'INSERT' then
    perform game.notify(null, new.attacker_country_code, 'battle_started', v_payload);
    perform game.notify(null, new.defender_country_code, 'battle_started', v_payload);
  elsif new.status = 'finished' and old.status = 'active' then
    perform game.notify(null, new.attacker_country_code, 'battle_finished', v_payload);
    perform game.notify(null, new.defender_country_code, 'battle_finished', v_payload);
  end if;
  return null;
end;
$$;
create trigger battles_notify after insert or update of status on game.battles
for each row execute function game.battles_notify();

create function game.bills_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform game.notify(null, new.country_code, 'bill_presented',
                        jsonb_build_object('bill_id', new.id, 'title', new.title, 'kind', new.kind));
  elsif new.status <> 'voting' and old.status = 'voting' then
    perform game.notify(new.proposed_by, null, 'bill_closed',
                        jsonb_build_object('bill_id', new.id, 'title', new.title, 'status', new.status));
  end if;
  return null;
end;
$$;
create trigger bills_notify after insert or update of status on game.bills
for each row execute function game.bills_notify();

create function game.congress_motions_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform game.notify(null, new.country_code, 'motion_opened',
                      jsonb_build_object('motion_id', new.id, 'kind', new.kind,
                                         'target', (select name from game.citizens where user_id = new.target_user_id)));
  return null;
end;
$$;
create trigger congress_motions_notify after insert on game.congress_motions
for each row execute function game.congress_motions_notify();

create function game.war_authorizations_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform game.notify(null, new.country_code, 'war_authorized',
                      jsonb_build_object('target', new.target_country_code, 'expires_at', new.expires_at));
  return null;
end;
$$;
create trigger war_authorizations_notify after insert on game.war_authorizations
for each row execute function game.war_authorizations_notify();

create function game.elections_notify()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind in ('president', 'congress') and new.status = 'voting' and old.status <> 'voting' then
    perform game.notify(null, new.country_code, 'election_voting',
                        jsonb_build_object('kind', new.kind, 'voting_ends_at', new.voting_ends_at));
  end if;
  return null;
end;
$$;
create trigger elections_notify after update of status on game.elections
for each row execute function game.elections_notify();

-- Reads and marks ---------------------------------------------------------------------------------------------------

-- The player's own notifications and their country's since they became its citizen.
create function public.list_my_notifications(p_limit integer default 30)
returns table (notification_id bigint, kind text, payload jsonb, created_at timestamptz, unread boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.kind, n.payload, n.created_at,
         n.created_at > coalesce((select r.seen_until from game.notification_reads as r where r.user_id = c.user_id), '-infinity')
  from game.citizens as c
  join game.notifications as n
    on n.user_id = c.user_id
    or (n.country_code = c.country_code and n.created_at >= coalesce(c.citizen_since, c.joined_at, '-infinity'))
  where c.user_id = auth.uid()
  order by n.created_at desc, n.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;
comment on function public.list_my_notifications(integer) is 'The player''s notifications and their country''s, newest first.';
grant execute on function public.list_my_notifications(integer) to authenticated;

create function public.count_unread_notifications()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from game.citizens as c
  join game.notifications as n
    on n.user_id = c.user_id
    or (n.country_code = c.country_code and n.created_at >= coalesce(c.citizen_since, c.joined_at, '-infinity'))
  where c.user_id = auth.uid()
    and n.created_at > coalesce((select r.seen_until from game.notification_reads as r where r.user_id = c.user_id), '-infinity');
$$;
comment on function public.count_unread_notifications() is 'How many notifications the player has not seen.';
grant execute on function public.count_unread_notifications() to authenticated;

create function public.mark_notifications_seen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  insert into game.notification_reads (user_id, seen_until) values (v_citizen.user_id, game.now())
  on conflict (user_id) do update set seen_until = greatest(game.notification_reads.seen_until, excluded.seen_until);
end;
$$;
comment on function public.mark_notifications_seen() is 'Marks every notification up to now as seen.';
grant execute on function public.mark_notifications_seen() to authenticated;

-- Telemetry ----------------------------------------------------------------------------------------------------------

create table game.economy_snapshots (
  game_day date not null,
  currency_code text not null references game.currencies (code),
  minted bigint not null,
  burned bigint not null,
  circulating bigint not null,
  held bigint not null,
  taken_at timestamptz not null,
  primary key (game_day, currency_code)
);
alter table game.economy_snapshots enable row level security;
comment on table game.economy_snapshots is
  'Per day and currency: money created and destroyed, and money in hands (players, companies, parties, institutions) and held.';

-- Takes yesterday's snapshot once. Circulating and held are measured when it runs.
create function game.take_economy_snapshot()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_day date := game.game_day() - 1;
  v_count integer;
begin
  insert into game.economy_snapshots (game_day, currency_code, minted, burned, circulating, held, taken_at)
  select v_day, cur.code,
         coalesce((select sum(s.amount) from game.supply_changes as s
                   where s.currency_code = cur.code and s.direction = 'mint' and game.game_day(s.created_at) = v_day), 0),
         coalesce((select sum(s.amount) from game.supply_changes as s
                   where s.currency_code = cur.code and s.direction = 'burn' and game.game_day(s.created_at) = v_day), 0),
         coalesce((select sum(a.balance) from game.accounts as a
                   where a.currency_code = cur.code and a.kind not in ('issuer', 'sink', 'escrow')), 0),
         coalesce((select sum(a.balance) from game.accounts as a where a.currency_code = cur.code and a.kind = 'escrow'), 0),
         game.now()
  from game.currencies as cur
  where cur.code = 'GOLD' or exists (select 1 from game.countries where code = cur.country_code and is_active)
  on conflict (game_day, currency_code) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function game.hourly_world()
returns jsonb
language sql
set search_path = ''
as $$
  with cleanup as (
    delete from game.request_counters where window_start < game.now() - interval '1 hour' returning 1
  )
  select jsonb_build_object(
    'war_authorizations_expired', game.expire_war_authorizations(),
    'battles_finished', game.settle_battles(),
    'independence_wars_closed', (select count(*)::integer from game.independence_wars as w
                                 where w.status = 'active' and w.ends_at <= game.now()
                                   and game.close_independence_war(w.id) <> 'active'),
    'abuse_signals', game.scan_abuse(),
    'request_counters_removed', (select count(*) from cleanup),
    'economy_snapshots', game.take_economy_snapshot()
  );
$$;

create function public.admin_economy_snapshots(p_days integer default 14)
returns table (game_day date, currency_code text, minted bigint, burned bigint, circulating bigint, held bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select s.game_day, s.currency_code, s.minted, s.burned, s.circulating, s.held
  from game.economy_snapshots as s
  where s.game_day > game.game_day() - least(greatest(coalesce(p_days, 14), 1), 90)
  order by s.game_day desc, s.currency_code = 'GOLD' desc, s.currency_code;
end;
$$;
comment on function public.admin_economy_snapshots(integer) is 'Balance telemetry for admins: issuance, burns and money in hands per day.';
grant execute on function public.admin_economy_snapshots(integer) to authenticated;

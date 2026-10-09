-- D07 · Admin panel: turn countries on and off, enable disputed territories, and log every admin action.
--
-- - game.admins lists who may administer the game. The owner adds the first admin from the SQL editor
--   (docs/setup.md); there is no way to become an admin through the API.
-- - Changes to the world are scheduled and applied at the next day change (00:00 game time), as the admin
--   canvas says, so a country never disappears in the middle of a battle round. The day_change job applies
--   them. An admin can replace or cancel a scheduled change before it applies.
-- - game.admin_log keeps who did what, when, and the state before and after. It is append-only.
--
-- Errors are stable codes (ADR 0005): not_admin, not_found, no_change, country_not_ready.
--
-- Rollback: drop the public admin functions, restore game.job_day_change from 20261009143336, drop
-- game.world_changes, game.admin_log (after exporting it) and game.admins.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table game.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users (id) on delete set null
);
alter table game.admins enable row level security;
comment on table game.admins is 'Game administrators. Added by the owner from the SQL editor, never through the API.';

create function game.is_admin(p_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from game.admins where user_id = p_user_id);
$$;

create function game.require_admin()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or not game.is_admin(auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- Audit log ------------------------------------------------------------------------------------------

create table game.admin_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  -- Kept as text so the log still says who it was if the account is deleted.
  actor_name text not null,
  action text not null check (action ~ '^[a-z_]{3,40}$'),
  target text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
alter table game.admin_log enable row level security;
comment on table game.admin_log is 'Every admin action: who, what, when, before and after. Append-only.';
create index admin_log_created_at_idx on game.admin_log (created_at desc);
create index admin_log_actor_user_id_idx on game.admin_log (actor_user_id);

create function game.keep_admin_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_log is append-only' using errcode = '42501';
end;
$$;

create trigger admin_log_append_only
before update or delete or truncate on game.admin_log
for each statement execute function game.keep_admin_log();

create function game.log_admin_action(
  p_actor uuid,
  p_action text,
  p_target text,
  p_before jsonb,
  p_after jsonb
)
returns void
language sql
set search_path = ''
as $$
  insert into game.admin_log (actor_user_id, actor_name, action, target, before, after, created_at)
  values (
    p_actor,
    coalesce(
      (select name from game.citizens where user_id = p_actor),
      (select email from auth.users where id = p_actor),
      'system'
    ),
    p_action, p_target, p_before, p_after, game.now()
  );
$$;

-- Scheduled world changes ----------------------------------------------------------------------------

create table game.world_changes (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('country', 'region')),
  target text not null,
  enable boolean not null,
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null,
  -- Game day at whose start the change applies.
  apply_on date not null,
  applied_at timestamptz,
  cancelled_at timestamptz,
  constraint world_changes_closed_once check (applied_at is null or cancelled_at is null)
);
alter table game.world_changes enable row level security;
comment on table game.world_changes is 'Country and region switches scheduled for the next day change.';
create unique index world_changes_one_pending on game.world_changes (kind, target)
  where applied_at is null and cancelled_at is null;
create index world_changes_requested_by_idx on game.world_changes (requested_by);

create function game.country_state(p_code text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('is_active', is_active) from game.countries where code = p_code;
$$;

create function game.region_state(p_code text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('is_enabled', is_enabled) from game.regions where code = p_code;
$$;

-- Applies the changes due on a game day; each one is logged in the name of the admin who asked for it.
create function game.apply_world_changes(p_day date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_change game.world_changes;
  v_before jsonb;
  v_applied integer := 0;
begin
  for v_change in
    select * from game.world_changes
    where applied_at is null and cancelled_at is null and apply_on <= p_day
    order by requested_at
    for update
  loop
    if v_change.kind = 'country' then
      v_before := game.country_state(v_change.target);
      update game.countries set is_active = v_change.enable, updated_at = game.now()
      where code = v_change.target;
      perform game.log_admin_action(v_change.requested_by, 'apply_country', v_change.target, v_before,
                                    game.country_state(v_change.target));
    else
      v_before := game.region_state(v_change.target);
      update game.regions set is_enabled = v_change.enable, updated_at = game.now()
      where code = v_change.target;
      perform game.log_admin_action(v_change.requested_by, 'apply_region', v_change.target, v_before,
                                    game.region_state(v_change.target));
    end if;
    update game.world_changes set applied_at = game.now() where id = v_change.id;
    v_applied := v_applied + 1;
  end loop;
  return v_applied;
end;
$$;

-- The day change now also applies the scheduled world changes.
create or replace function game.job_day_change(p_slot timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_day date := game.game_day(p_slot);
begin
  insert into game.game_days (day, started_at)
  values (v_day, game.game_day_start(v_day))
  on conflict (day) do nothing;

  return jsonb_build_object('game_day', v_day, 'world_changes', game.apply_world_changes(v_day));
end;
$$;

create function game.schedule_world_change(p_kind text, p_target text, p_enable boolean)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_current boolean;
  v_pending game.world_changes;
  v_id bigint;
begin
  if p_kind = 'country' then
    select is_active into v_current from game.countries where code = p_target for update;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    -- Only countries with regions on the map, a color, official names and a capital can be in play.
    if p_enable and not exists (
      select 1 from game.countries as c
      where c.code = p_target and c.color is not null and c.official_name_es is not null
        and c.official_name_en is not null and c.capital_region_code is not null
        and exists (select 1 from game.regions as r where r.home_country_code = c.code)
    ) then
      raise exception 'country_not_ready' using errcode = '22023';
    end if;
  else
    select is_enabled into v_current from game.regions where code = p_target for update;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
  end if;

  select * into v_pending from game.world_changes
  where kind = p_kind and target = p_target and applied_at is null and cancelled_at is null
  for update;

  if v_pending.id is not null then
    update game.world_changes set cancelled_at = game.now() where id = v_pending.id;
  end if;
  if v_current = p_enable then
    -- Asking for the current state just withdraws the scheduled change, if there was one.
    if v_pending.id is null then
      raise exception 'no_change' using errcode = '22023';
    end if;
    perform game.log_admin_action(v_admin, 'cancel_' || p_kind, p_target,
                                  jsonb_build_object('scheduled', v_pending.enable), null);
    return null;
  end if;

  insert into game.world_changes (kind, target, enable, requested_by, requested_at, apply_on)
  values (p_kind, p_target, p_enable, v_admin, game.now(), game.game_day() + 1)
  returning id into v_id;
  perform game.log_admin_action(
    v_admin,
    'schedule_' || p_kind,
    p_target,
    jsonb_build_object(case when p_kind = 'country' then 'is_active' else 'is_enabled' end, v_current),
    jsonb_build_object(case when p_kind = 'country' then 'is_active' else 'is_enabled' end, p_enable,
                       'apply_on', game.game_day() + 1)
  );
  return v_id;
end;
$$;

-- API (admins only) ----------------------------------------------------------------------------------

create function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select game.is_admin(auth.uid());
$$;
comment on function public.am_i_admin() is 'Whether the signed-in account administers the game.';
grant execute on function public.am_i_admin() to authenticated;

create function public.admin_schedule_country(p_country_code text, p_active boolean)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select game.schedule_world_change('country', p_country_code, p_active);
$$;
comment on function public.admin_schedule_country(text, boolean) is
  'Admins: turns a country on or off at the next day change (or withdraws a scheduled change).';
grant execute on function public.admin_schedule_country(text, boolean) to authenticated;

create function public.admin_schedule_region(p_region_code text, p_enabled boolean)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select game.schedule_world_change('region', p_region_code, p_enabled);
$$;
comment on function public.admin_schedule_region(text, boolean) is
  'Admins: enables or disables a region (disputed territories) at the next day change.';
grant execute on function public.admin_schedule_region(text, boolean) to authenticated;

create function public.admin_list_countries()
returns table (
  code text,
  name_es text,
  name_en text,
  is_active boolean,
  regions integer,
  citizens integer,
  waiting integer,
  scheduled boolean,
  apply_on date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select c.code, c.name_es, c.name_en, c.is_active,
         (select count(*) from game.regions as r where r.home_country_code = c.code)::integer,
         (select count(*) from game.citizens as ci where ci.country_code = c.code)::integer,
         (select count(*) from game.waitlist as w where w.country_code = c.code)::integer,
         w.enable, w.apply_on
  from game.countries as c
  left join game.world_changes as w
    on w.kind = 'country' and w.target = c.code and w.applied_at is null and w.cancelled_at is null
  -- Countries with regions on the map, plus any other country somebody waits for.
  where exists (select 1 from game.regions as r where r.home_country_code = c.code)
     or exists (select 1 from game.waitlist as wl where wl.country_code = c.code)
  order by c.code;
end;
$$;
comment on function public.admin_list_countries() is 'Admins: countries with regions, citizens, waitlist and scheduled change.';
grant execute on function public.admin_list_countries() to authenticated;

create function public.admin_list_regions()
returns table (
  code text,
  name text,
  home_country_code text,
  owner_country_code text,
  is_enabled boolean,
  scheduled boolean,
  apply_on date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select r.code, r.name, r.home_country_code, r.owner_country_code, r.is_enabled, w.enable, w.apply_on
  from game.regions as r
  left join game.world_changes as w
    on w.kind = 'region' and w.target = r.code and w.applied_at is null and w.cancelled_at is null
  order by r.code;
end;
$$;
comment on function public.admin_list_regions() is 'Admins: every region with its state and scheduled change.';
grant execute on function public.admin_list_regions() to authenticated;

create function public.admin_list_log(p_limit integer default 100)
returns table (
  id bigint,
  actor_name text,
  action text,
  target text,
  before jsonb,
  after jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select l.id, l.actor_name, l.action, l.target, l.before, l.after, l.created_at
  from game.admin_log as l
  order by l.created_at desc, l.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;
comment on function public.admin_list_log(integer) is 'Admins: the latest admin actions, newest first.';
grant execute on function public.admin_list_log(integer) to authenticated;

create function public.admin_list_team()
returns table (name text, email text, added_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select coalesce(c.name, u.email::text), u.email::text, a.added_at
  from game.admins as a
  join auth.users as u on u.id = a.user_id
  left join game.citizens as c on c.user_id = a.user_id
  order by a.added_at;
end;
$$;
comment on function public.admin_list_team() is 'Admins: who else administers the game.';
grant execute on function public.admin_list_team() to authenticated;

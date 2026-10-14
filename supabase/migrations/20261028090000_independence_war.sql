-- W6 · The independence war at the start, as a sandbox until PD-02 defines it: an admin opens it for a country
-- with a damage target of their choice; for up to 7 days its nationals attack the NPC occupier with the ordinary
-- attack (10 energy, the damage formula, XP, injuries); reaching the target ends it early; the national with most
-- damage receives the permanent Liberating Hero title. Provisional administration powers stay pending
-- (spec sections 6, 9 and 13, ADR 0036).
--
-- game.independence_wars    one per country at a time: active → won | expired
-- game.independence_attacks every attack: damage, XP, energy left and the injury
-- game.titles               permanent titles; liberating_hero for now
-- Off (independence_war_enabled = 0) until the owner turns it on; admins open wars and are audited.
--
-- public.admin_start_independence_war, independence_attack, get_independence_war, independence_ranking,
--   list_my_titles
--
-- Errors (ADR 0005): not_admin, feature_disabled, country_invalid, war_active, amount_invalid, war_not_found,
-- war_closed, not_eligible, health_zero, not_enough_energy.
--
-- Rollback: drop the public functions created here, game.close_independence_war, game.independence_attacks,
-- game.titles and game.independence_wars; restore game.hourly_world from 20261025090000; delete the balance_params
-- rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('independence_war_enabled', 0, 'The independence war sandbox: off until PD-02 defines it.'),
  ('independence_war_days', 7, 'Most days an independence war lasts.');

create table game.independence_wars (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  damage_target bigint not null check (damage_target > 0),
  damage_total bigint not null default 0 check (damage_total >= 0),
  started_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'won', 'expired')),
  hero_user_id uuid references game.citizens (user_id) on delete set null,
  finished_at timestamptz,
  constraint independence_wars_finished check ((status = 'active') = (finished_at is null))
);
alter table game.independence_wars enable row level security;
comment on table game.independence_wars is
  'Sandbox independence wars (PD-02): nationals against an NPC, until the damage target or 7 days.';
create unique index independence_wars_one_active on game.independence_wars (country_code) where status = 'active';
create index independence_wars_open_idx on game.independence_wars (ends_at) where status = 'active';
create index independence_wars_started_by_idx on game.independence_wars (started_by) where started_by is not null;
create index independence_wars_hero_idx on game.independence_wars (hero_user_id) where hero_user_id is not null;

create table game.independence_attacks (
  id bigint generated always as identity primary key,
  war_id bigint not null references game.independence_wars (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  damage bigint not null check (damage >= 0),
  military_xp bigint not null check (military_xp >= 0),
  energy_after integer not null,
  health_lost integer not null default 0 check (health_lost >= 0),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null
);
alter table game.independence_attacks enable row level security;
comment on table game.independence_attacks is 'Attacks of an independence war; only nationals'' damage counts.';
create index independence_attacks_war_idx on game.independence_attacks (war_id, user_id);
create index independence_attacks_user_idx on game.independence_attacks (user_id);

create table game.titles (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  title text not null check (title in ('liberating_hero')),
  country_code text not null references game.countries (code),
  war_id bigint references game.independence_wars (id),
  granted_at timestamptz not null,
  unique (user_id, title, war_id)
);
alter table game.titles enable row level security;
comment on table game.titles is 'Permanent titles: the Liberating Hero of each independence war.';
create index titles_country_idx on game.titles (country_code);
create index titles_war_idx on game.titles (war_id) where war_id is not null;

-- Ends a war (won when the target is reached, expired after its days) and names its hero: the national with most
-- damage, ties to the earliest to reach it.
create function game.close_independence_war(p_war_id bigint)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_war game.independence_wars;
  v_hero uuid;
begin
  select * into v_war from game.independence_wars where id = p_war_id for update;
  if not found or v_war.status <> 'active' then
    return v_war.status;
  end if;
  if v_war.damage_total < v_war.damage_target and game.now() < v_war.ends_at then
    return 'active';
  end if;
  select a.user_id into v_hero
  from game.independence_attacks as a
  where a.war_id = v_war.id
  group by a.user_id
  order by sum(a.damage) desc, max(a.id)
  limit 1;
  update game.independence_wars
  set status = case when v_war.damage_total >= v_war.damage_target then 'won' else 'expired' end,
      hero_user_id = v_hero, finished_at = game.now()
  where id = v_war.id;
  if v_hero is not null then
    insert into game.titles (user_id, title, country_code, war_id, granted_at)
    values (v_hero, 'liberating_hero', v_war.country_code, v_war.id, game.now())
    on conflict do nothing;
  end if;
  return case when v_war.damage_total >= v_war.damage_target then 'won' else 'expired' end;
end;
$$;

create or replace function game.hourly_world()
returns jsonb
language sql
set search_path = ''
as $$
  select jsonb_build_object(
    'war_authorizations_expired', game.expire_war_authorizations(),
    'battles_finished', game.settle_battles(),
    'independence_wars_closed', (select count(*)::integer from game.independence_wars as w
                                 where w.status = 'active' and w.ends_at <= game.now()
                                   and game.close_independence_war(w.id) <> 'active')
  );
$$;

create function public.admin_start_independence_war(p_country_code text, p_damage_target bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_id bigint;
begin
  if game.param('independence_war_enabled') = 0 then
    raise exception 'feature_disabled' using errcode = '22023';
  end if;
  if not exists (select 1 from game.countries where code = p_country_code and is_active) then
    raise exception 'country_invalid' using errcode = '22023';
  end if;
  if p_damage_target is null or p_damage_target <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  insert into game.independence_wars (country_code, damage_target, started_by, started_at, ends_at)
  values (p_country_code, p_damage_target, v_admin, game.now(),
          game.now() + make_interval(days => game.param('independence_war_days')::integer))
  returning id into v_id;
  perform game.log_admin_action(v_admin, 'start_independence_war', p_country_code, null,
                                jsonb_build_object('war_id', v_id, 'damage_target', p_damage_target));
  return v_id;
exception when unique_violation then
  raise exception 'war_active' using errcode = '22023';
end;
$$;
comment on function public.admin_start_independence_war(text, bigint) is
  'Sandbox (PD-02): an admin opens the independence war of a country with a damage target; audited.';
grant execute on function public.admin_start_independence_war(text, bigint) to authenticated;

-- A national attacks the NPC: the ordinary attack, counted toward the target.
create function public.independence_attack(p_war_id bigint, p_key uuid)
returns table (damage bigint, military_xp bigint, energy integer, health integer, health_lost integer, war_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'independence:' || auth.uid()::text || ':' || p_key::text;
  v_war game.independence_wars;
  v_stats game.player_stats;
  v_weapon game.equipped_weapons;
  v_quality integer := 0;
  v_damage bigint;
  v_energy integer;
  v_chance numeric;
  v_lost integer := 0;
begin
  select * into v_stats from game.player_stats where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.independence_attacks as a where a.idempotency_key = v_key) then
    return query
    select a.damage, a.military_xp, a.energy_after, s.health, a.health_lost, w.status
    from game.independence_attacks as a
    join game.player_stats as s on s.user_id = a.user_id
    join game.independence_wars as w on w.id = a.war_id
    where a.idempotency_key = v_key;
    return;
  end if;
  perform game.close_independence_war(p_war_id);
  select * into v_war from game.independence_wars where id = p_war_id for update;
  if not found then
    raise exception 'war_not_found' using errcode = 'P0002';
  end if;
  if v_war.status <> 'active' then
    raise exception 'war_closed' using errcode = '22023';
  end if;
  if v_citizen.country_code <> v_war.country_code then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  if v_stats.health <= 0 then
    raise exception 'health_zero' using errcode = '22023';
  end if;

  v_energy := game.spend_energy(v_citizen.user_id, game.param('attack_energy')::integer);
  select * into v_weapon from game.equipped_weapons where user_id = v_citizen.user_id and uses_left > 0;
  if found then
    v_quality := (select quality from game.goods where code = v_weapon.good_code);
    update game.equipped_weapons set uses_left = uses_left - 1 where user_id = v_citizen.user_id;
  end if;
  v_damage := floor((game.param('attack_base_damage') + v_stats.strength) * v_stats.health / 100.0
                    * (1 + game.param('weapon_damage_per_quality') * v_quality)
                    * (1 + game.param('rank_damage_per_step') * game.rank_step(v_stats.military_xp)));
  perform game.add_military_xp(v_citizen.user_id, v_damage);
  perform game.add_civil_xp(v_citizen.user_id, v_damage);
  update game.player_stats as s set damage = s.damage + v_damage where s.user_id = v_citizen.user_id;
  v_chance := case when v_energy >= 90 then game.param('attack_injury_90')
                   when v_energy >= 70 then game.param('attack_injury_70')
                   when v_energy >= 50 then game.param('attack_injury_50')
                   when v_energy >= 30 then game.param('attack_injury_30')
                   when v_energy >= 10 then game.param('attack_injury_10')
                   else game.param('attack_injury_0') end;
  if game.random() < v_chance then
    v_lost := game.injure(v_citizen.user_id, 'attack', 'independence:' || v_war.id::text,
                          least(game.param('attack_injury_max')::integer, floor(5 * (100 - v_energy) / 10.0)::integer));
  end if;
  insert into game.independence_attacks (war_id, user_id, damage, military_xp, energy_after, health_lost,
                                         idempotency_key, created_at)
  values (v_war.id, v_citizen.user_id, v_damage, v_damage, v_energy, v_lost, v_key, game.now());
  update game.independence_wars set damage_total = damage_total + v_damage where id = v_war.id;
  return query
  select v_damage, v_damage, v_energy, s.health, v_lost, game.close_independence_war(v_war.id)
  from game.player_stats as s where s.user_id = v_citizen.user_id;
end;
$$;
comment on function public.independence_attack(bigint, uuid) is
  'A national attacks in their country''s independence war (sandbox); reaching the target ends it.';
grant execute on function public.independence_attack(bigint, uuid) to authenticated;

create function public.get_independence_war(p_country_code text)
returns table (
  war_id bigint, damage_target bigint, damage_total bigint, started_at timestamptz, ends_at timestamptz,
  status text, hero_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.damage_target, w.damage_total, w.started_at, w.ends_at,
         case when w.status = 'active' and (w.ends_at <= game.now() or w.damage_total >= w.damage_target)
              then 'closing' else w.status end,
         c.name
  from game.independence_wars as w
  left join game.citizens as c on c.user_id = w.hero_user_id
  where w.country_code = p_country_code
  order by w.started_at desc
  limit 1;
$$;
comment on function public.get_independence_war(text) is 'A country''s latest independence war; no rows if it never had one.';
grant execute on function public.get_independence_war(text) to anon, authenticated;

create function public.independence_ranking(p_war_id bigint)
returns table (name text, damage bigint, attacks integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, sum(a.damage)::bigint, count(*)::integer
  from game.independence_attacks as a
  join game.citizens as c on c.user_id = a.user_id
  where a.war_id = p_war_id
  group by c.name
  order by 2 desc, 1
  limit 10;
$$;
comment on function public.independence_ranking(bigint) is 'The ten nationals with most damage in an independence war.';
grant execute on function public.independence_ranking(bigint) to anon, authenticated;

create function public.list_my_titles()
returns table (title text, country_code text, granted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select title, country_code, granted_at from game.titles where user_id = auth.uid() order by granted_at;
$$;
comment on function public.list_my_titles() is 'The player''s permanent titles.';
grant execute on function public.list_my_titles() to authenticated;

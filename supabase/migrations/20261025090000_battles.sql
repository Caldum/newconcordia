-- W2 + W3 · Battles for regions and attacks (spec sections 6, 8, 11 and 12.5, ADR 0033).
--
-- game.battles              one active battle per region: up to 9 rounds of 1 hour from the launch, the first side to
--                           win 5 rounds wins, a tied round goes to the defender; a winning attacker annexes the
--                           region; 24 hours of cooldown for ordinary war after any battle there
-- game.battle_rounds        each closed round: damage per side and its winner
-- game.battle_attacks       every attack: round, side, damage, weapon, XP, energy left and the injury
-- game.region_owner_changes the history of region owners (annexation, and the resistance of W4)
-- game.battle_orders        the Defense minister's single priority battle per country (+10 % XP)
-- game.equipped_weapons     the one weapon unit a player has equipped and its uses left (Q1..Q5 last 1..5 attacks)
-- Rounds close lazily (on every attack and read) and in the hourly job, from the attacks recorded in their hour.
-- Damage: floor((10 + F) × HP/100 × (1 + 0.2 Q) × (1 + 0.05 × min(n, 75))); XP (military and civil):
-- floor(damage × (1 + enemy 0.5 + order 0.1)); then the injury by energy left.
-- Eligibility: nationals of a side fight remotely (allies from W5); anyone else only from the battle's region; never
-- against their own country.
--
-- public.launch_offensive, equip_weapon, get_my_weapon, attack, set_battle_order, list_battles, get_battle,
--   list_battle_rounds, battle_ranking, list_launch_targets
--
-- Errors (ADR 0005): not_president, region_invalid, battle_active, cooldown, no_authorization, weapon_invalid,
-- weapon_equipped, quantity_unavailable, battle_not_found, battle_closed, side_invalid, not_eligible,
-- health_zero, not_enough_energy, not_minister.
--
-- Rollback: drop the public functions created here, game.settle_battles, game.settle_battle, game.finish_battle,
-- game.battle_round_now, game.allied, game.equipped_weapons, game.battle_orders, game.battle_attacks,
-- game.battle_rounds, game.battles, game.region_owner_changes; restore game.hourly_world from 20261024090000;
-- delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('battle_rounds', 9, 'Rounds of a battle at most.'),
  ('battle_rounds_to_win', 5, 'Rounds a side needs to win a battle.'),
  ('battle_round_minutes', 60, 'Length of a round.'),
  ('battle_cooldown_hours', 24, 'Hours after a battle before an ordinary war can return to the region.'),
  ('attack_energy', 10, 'Energy an attack spends; it needs at least this much.'),
  ('attack_base_damage', 10, 'Damage before strength: (base + F).'),
  ('rank_damage_per_step', 0.05, 'Damage bonus per rank step (up to 75 steps, +375 %).'),
  ('xp_bonus_enemy', 0.5, 'XP bonus fighting the designated enemy.'),
  ('xp_bonus_order', 0.1, 'XP bonus in the country''s priority battle.'),
  ('attack_injury_90', 0.0005, 'Injury chance when 90–100 energy is left.'),
  ('attack_injury_70', 0.001, 'Injury chance when 70–89 energy is left.'),
  ('attack_injury_50', 0.0025, 'Injury chance when 50–69 energy is left.'),
  ('attack_injury_30', 0.005, 'Injury chance when 30–49 energy is left.'),
  ('attack_injury_10', 0.01, 'Injury chance when 10–29 energy is left.'),
  ('attack_injury_0', 0.02, 'Injury chance when 0–9 energy is left.'),
  ('attack_injury_max', 25, 'Most health an attack injury takes.');

-- Region owners -------------------------------------------------------------------------------------------------------

create table game.region_owner_changes (
  id bigint generated always as identity primary key,
  region_code text not null references game.regions (code),
  from_country_code text not null references game.countries (code),
  to_country_code text not null references game.countries (code),
  battle_id bigint,
  changed_at timestamptz not null
);
alter table game.region_owner_changes enable row level security;
comment on table game.region_owner_changes is 'Every change of a region''s owner, with the battle that caused it.';
create index region_owner_changes_region_idx on game.region_owner_changes (region_code, changed_at);
create index region_owner_changes_from_idx on game.region_owner_changes (from_country_code);
create index region_owner_changes_to_idx on game.region_owner_changes (to_country_code);

-- Battles ------------------------------------------------------------------------------------------------------------

create table game.battles (
  id bigint generated always as identity primary key,
  region_code text not null references game.regions (code),
  kind text not null default 'war' check (kind in ('war', 'resistance')),
  attacker_country_code text not null references game.countries (code),
  defender_country_code text not null references game.countries (code),
  authorization_id bigint references game.war_authorizations (id),
  launched_by uuid references game.citizens (user_id) on delete set null,
  started_at timestamptz not null,
  rounds_closed integer not null default 0 check (rounds_closed between 0 and 9),
  attacker_rounds integer not null default 0 check (attacker_rounds >= 0),
  defender_rounds integer not null default 0 check (defender_rounds >= 0),
  status text not null default 'active' check (status in ('active', 'finished')),
  winner text check (winner in ('attacker', 'defender')),
  finished_at timestamptz,
  creation_key text unique check (char_length(creation_key) <= 200),
  constraint battles_sides check (attacker_country_code <> defender_country_code),
  constraint battles_finished check ((status = 'finished') = (winner is not null and finished_at is not null))
);
alter table game.battles enable row level security;
comment on table game.battles is 'Battles for regions: up to 9 one-hour rounds, first to 5; a tied round goes to the defender.';
create unique index battles_one_active_per_region on game.battles (region_code) where status = 'active';
create index battles_region_idx on game.battles (region_code, finished_at);
create index battles_active_idx on game.battles (started_at) where status = 'active';
create index battles_attacker_idx on game.battles (attacker_country_code);
create index battles_defender_idx on game.battles (defender_country_code);
create index battles_authorization_idx on game.battles (authorization_id) where authorization_id is not null;
create index battles_launched_by_idx on game.battles (launched_by) where launched_by is not null;
-- squawk-ignore adding-foreign-key-constraint
alter table game.region_owner_changes add constraint region_owner_changes_battle_fk foreign key (battle_id) references game.battles (id);
create index region_owner_changes_battle_idx on game.region_owner_changes (battle_id) where battle_id is not null;

create table game.battle_rounds (
  battle_id bigint not null references game.battles (id),
  round_no integer not null check (round_no between 1 and 9),
  attacker_damage bigint not null,
  defender_damage bigint not null,
  winner text not null check (winner in ('attacker', 'defender')),
  closed_at timestamptz not null,
  primary key (battle_id, round_no)
);
alter table game.battle_rounds enable row level security;
comment on table game.battle_rounds is 'Closed rounds: cumulative damage per side; a tie goes to the defender.';

create table game.battle_attacks (
  id bigint generated always as identity primary key,
  battle_id bigint not null references game.battles (id),
  round_no integer not null check (round_no between 1 and 9),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  side text not null check (side in ('attacker', 'defender')),
  damage bigint not null check (damage >= 0),
  weapon_good_code text references game.goods (code),
  military_xp bigint not null check (military_xp >= 0),
  civil_xp bigint not null check (civil_xp >= 0),
  energy_after integer not null,
  health_lost integer not null default 0 check (health_lost >= 0),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null
);
alter table game.battle_attacks enable row level security;
comment on table game.battle_attacks is 'Every attack: damage and XP recorded before the injury roll.';
create index battle_attacks_round_idx on game.battle_attacks (battle_id, round_no, side);
create index battle_attacks_user_idx on game.battle_attacks (user_id, created_at);

create table game.battle_orders (
  country_code text primary key references game.countries (code),
  battle_id bigint not null references game.battles (id),
  set_by uuid references game.citizens (user_id) on delete set null,
  set_at timestamptz not null
);
alter table game.battle_orders enable row level security;
comment on table game.battle_orders is 'The Defense minister''s priority battle: one per country, +10 % XP.';
create index battle_orders_battle_idx on game.battle_orders (battle_id);
create index battle_orders_set_by_idx on game.battle_orders (set_by) where set_by is not null;

create table game.equipped_weapons (
  user_id uuid primary key references game.citizens (user_id) on delete cascade,
  good_code text not null references game.goods (code),
  uses_left integer not null check (uses_left >= 0),
  equipped_at timestamptz not null
);
alter table game.equipped_weapons enable row level security;
comment on table game.equipped_weapons is 'The weapon unit a player has equipped by hand and its uses left.';
create index equipped_weapons_good_idx on game.equipped_weapons (good_code);

-- Alliances arrive with W5; until then nobody is allied.
create function game.allied(p_a text, p_b text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select false;
$$;

-- The round an instant falls in (1 = the first hour from the launch).
create function game.battle_round_now(p_battle game.battles)
returns integer
language sql
stable
set search_path = ''
as $$
  select floor(extract(epoch from game.now() - p_battle.started_at) / (60 * game.param('battle_round_minutes')))::integer + 1;
$$;

create function game.finish_battle(p_battle game.battles, p_winner text, p_at timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_owner text;
begin
  update game.battles set status = 'finished', winner = p_winner, finished_at = p_at where id = p_battle.id;
  delete from game.battle_orders where battle_id = p_battle.id;
  if p_winner = 'attacker' then
    select owner_country_code into v_owner from game.regions where code = p_battle.region_code for update;
    update game.regions set owner_country_code = p_battle.attacker_country_code, updated_at = p_at
    where code = p_battle.region_code;
    insert into game.region_owner_changes (region_code, from_country_code, to_country_code, battle_id, changed_at)
    values (p_battle.region_code, v_owner, p_battle.attacker_country_code, p_battle.id, p_at);
  end if;
end;
$$;

-- Closes every round whose hour is over, in order, and finishes the battle when a side reaches 5.
create function game.settle_battle(p_battle_id bigint)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_b game.battles;
  v_round integer;
  v_end timestamptz;
  v_att bigint;
  v_def bigint;
  v_winner text;
begin
  select * into v_b from game.battles where id = p_battle_id for update;
  if not found then
    return null;
  end if;
  while v_b.status = 'active' and v_b.rounds_closed < game.param('battle_rounds') loop
    v_round := v_b.rounds_closed + 1;
    v_end := v_b.started_at + make_interval(mins => (v_round * game.param('battle_round_minutes'))::integer);
    exit when v_end > game.now();
    select coalesce(sum(damage) filter (where side = 'attacker'), 0), coalesce(sum(damage) filter (where side = 'defender'), 0)
    into v_att, v_def
    from game.battle_attacks where battle_id = v_b.id and round_no = v_round;
    v_winner := case when v_att > v_def then 'attacker' else 'defender' end;
    insert into game.battle_rounds (battle_id, round_no, attacker_damage, defender_damage, winner, closed_at)
    values (v_b.id, v_round, v_att, v_def, v_winner, v_end);
    update game.battles
    set rounds_closed = v_round,
        attacker_rounds = attacker_rounds + case when v_winner = 'attacker' then 1 else 0 end,
        defender_rounds = defender_rounds + case when v_winner = 'defender' then 1 else 0 end
    where id = v_b.id
    returning * into v_b;
    if v_b.attacker_rounds >= game.param('battle_rounds_to_win') then
      perform game.finish_battle(v_b, 'attacker', v_end);
      v_b.status := 'finished';
    elsif v_b.defender_rounds >= game.param('battle_rounds_to_win') then
      perform game.finish_battle(v_b, 'defender', v_end);
      v_b.status := 'finished';
    end if;
  end loop;
  return v_b.status;
end;
$$;

create function game.settle_battles()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_count integer := 0;
begin
  for v_id in select id from game.battles where status = 'active' order by id loop
    if game.settle_battle(v_id) = 'finished' then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function game.hourly_world()
returns jsonb
language sql
set search_path = ''
as $$
  select jsonb_build_object('war_authorizations_expired', game.expire_war_authorizations(),
                            'battles_finished', game.settle_battles());
$$;

-- Launching ------------------------------------------------------------------------------------------------------------

-- The president launches an offensive against a region another country owns: against the designated enemy at once,
-- otherwise consuming a pending war authorization against that country (its 50 GOLD are burned).
create function public.launch_offensive(p_region_code text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'offensive:' || auth.uid()::text || ':' || p_key::text;
  v_region game.regions;
  v_authorization bigint;
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('region_battle:' || coalesce(p_region_code, ''), 0));
  select id into v_id from game.battles where creation_key = v_key;
  if found then
    return v_id;
  end if;
  perform game.require_president(v_citizen);
  select * into v_region from game.regions where code = p_region_code;
  if not found or not v_region.is_enabled or v_region.owner_country_code = v_citizen.country_code then
    raise exception 'region_invalid' using errcode = '22023';
  end if;
  perform game.settle_battles();
  if exists (select 1 from game.battles where region_code = p_region_code and status = 'active') then
    raise exception 'battle_active' using errcode = '22023';
  end if;
  if exists (select 1 from game.battles where region_code = p_region_code and status = 'finished'
             and finished_at > game.now() - make_interval(hours => game.param('battle_cooldown_hours')::integer)) then
    raise exception 'cooldown' using errcode = '22023';
  end if;
  if game.enemy_of(v_citizen.country_code) is distinct from v_region.owner_country_code then
    v_authorization := game.consume_war_authorization(v_citizen.country_code, v_region.owner_country_code, v_citizen.user_id);
  end if;
  insert into game.battles (region_code, kind, attacker_country_code, defender_country_code, authorization_id,
                            launched_by, started_at, creation_key)
  values (p_region_code, 'war', v_citizen.country_code, v_region.owner_country_code, v_authorization,
          v_citizen.user_id, game.now(), v_key)
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.launch_offensive(text, uuid) is
  'The president attacks a region: free against the designated enemy, otherwise using a war authorization.';
grant execute on function public.launch_offensive(text, uuid) to authenticated;

-- Weapons -------------------------------------------------------------------------------------------------------------

create function public.equip_weapon(p_good_code text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_quality integer;
begin
  select quality into v_quality from game.goods
  where code = p_good_code and category = 'military' and kind = 'product' and quality is not null and active;
  if v_quality is null then
    raise exception 'weapon_invalid' using errcode = '22023';
  end if;
  perform 1 from game.player_stats where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.equipped_weapons where user_id = v_citizen.user_id and uses_left > 0) then
    raise exception 'weapon_equipped' using errcode = '22023';
  end if;
  perform game.take_goods(game.holder_for_citizen(v_citizen.user_id), p_good_code, 1, 'weapon_equipped',
                          'equip:' || v_citizen.user_id::text);
  insert into game.equipped_weapons (user_id, good_code, uses_left, equipped_at)
  values (v_citizen.user_id, p_good_code, v_quality, game.now())
  on conflict (user_id) do update set good_code = excluded.good_code, uses_left = excluded.uses_left,
                                      equipped_at = excluded.equipped_at;
  return v_quality;
end;
$$;
comment on function public.equip_weapon(text) is 'Equips one weapon unit from the inventory: Q1..Q5 last 1..5 attacks.';
grant execute on function public.equip_weapon(text) to authenticated;

create function public.get_my_weapon()
returns table (good_code text, uses_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  select good_code, uses_left from game.equipped_weapons where user_id = auth.uid() and uses_left > 0;
$$;
comment on function public.get_my_weapon() is 'The weapon the player has equipped and its uses left; no rows when unarmed.';
grant execute on function public.get_my_weapon() to authenticated;

-- Attacking -------------------------------------------------------------------------------------------------------------

create function public.attack(p_battle_id bigint, p_side text, p_key uuid)
returns table (
  damage bigint, military_xp bigint, civil_xp bigint, energy integer, health integer, health_lost integer,
  weapon_uses_left integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'attack:' || auth.uid()::text || ':' || p_key::text;
  v_b game.battles;
  v_round integer;
  v_side_country text;
  v_other_country text;
  v_stats game.player_stats;
  v_weapon game.equipped_weapons;
  v_quality integer := 0;
  v_damage bigint;
  v_bonus numeric := 0;
  v_xp bigint;
  v_energy integer;
  v_chance numeric;
  v_lost integer := 0;
begin
  -- The player's stats row serializes their attacks, so a repeated key finds the first one.
  select * into v_stats from game.player_stats where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.battle_attacks as a where a.idempotency_key = v_key) then
    return query
    select a.damage, a.military_xp, a.civil_xp, a.energy_after, s.health, a.health_lost,
           coalesce((select w.uses_left from game.equipped_weapons as w where w.user_id = a.user_id), 0)
    from game.battle_attacks as a join game.player_stats as s on s.user_id = a.user_id
    where a.idempotency_key = v_key;
    return;
  end if;

  select * into v_b from game.battles where id = p_battle_id;
  if not found then
    raise exception 'battle_not_found' using errcode = 'P0002';
  end if;
  if v_b.status = 'active'
     and v_b.started_at + make_interval(mins => ((v_b.rounds_closed + 1) * game.param('battle_round_minutes'))::integer) <= game.now() then
    perform game.settle_battle(v_b.id);
  end if;
  -- A shared lock keeps the round open while this attack is recorded; closing it waits for the attack.
  select * into v_b from game.battles where id = p_battle_id for share;
  v_round := game.battle_round_now(v_b);
  if v_b.status <> 'active' or v_round > game.param('battle_rounds') then
    raise exception 'battle_closed' using errcode = '22023';
  end if;
  if p_side is null or p_side not in ('attacker', 'defender') then
    raise exception 'side_invalid' using errcode = '22023';
  end if;
  v_side_country := case p_side when 'attacker' then v_b.attacker_country_code else v_b.defender_country_code end;
  v_other_country := case p_side when 'attacker' then v_b.defender_country_code else v_b.attacker_country_code end;
  if v_citizen.country_code = v_other_country
     or not (v_citizen.country_code = v_side_country or game.allied(v_citizen.country_code, v_side_country)
             or v_citizen.region_code = v_b.region_code) then
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
  if game.enemy_of(v_citizen.country_code) = v_other_country then
    v_bonus := v_bonus + game.param('xp_bonus_enemy');
  end if;
  if exists (select 1 from game.battle_orders where country_code = v_citizen.country_code and battle_id = v_b.id) then
    v_bonus := v_bonus + game.param('xp_bonus_order');
  end if;
  v_xp := floor(v_damage * (1 + v_bonus));
  perform game.add_military_xp(v_citizen.user_id, v_xp);
  perform game.add_civil_xp(v_citizen.user_id, v_xp);
  update game.player_stats as s set damage = s.damage + v_damage where s.user_id = v_citizen.user_id;

  -- The injury comes after damage and XP are recorded, by the energy left.
  v_chance := case when v_energy >= 90 then game.param('attack_injury_90')
                   when v_energy >= 70 then game.param('attack_injury_70')
                   when v_energy >= 50 then game.param('attack_injury_50')
                   when v_energy >= 30 then game.param('attack_injury_30')
                   when v_energy >= 10 then game.param('attack_injury_10')
                   else game.param('attack_injury_0') end;
  if game.random() < v_chance then
    v_lost := game.injure(v_citizen.user_id, 'attack', 'battle:' || v_b.id::text,
                          least(game.param('attack_injury_max')::integer, floor(5 * (100 - v_energy) / 10.0)::integer));
  end if;

  insert into game.battle_attacks (battle_id, round_no, user_id, side, damage, weapon_good_code, military_xp, civil_xp,
                                   energy_after, health_lost, idempotency_key, created_at)
  values (v_b.id, v_round, v_citizen.user_id, p_side, v_damage, v_weapon.good_code, v_xp, v_xp, v_energy, v_lost,
          v_key, game.now());
  return query
  select v_damage, v_xp, v_xp, v_energy, s.health, v_lost,
         coalesce((select w.uses_left from game.equipped_weapons as w where w.user_id = v_citizen.user_id), 0)
  from game.player_stats as s where s.user_id = v_citizen.user_id;
end;
$$;
comment on function public.attack(bigint, text, uuid) is
  'Attacks for a side in the current round: 10 energy, damage by strength, health, weapon and rank, XP with bonuses, then the injury.';
grant execute on function public.attack(bigint, text, uuid) to authenticated;

create function public.set_battle_order(p_battle_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_b game.battles;
begin
  if not game.holds_office(v_citizen.user_id, v_citizen.country_code, array['minister_defense']) then
    raise exception 'not_minister' using errcode = '42501';
  end if;
  perform game.settle_battle(p_battle_id);
  select * into v_b from game.battles where id = p_battle_id;
  if not found or v_citizen.country_code not in (v_b.attacker_country_code, v_b.defender_country_code) then
    raise exception 'battle_not_found' using errcode = 'P0002';
  end if;
  if v_b.status <> 'active' then
    raise exception 'battle_closed' using errcode = '22023';
  end if;
  insert into game.battle_orders (country_code, battle_id, set_by, set_at)
  values (v_citizen.country_code, p_battle_id, v_citizen.user_id, game.now())
  on conflict (country_code) do update set battle_id = excluded.battle_id, set_by = excluded.set_by, set_at = excluded.set_at;
end;
$$;
comment on function public.set_battle_order(bigint) is 'The Defense minister names the country''s single priority battle (+10 % XP).';
grant execute on function public.set_battle_order(bigint) to authenticated;

-- Reads ------------------------------------------------------------------------------------------------------------------

create function public.list_battles()
returns table (
  battle_id bigint, region_code text, kind text, attacker_country_code text, defender_country_code text,
  started_at timestamptz, current_round integer, attacker_rounds integer, defender_rounds integer, status text,
  winner text, finished_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.region_code, b.kind, b.attacker_country_code, b.defender_country_code, b.started_at,
         least(b.rounds_closed + 1, 9), b.attacker_rounds, b.defender_rounds, b.status, b.winner, b.finished_at
  from game.battles as b
  where b.status = 'active' or b.finished_at > game.now() - interval '3 days'
  order by b.status <> 'active', b.started_at desc
  limit 30;
$$;
comment on function public.list_battles() is 'Active battles and those finished in the last three days.';
grant execute on function public.list_battles() to anon, authenticated;

-- One battle with the live damage of the current round. Settles closed rounds first.
create function public.get_battle(p_battle_id bigint)
returns table (
  battle_id bigint, region_code text, kind text, attacker_country_code text, defender_country_code text,
  started_at timestamptz, current_round integer, round_ends_at timestamptz, attacker_rounds integer,
  defender_rounds integer, attacker_damage bigint, defender_damage bigint, status text, winner text,
  finished_at timestamptz, my_side_order boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round integer;
begin
  perform game.settle_battle(p_battle_id);
  return query
  select b.id, b.region_code, b.kind, b.attacker_country_code, b.defender_country_code, b.started_at,
         b.rounds_closed + 1,
         b.started_at + make_interval(mins => ((b.rounds_closed + 1) * game.param('battle_round_minutes'))::integer),
         b.attacker_rounds, b.defender_rounds,
         coalesce((select sum(a.damage)::bigint from game.battle_attacks as a
                   where a.battle_id = b.id and a.round_no = b.rounds_closed + 1 and a.side = 'attacker'), 0),
         coalesce((select sum(a.damage)::bigint from game.battle_attacks as a
                   where a.battle_id = b.id and a.round_no = b.rounds_closed + 1 and a.side = 'defender'), 0),
         b.status, b.winner, b.finished_at,
         exists (select 1 from game.battle_orders as o join game.citizens as c on c.country_code = o.country_code
                 where o.battle_id = b.id and c.user_id = auth.uid())
  from game.battles as b
  where b.id = p_battle_id;
end;
$$;
comment on function public.get_battle(bigint) is 'A battle with its rounds won and the current round''s damage per side.';
grant execute on function public.get_battle(bigint) to anon, authenticated;

create function public.list_battle_rounds(p_battle_id bigint)
returns table (round_no integer, attacker_damage bigint, defender_damage bigint, winner text)
language sql
stable
security definer
set search_path = ''
as $$
  select round_no, attacker_damage, defender_damage, winner from game.battle_rounds
  where battle_id = p_battle_id order by round_no;
$$;
comment on function public.list_battle_rounds(bigint) is 'The closed rounds of a battle.';
grant execute on function public.list_battle_rounds(bigint) to anon, authenticated;

create function public.battle_ranking(p_battle_id bigint)
returns table (side text, name text, damage bigint, attacks integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.side, r.name, r.damage, r.attacks
  from (
    select a.side, c.name, sum(a.damage)::bigint as damage, count(*)::integer as attacks,
           row_number() over (partition by a.side order by sum(a.damage) desc, c.name) as position
    from game.battle_attacks as a
    join game.citizens as c on c.user_id = a.user_id
    where a.battle_id = p_battle_id
    group by a.side, c.name
  ) as r
  where r.position <= 10
  order by r.side, r.damage desc, r.name;
$$;
comment on function public.battle_ranking(bigint) is 'The ten fighters with most damage on each side.';
grant execute on function public.battle_ranking(bigint) to anon, authenticated;

-- Regions the president could attack now: the enemy's or those of countries with a pending authorization, without an
-- active battle or cooldown.
create function public.list_launch_targets()
returns table (region_code text, country_code text, needs_authorization boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.owner_country_code, game.enemy_of(c.country_code) is distinct from r.owner_country_code
  from game.citizens as c
  join game.regions as r on r.owner_country_code <> c.country_code and r.is_enabled
  where c.user_id = auth.uid()
    and game.holds_office(c.user_id, c.country_code, array['president'])
    and (r.owner_country_code = game.enemy_of(c.country_code)
         or exists (select 1 from game.war_authorizations as w
                    where w.country_code = c.country_code and w.target_country_code = r.owner_country_code
                      and w.status = 'pending' and w.expires_at > game.now()))
    and not exists (select 1 from game.battles as b
                    where b.region_code = r.code
                      and (b.status = 'active'
                           or b.finished_at > game.now() - make_interval(hours => game.param('battle_cooldown_hours')::integer)))
  order by r.owner_country_code, r.code;
$$;
comment on function public.list_launch_targets() is 'For the president: regions an offensive could be launched against now.';
grant execute on function public.list_launch_targets() to authenticated;

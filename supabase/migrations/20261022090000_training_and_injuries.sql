-- H1 + H2 · Personal training centers, injuries and zero-health restrictions (spec sections 6, 7 and 8, ADR 0030).
--
-- game.random              the game's dice; tests pin it with `set local game.fixed_random`, API requests never
-- game.injuries            every injury: cause (training, attack), health lost and health after
-- game.injure              applies an injury after the action's gains are recorded, never below zero
-- game.training_centers    each player's Basic, Advanced and Elite centers, level N1–N5 (N1 from the start)
-- game.training_sessions   one session per UTC game day per center: energy 10/15/20, fee 0/0.5/1.5 GOLD (burned),
--                          strength 5 × N (Basic, Advanced) or 10 × N (Elite), civil XP 1 per strength point,
--                          then the injury roll: N × 0.05 % for −5 HP
-- public.train, upgrade_training_center (N2 5, N3 10, N4 20, N5 40 GOLD, burned), get_my_training,
--   list_my_injuries
-- Zero health: a player at 0 HP cannot train (nor attack, W3); personal kits still work.
--
-- Errors (ADR 0005): center_invalid, already_trained, health_zero, not_enough_energy, insufficient_funds,
-- level_max.
--
-- Rollback: drop the public functions created here, game.training_sessions, game.training_centers, game.injure,
-- game.injuries and game.random; delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('training_energy_basic', 10, 'Energy of a Basic training session.'),
  ('training_energy_advanced', 15, 'Energy of an Advanced training session.'),
  ('training_energy_elite', 20, 'Energy of an Elite training session.'),
  ('training_fee_basic', 0, 'GOLD hundredths of a Basic session (burned).'),
  ('training_fee_advanced', 50, 'GOLD hundredths of an Advanced session (burned).'),
  ('training_fee_elite', 150, 'GOLD hundredths of an Elite session (burned).'),
  ('training_strength_basic', 5, 'Strength per center level of a Basic session.'),
  ('training_strength_advanced', 5, 'Strength per center level of an Advanced session.'),
  ('training_strength_elite', 10, 'Strength per center level of an Elite session.'),
  ('training_injury_per_level', 0.0005, 'Chance of a training injury per center level (N1 0.05 % … N5 0.25 %).'),
  ('training_injury_hp', 5, 'Health lost in a training injury.'),
  ('training_upgrade_2', 500, 'GOLD hundredths to raise a center to N2 (burned).'),
  ('training_upgrade_3', 1000, 'GOLD hundredths to raise a center to N3 (burned).'),
  ('training_upgrade_4', 2000, 'GOLD hundredths to raise a center to N4 (burned).'),
  ('training_upgrade_5', 4000, 'GOLD hundredths to raise a center to N5 (burned).'),
  ('training_level_max', 5, 'Highest training center level.');

-- Dice ---------------------------------------------------------------------------------------------------------

create function game.random()
returns double precision
language sql
volatile
set search_path = ''
as $$
  -- Tests pin the dice with `set local game.fixed_random = '0.5'`. API requests (session user `authenticator`)
  -- always roll.
  select case
    when session_user <> 'authenticator'
      then coalesce(nullif(current_setting('game.fixed_random', true), '')::double precision, random())
    else random()
  end;
$$;
comment on function game.random() is 'The game''s dice in [0, 1). Every chance reads from here.';

-- Injuries ---------------------------------------------------------------------------------------------------------

create table game.injuries (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  cause text not null check (cause in ('training', 'attack')),
  reference text check (char_length(reference) <= 120),
  health_lost integer not null check (health_lost >= 0),
  health_after integer not null check (health_after between 0 and 100),
  created_at timestamptz not null
);
alter table game.injuries enable row level security;
comment on table game.injuries is 'Injuries from training and attacks, applied after the action''s gains.';
create index injuries_user_idx on game.injuries (user_id, created_at);

-- Takes up to p_health from the player (never below zero) and logs it. Returns the health lost.
create function game.injure(p_user_id uuid, p_cause text, p_reference text, p_health integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_health integer;
  v_lost integer;
begin
  select health into v_health from game.player_stats where user_id = p_user_id for update;
  v_lost := least(v_health, greatest(p_health, 0));
  update game.player_stats set health = v_health - v_lost where user_id = p_user_id;
  insert into game.injuries (user_id, cause, reference, health_lost, health_after, created_at)
  values (p_user_id, p_cause, p_reference, v_lost, v_health - v_lost, game.now());
  return v_lost;
end;
$$;

-- Training ---------------------------------------------------------------------------------------------------------

create table game.training_centers (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  kind text not null check (kind in ('basic', 'advanced', 'elite')),
  level integer not null default 1 check (level between 1 and 5),
  upgraded_at timestamptz,
  primary key (user_id, kind)
);
alter table game.training_centers enable row level security;
comment on table game.training_centers is 'A player''s personal training centers; a missing row is N1.';

create table game.training_sessions (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  kind text not null check (kind in ('basic', 'advanced', 'elite')),
  game_day date not null,
  center_level integer not null check (center_level between 1 and 5),
  energy_spent integer not null check (energy_spent > 0),
  fee bigint not null check (fee >= 0),
  strength_gained integer not null check (strength_gained > 0),
  xp_gained integer not null check (xp_gained >= 0),
  health_lost integer not null default 0 check (health_lost >= 0),
  created_at timestamptz not null,
  primary key (user_id, kind, game_day)
);
alter table game.training_sessions enable row level security;
comment on table game.training_sessions is 'One training session per player, center and UTC game day.';

create function game.center_level(p_user_id uuid, p_kind text)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((select level from game.training_centers where user_id = p_user_id and kind = p_kind), 1);
$$;

-- Trains once today at a center: energy, then the fee (burned), then strength and civil XP, then the injury roll.
create function public.train(p_kind text)
returns table (strength_gained integer, xp_gained integer, health_lost integer, health integer, energy integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_day date := game.game_day();
  v_level integer;
  v_energy integer;
  v_fee bigint;
  v_strength integer;
  v_lost integer := 0;
  v_left integer;
begin
  if p_kind is null or p_kind not in ('basic', 'advanced', 'elite') then
    raise exception 'center_invalid' using errcode = '22023';
  end if;
  -- The player's stats row serializes their sessions.
  perform 1 from game.player_stats as s where s.user_id = v_citizen.user_id for update;
  if exists (select 1 from game.training_sessions as t
             where t.user_id = v_citizen.user_id and t.kind = p_kind and t.game_day = v_day) then
    raise exception 'already_trained' using errcode = '22023';
  end if;
  if (select s.health from game.player_stats as s where s.user_id = v_citizen.user_id) <= 0 then
    raise exception 'health_zero' using errcode = '22023';
  end if;

  v_level := game.center_level(v_citizen.user_id, p_kind);
  v_left := game.spend_energy(v_citizen.user_id, game.param('training_energy_' || p_kind)::integer);
  v_fee := game.param('training_fee_' || p_kind)::bigint;
  if v_fee > 0 then
    perform game.post(
      'training_fee', 'training:' || v_citizen.user_id::text || ':' || p_kind || ':' || v_day::text, v_citizen.user_id,
      array[row(game.citizen_account(v_citizen.user_id, 'GOLD'), game.system_account('sink', 'GOLD'), v_fee,
                'training_fee', null)::game.ledger_leg]
    );
  end if;
  v_strength := game.param('training_strength_' || p_kind)::integer * v_level;
  update game.player_stats as s set strength = s.strength + v_strength where s.user_id = v_citizen.user_id;
  perform game.add_civil_xp(v_citizen.user_id, v_strength);
  if game.random() < v_level * game.param('training_injury_per_level') then
    v_lost := game.injure(v_citizen.user_id, 'training', p_kind, game.param('training_injury_hp')::integer);
  end if;

  insert into game.training_sessions (user_id, kind, game_day, center_level, energy_spent, fee, strength_gained,
                                      xp_gained, health_lost, created_at)
  values (v_citizen.user_id, p_kind, v_day, v_level, game.param('training_energy_' || p_kind)::integer, v_fee,
          v_strength, v_strength, v_lost, game.now());
  return query
  select v_strength, v_strength, v_lost, s.health, v_left from game.player_stats as s where s.user_id = v_citizen.user_id;
end;
$$;
comment on function public.train(text) is
  'One session a day per center: energy and fee first, then strength and civil XP, then the injury roll.';
grant execute on function public.train(text) to authenticated;

create function public.upgrade_training_center(p_kind text, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_level integer;
  v_target integer := null;
begin
  if p_kind is null or p_kind not in ('basic', 'advanced', 'elite') then
    raise exception 'center_invalid' using errcode = '22023';
  end if;
  insert into game.training_centers (user_id, kind) values (v_citizen.user_id, p_kind) on conflict do nothing;
  select level into v_level from game.training_centers where user_id = v_citizen.user_id and kind = p_kind for update;
  -- A repeated key returns the level it reached.
  if p_key is not null then
    select (t.request ->> 'level')::integer into v_target from game.ledger_transactions as t
    where t.idempotency_key = 'training_upgrade:' || v_citizen.user_id::text || ':' || p_key::text;
    if v_target is not null then
      return v_target;
    end if;
  end if;
  if v_level >= game.param('training_level_max') then
    raise exception 'level_max' using errcode = '22023';
  end if;
  perform game.post(
    'training_upgrade', 'training_upgrade:' || v_citizen.user_id::text || ':' || coalesce(p_key::text, gen_random_uuid()::text),
    v_citizen.user_id,
    array[row(game.citizen_account(v_citizen.user_id, 'GOLD'), game.system_account('sink', 'GOLD'),
              game.param('training_upgrade_' || (v_level + 1)::text)::bigint, 'training_upgrade', p_kind)::game.ledger_leg],
    jsonb_build_object('kind', p_kind, 'level', v_level + 1)
  );
  update game.training_centers set level = v_level + 1, upgraded_at = game.now()
  where user_id = v_citizen.user_id and kind = p_kind;
  return v_level + 1;
end;
$$;
comment on function public.upgrade_training_center(text, uuid) is 'Raises a training center one level; the GOLD is burned.';
grant execute on function public.upgrade_training_center(text, uuid) to authenticated;

create function public.get_my_training()
returns table (
  kind text, level integer, trained_today boolean, energy integer, fee bigint, strength integer,
  injury_chance numeric, upgrade_cost bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.kind, game.center_level(auth.uid(), k.kind),
         exists (select 1 from game.training_sessions as t
                 where t.user_id = auth.uid() and t.kind = k.kind and t.game_day = game.game_day()),
         game.param('training_energy_' || k.kind)::integer,
         game.param('training_fee_' || k.kind)::bigint,
         game.param('training_strength_' || k.kind)::integer * game.center_level(auth.uid(), k.kind),
         game.center_level(auth.uid(), k.kind) * game.param('training_injury_per_level'),
         case when game.center_level(auth.uid(), k.kind) < game.param('training_level_max')
              then game.param('training_upgrade_' || (game.center_level(auth.uid(), k.kind) + 1)::text)::bigint end
  from (values ('basic', 1), ('advanced', 2), ('elite', 3)) as k (kind, position)
  where exists (select 1 from game.citizens where user_id = auth.uid())
  order by k.position;
$$;
comment on function public.get_my_training() is 'The player''s three centers: level, today''s session, cost, gain, injury chance, upgrade.';
grant execute on function public.get_my_training() to authenticated;

create function public.list_my_injuries()
returns table (cause text, reference text, health_lost integer, health_after integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.cause, i.reference, i.health_lost, i.health_after, i.created_at
  from game.injuries as i
  where i.user_id = auth.uid()
  order by i.created_at desc, i.id desc
  limit 10;
$$;
comment on function public.list_my_injuries() is 'The player''s latest injuries.';
grant execute on function public.list_my_injuries() to authenticated;

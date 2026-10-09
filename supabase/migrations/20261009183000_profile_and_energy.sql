-- D08 · Profile and energy (ADR 0009).
--
-- game.balance_params        every balance number of the game, read with game.param(key)
-- game.player_stats          what a citizen accumulates: experience, strength, damage, influence, energy
-- game.recharged_energy      energy at an instant, computed on arrival (10 per hour up to 100)
-- game.spend_energy          spends energy under a row lock, keeping the progress toward the next point
-- game.level_for_experience  level n needs 10 × (n − 1)² experience
-- game.rank_for_damage       rank n needs 10,000 × n² damage, up to 20
-- public.get_my_profile      the signed-in player's profile with the derived level, rank and energy
--
-- Errors are stable codes (ADR 0005): balance_param_missing, energy_amount_invalid, not_enough_energy,
-- no_citizen.
--
-- Rollback: drop public.get_my_profile, the trigger citizens_create_player_stats and the game functions
-- created here, then game.player_stats and game.balance_params.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Balance parameters ---------------------------------------------------------------------------------

create table game.balance_params (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,60}$'),
  value numeric not null,
  description text not null,
  updated_at timestamptz not null default now()
);
alter table game.balance_params enable row level security;
comment on table game.balance_params is 'Every balance number of the game. Rules read them with game.param().';

insert into game.balance_params (key, value, description) values
  ('energy_max', 100, 'Energy recharge stops here.'),
  ('energy_per_hour', 10, 'Energy recharged per hour.'),
  ('starting_strength', 100, 'Strength of a new citizen.'),
  ('level_experience_factor', 10, 'Reaching level n needs this × (n − 1)² experience.'),
  ('rank_damage_factor', 10000, 'Reaching rank n needs this × n² accumulated damage.'),
  ('rank_max', 20, 'Highest rank.');

create function game.param(p_key text)
returns numeric
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value numeric;
begin
  select value into v_value from game.balance_params where key = p_key;
  if not found then
    raise exception 'balance_param_missing' using errcode = 'P0002', detail = p_key;
  end if;
  return v_value;
end;
$$;
comment on function game.param(text) is 'A balance parameter. Fails when it does not exist, never defaults.';

-- Player stats ----------------------------------------------------------------------------------------

create table game.player_stats (
  user_id uuid primary key references game.citizens (user_id) on delete cascade,
  experience bigint not null default 0 check (experience >= 0),
  strength integer not null check (strength >= 0),
  damage bigint not null default 0 check (damage >= 0),
  influence integer not null default 0 check (influence >= 0),
  energy integer not null check (energy >= 0),
  energy_at timestamptz not null
);
alter table game.player_stats enable row level security;
comment on table game.player_stats is 'What a citizen accumulates. Level and rank are derived, never stored.';
comment on column game.player_stats.damage is 'War damage accumulated over the whole game; rank comes from it.';
comment on column game.player_stats.energy is 'Energy when it was last settled; the recharge since then is computed on arrival.';
comment on column game.player_stats.energy_at is 'When energy was last settled.';

create function game.create_player_stats()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into game.player_stats (user_id, strength, energy, energy_at)
  values (new.user_id, game.param('starting_strength')::integer, game.param('energy_max')::integer, game.now());
  return new;
end;
$$;

create trigger citizens_create_player_stats
after insert on game.citizens
for each row execute function game.create_player_stats();

-- Citizens created before this migration (local and test data only) start now.
insert into game.player_stats (user_id, strength, energy, energy_at)
select c.user_id, game.param('starting_strength')::integer, game.param('energy_max')::integer, game.now()
from game.citizens as c
on conflict (user_id) do nothing;

-- Energy ----------------------------------------------------------------------------------------------

-- Energy at p_at for a bar settled at p_energy on p_energy_at. Recharge never passes the maximum, and
-- energy already above it (food) is kept as is.
create function game.recharged_energy(p_energy integer, p_energy_at timestamptz, p_at timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_energy >= game.param('energy_max') then p_energy
    else least(
      game.param('energy_max'),
      p_energy + floor(greatest(extract(epoch from p_at - p_energy_at), 0) * game.param('energy_per_hour') / 3600)
    )::integer
  end;
$$;
comment on function game.recharged_energy(integer, timestamptz, timestamptz) is 'Energy at an instant, computed on arrival.';

-- When the next point arrives, or null when the bar is full.
create function game.next_energy_at(p_energy integer, p_energy_at timestamptz, p_at timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when game.recharged_energy(p_energy, p_energy_at, p_at) >= game.param('energy_max') then null
    else p_energy_at + make_interval(
      secs => (game.recharged_energy(p_energy, p_energy_at, p_at) - p_energy + 1) * 3600 / game.param('energy_per_hour')
    )
  end;
$$;
comment on function game.next_energy_at(integer, timestamptz, timestamptz) is 'When the next energy point arrives; null when full.';

-- Spends energy for an action (work, training, hits). Settles the recharge first and moves energy_at
-- forward only by the whole points gained, so the minutes toward the next point are not lost.
create function game.spend_energy(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_stats game.player_stats;
  v_now timestamptz := game.now();
  v_current integer;
  v_anchor timestamptz;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'energy_amount_invalid' using errcode = '22023';
  end if;

  select * into v_stats from game.player_stats where user_id = p_user_id for update;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;

  v_current := game.recharged_energy(v_stats.energy, v_stats.energy_at, v_now);
  if v_current < p_amount then
    raise exception 'not_enough_energy' using errcode = '22023';
  end if;

  v_anchor := case
    when v_current >= game.param('energy_max') then v_now
    else v_stats.energy_at + make_interval(
      secs => (v_current - v_stats.energy) * 3600 / game.param('energy_per_hour')
    )
  end;

  update game.player_stats
  set energy = v_current - p_amount, energy_at = v_anchor
  where user_id = p_user_id;
  return v_current - p_amount;
end;
$$;
comment on function game.spend_energy(uuid, integer) is 'Spends energy; fails with not_enough_energy. Returns what is left.';

-- Level and rank --------------------------------------------------------------------------------------

create function game.experience_for_level(p_level integer)
returns bigint
language sql
stable
set search_path = ''
as $$
  select (game.param('level_experience_factor') * (greatest(p_level, 1) - 1) ^ 2)::bigint;
$$;
comment on function game.experience_for_level(integer) is 'Experience needed to reach a level.';

create function game.level_for_experience(p_experience bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select 1 + floor(sqrt(greatest(p_experience, 0) / game.param('level_experience_factor')))::integer;
$$;
comment on function game.level_for_experience(bigint) is 'Level reached with an amount of experience.';

create function game.rank_for_damage(p_damage bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select least(
    game.param('rank_max'),
    floor(sqrt(greatest(p_damage, 0) / game.param('rank_damage_factor')))
  )::integer;
$$;
comment on function game.rank_for_damage(bigint) is 'Rank reached with an amount of accumulated damage.';

-- API -------------------------------------------------------------------------------------------------

create function public.get_my_profile()
returns table (
  name text,
  country_code text,
  citizen_code text,
  region_code text,
  joined_at timestamptz,
  level integer,
  experience bigint,
  level_experience bigint,
  next_level_experience bigint,
  strength integer,
  damage bigint,
  rank integer,
  next_rank_damage bigint,
  influence integer,
  energy integer,
  energy_max integer,
  energy_per_hour integer,
  next_energy_at timestamptz,
  checked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select c.*, s.experience, s.strength, s.damage, s.influence, s.energy, s.energy_at,
           game.level_for_experience(s.experience) as level,
           game.rank_for_damage(s.damage) as rank,
           game.now() as checked_at
    from game.citizens as c
    join game.player_stats as s on s.user_id = c.user_id
    where c.user_id = auth.uid()
  )
  select me.name, me.country_code, game.citizen_code(me.country_code, me.citizen_number), me.region_code,
         me.joined_at, me.level, me.experience,
         game.experience_for_level(me.level), game.experience_for_level(me.level + 1),
         me.strength, me.damage, me.rank,
         case when me.rank < game.param('rank_max')
           then (game.param('rank_damage_factor') * (me.rank + 1) ^ 2)::bigint
         end,
         me.influence,
         game.recharged_energy(me.energy, me.energy_at, me.checked_at),
         game.param('energy_max')::integer,
         game.param('energy_per_hour')::integer,
         game.next_energy_at(me.energy, me.energy_at, me.checked_at),
         me.checked_at
  from me;
$$;
comment on function public.get_my_profile() is 'The signed-in player''s profile with level, rank and energy computed now, or no rows.';
grant execute on function public.get_my_profile() to authenticated;

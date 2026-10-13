-- R1 · Player core (spec sections 1 and 6, ADR 0015).
--
-- - Business time is UTC: the game day changes at 00:00 UTC.
-- - Health 0–100 per player, no passive regeneration.
-- - Civil level L at 100 × L² XP (level 0 at start); game.add_civil_xp pays 1 GOLD per new level, once.
-- - Military XP and the rank ladder: step n at 100 × n², capped at 75 (General V); game.add_military_xp.
-- - Starting strength 0; the GDD's rank by accumulated damage is removed (damage stays as a statistic).
--
-- Errors (ADR 0005): amount_invalid, no_citizen.
--
-- Rollback: restore game.game_day, game.game_day_start, game.level_for_experience, game.experience_for_level
-- and public.get_my_profile from 20261009143336 and 20261009183000; recreate game.rank_for_damage; drop the
-- new functions and the health and military_xp columns; restore the balance_params rows changed here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- UTC game day ------------------------------------------------------------------------------------

create or replace function game.game_day(p_at timestamptz default game.now())
returns date
language sql
stable
parallel safe
set search_path = ''
as $$
  select (p_at at time zone 'UTC')::date;
$$;
comment on function game.game_day(timestamptz) is 'Game day (UTC) of an instant.';

create or replace function game.game_day_start(p_day date)
returns timestamptz
language sql
stable
parallel safe
set search_path = ''
as $$
  select p_day::timestamp at time zone 'UTC';
$$;
comment on function game.game_day_start(date) is 'Instant a game day starts (00:00 UTC).';

update game.scheduled_jobs
set origin = '2000-01-01 00:00:00+00', description = 'Opens the new game day at 00:00 UTC.'
where name = 'day_change';

-- Balance parameters -------------------------------------------------------------------------------

update game.balance_params
set value = 100, description = 'Civil level L needs this × L² XP (spec section 1).', updated_at = now()
where key = 'level_experience_factor';
update game.balance_params
set value = 0, description = 'Military strength of a new citizen (spec damage 10 + F).', updated_at = now()
where key = 'starting_strength';
delete from game.balance_params where key in ('rank_damage_factor', 'rank_max');

insert into game.balance_params (key, value, description) values
  ('civil_level_reward_gold', 1, 'GOLD issued for each new civil level, once (spec section 1).'),
  ('rank_xp_factor', 100, 'Rank step n needs this × n² military XP (spec section 6).'),
  ('rank_steps_max', 75, 'Highest rank step, General V.'),
  ('rank_damage_bonus_per_step', 0.05, 'Damage added by each rank step.'),
  ('health_max', 100, 'Maximum health.');

-- Player stats ------------------------------------------------------------------------------------

alter table game.player_stats add column health integer not null default 100;
-- squawk-ignore constraint-missing-not-valid
alter table game.player_stats add constraint player_stats_health_range check (health between 0 and 100);
alter table game.player_stats add column military_xp bigint not null default 0;
-- squawk-ignore constraint-missing-not-valid
alter table game.player_stats add constraint player_stats_military_xp_positive check (military_xp >= 0);
comment on column game.player_stats.experience is 'Civil XP; the civil level is derived from it.';
comment on column game.player_stats.health is 'Health 0–100; no passive regeneration.';
comment on column game.player_stats.military_xp is 'Military XP; the rank step is derived from it.';
comment on column game.player_stats.damage is 'Valid war damage accumulated over the whole game (statistic).';

-- Levels and ranks --------------------------------------------------------------------------------

create or replace function game.level_for_experience(p_experience bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select floor(sqrt(greatest(p_experience, 0) / game.param('level_experience_factor')))::integer;
$$;
comment on function game.level_for_experience(bigint) is 'Civil level reached with an amount of XP (level 0 at start).';

create or replace function game.experience_for_level(p_level integer)
returns bigint
language sql
stable
set search_path = ''
as $$
  select (game.param('level_experience_factor') * greatest(p_level, 0) ^ 2)::bigint;
$$;
comment on function game.experience_for_level(integer) is 'Civil XP needed to reach a level: 100 × L².';

create function game.rank_step(p_military_xp bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select least(
    game.param('rank_steps_max'),
    floor(sqrt(greatest(p_military_xp, 0) / game.param('rank_xp_factor')))
  )::integer;
$$;
comment on function game.rank_step(bigint) is 'Rank step 0 (Novice) to 75 (General V) for an amount of military XP.';

create function game.military_xp_for_step(p_step integer)
returns bigint
language sql
stable
set search_path = ''
as $$
  select (game.param('rank_xp_factor') * greatest(p_step, 0) ^ 2)::bigint;
$$;
comment on function game.military_xp_for_step(integer) is 'Military XP needed for a rank step: 100 × n².';

-- squawk-ignore ban-drop-function
drop function game.rank_for_damage(bigint);

-- Credits civil XP and pays the reward of every new level once (idempotent per level).
create function game.add_civil_xp(p_user_id uuid, p_amount bigint)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_before bigint;
  v_old_level integer;
  v_new_level integer;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  update game.player_stats set experience = experience + p_amount
  where user_id = p_user_id
  returning experience - p_amount into v_before;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  v_old_level := game.level_for_experience(v_before);
  v_new_level := game.level_for_experience(v_before + p_amount);

  for v_level in v_old_level + 1 .. v_new_level loop
    perform game.post(
      'level_reward', 'level_reward:' || p_user_id::text || ':' || v_level::text, p_user_id,
      array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(p_user_id, 'GOLD'),
                (game.param('civil_level_reward_gold') * 100)::bigint, 'level_reward',
                'Nivel ' || v_level::text)::game.ledger_leg]
    );
  end loop;
  return v_new_level;
end;
$$;
comment on function game.add_civil_xp(uuid, bigint) is 'Adds civil XP; pays 1 GOLD per new level, never twice.';

create function game.add_military_xp(p_user_id uuid, p_amount bigint)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_xp bigint;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  update game.player_stats set military_xp = military_xp + p_amount
  where user_id = p_user_id
  returning military_xp into v_xp;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  return game.rank_step(v_xp);
end;
$$;
comment on function game.add_military_xp(uuid, bigint) is 'Adds military XP (counted past General V as a statistic).';

-- Profile -----------------------------------------------------------------------------------------

-- The return type changes, which needs a new function. Only this web calls it.
-- squawk-ignore ban-drop-function
drop function public.get_my_profile();

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
  health integer,
  health_max integer,
  strength integer,
  military_xp bigint,
  rank_step integer,
  rank_xp bigint,
  next_rank_xp bigint,
  damage bigint,
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
    select c.*, s.experience, s.health, s.strength, s.military_xp, s.damage, s.influence, s.energy, s.energy_at,
           game.level_for_experience(s.experience) as level,
           game.rank_step(s.military_xp) as rank_step,
           game.now() as checked_at
    from game.citizens as c
    join game.player_stats as s on s.user_id = c.user_id
    where c.user_id = auth.uid()
  )
  select me.name, me.country_code, game.citizen_code(me.country_code, me.citizen_number), me.region_code,
         me.joined_at, me.level, me.experience,
         game.experience_for_level(me.level), game.experience_for_level(me.level + 1),
         me.health, game.param('health_max')::integer,
         me.strength, me.military_xp, me.rank_step, game.military_xp_for_step(me.rank_step),
         case when me.rank_step < game.param('rank_steps_max') then game.military_xp_for_step(me.rank_step + 1) end,
         me.damage, me.influence,
         game.recharged_energy(me.energy, me.energy_at, me.checked_at),
         game.param('energy_max')::integer,
         game.param('energy_per_hour')::integer,
         game.next_energy_at(me.energy, me.energy_at, me.checked_at),
         me.checked_at
  from me;
$$;
comment on function public.get_my_profile() is 'The signed-in player''s profile: level, health, strength, rank and energy, or no rows.';
grant execute on function public.get_my_profile() to authenticated;

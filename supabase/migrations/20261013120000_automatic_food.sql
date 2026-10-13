-- R4 · Automatic food (spec section 1 and assumption 6, ADR 0018).
--
-- Every 5 minutes on a UTC grid, a player below 100 energy who holds food eats one unit of the lowest
-- sufficient quality and recovers up to 10 energy; the excess is lost. Nothing runs per player: intervals
-- are settled on arrival (reading the profile or the inventory, spending or adding energy), catching up every
-- interval missed since the last one, in order, together with the hourly recharge.
--
-- game.food_tick, game.settle_food; game.spend_energy and game.add_energy settle first;
-- public.get_my_profile and public.get_my_inventory settle before reading.
-- Manual eating (D12) and its daily cap are removed: public.eat_rations, public.get_my_food_today.
--
-- Rollback: restore game.spend_energy, game.add_energy, public.get_my_profile, public.get_my_inventory and
-- public.list_goods_effects from 20261009183000, 20261009230000, 20261013090000 and 20261013110000;
-- recreate public.eat_rations and public.get_my_food_today from 20261013110000 and 20261009230000; drop
-- game.settle_food, game.food_tick and player_stats.food_at; restore food_energy_daily_max (200).

set local lock_timeout = '5s';
set local statement_timeout = '60s';

delete from game.balance_params where key = 'food_energy_daily_max';
insert into game.balance_params (key, value, description) values
  ('food_interval_minutes', 5, 'Minutes between automatic meals (spec section 1).'),
  ('food_energy_per_interval', 10, 'Most energy one automatic meal restores; the excess is lost.');

alter table game.player_stats add column food_at timestamptz;
comment on column game.player_stats.food_at is 'Last automatic-food interval settled; null until the first arrival.';

create function game.food_tick(p_at timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select to_timestamp(
    floor(extract(epoch from p_at) / (game.param('food_interval_minutes') * 60)) * game.param('food_interval_minutes') * 60
  );
$$;
comment on function game.food_tick(timestamptz) is 'Start of the 5-minute UTC interval an instant belongs to.';

-- Settles every food interval up to now and returns the energy now. Locks the player's stats.
create function game.settle_food(p_user_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_stats game.player_stats;
  v_now timestamptz := game.now();
  v_last timestamptz := game.food_tick(v_now);
  v_step interval := make_interval(mins => game.param('food_interval_minutes')::integer);
  v_max integer := game.param('energy_max')::integer;
  v_per_hour numeric := game.param('energy_per_hour');
  v_meal integer := game.param('food_energy_per_interval')::integer;
  v_holder bigint;
  v_tick timestamptz;
  v_energy integer;
  v_good text;
  v_gain integer;
begin
  select * into v_stats from game.player_stats where user_id = p_user_id for update;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  select id into v_holder from game.holders where kind = 'citizen' and user_id = p_user_id;

  if v_stats.food_at is not null and v_holder is not null then
    v_tick := v_stats.food_at + v_step;
    while v_tick <= v_last loop
      v_energy := game.recharged_energy(v_stats.energy, v_stats.energy_at, v_tick);
      -- Full: nothing is eaten, and nothing lowers energy until the player acts (which settles first).
      exit when v_energy >= v_max;
      -- The lowest quality that covers what is missing, up to one meal.
      select l.good_code into v_good
      from game.inventory_lots as l
      join game.goods as g on g.code = l.good_code
      where l.holder_id = v_holder and l.quantity >= 1 and g.energy >= least(v_meal, v_max - v_energy)
      order by g.energy, l.id
      limit 1;
      exit when v_good is null;

      perform game.take_goods(v_holder, v_good, 1, 'automatic_food',
                              'food:' || p_user_id::text || ':' || to_char(v_tick at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI'));
      v_gain := least(v_meal, v_max - v_energy);
      -- As when spending: energy_at advances only by the whole points recharged, keeping the progress.
      v_stats.energy_at := case
        when v_energy + v_gain >= v_max then v_tick
        else v_stats.energy_at + make_interval(secs => (v_energy - v_stats.energy) * 3600 / v_per_hour)
      end;
      v_stats.energy := v_energy + v_gain;
      v_tick := v_tick + v_step;
    end loop;
  end if;

  update game.player_stats
  set energy = v_stats.energy, energy_at = v_stats.energy_at, food_at = v_last
  where user_id = p_user_id;
  return game.recharged_energy(v_stats.energy, v_stats.energy_at, v_now);
end;
$$;
comment on function game.settle_food(uuid) is
  'Eats the automatic meals of every 5-minute interval up to now (lowest sufficient quality, up to +10 each).';

create or replace function game.spend_energy(p_user_id uuid, p_amount integer)
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

  perform game.settle_food(p_user_id);
  select * into v_stats from game.player_stats where user_id = p_user_id;

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
comment on function game.spend_energy(uuid, integer) is
  'Spends energy after settling recharge and automatic food; fails with not_enough_energy. Returns what is left.';

create or replace function game.add_energy(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_stats game.player_stats;
  v_now timestamptz := game.now();
  v_current integer;
begin
  perform game.settle_food(p_user_id);
  select * into v_stats from game.player_stats where user_id = p_user_id;
  v_current := game.recharged_energy(v_stats.energy, v_stats.energy_at, v_now);
  update game.player_stats
  set energy = v_current + p_amount,
      energy_at = case
        when v_current >= game.param('energy_max') then v_now
        else v_stats.energy_at + make_interval(
          secs => (v_current - v_stats.energy) * 3600 / game.param('energy_per_hour'))
      end
  where user_id = p_user_id;
  return v_current + p_amount;
end;
$$;
comment on function game.add_energy(uuid, integer) is 'Adds energy after settling the recharge and automatic food.';

-- Reading settles first, so what the player sees is what the rules have done.
create or replace function public.get_my_profile()
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
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if exists (select 1 from game.citizens as c where c.user_id = auth.uid()) then
    perform game.settle_food(auth.uid());
  end if;
  return query
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
end;
$$;

create or replace function public.get_my_inventory()
returns table (good_code text, quantity numeric)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if exists (select 1 from game.citizens as c where c.user_id = auth.uid()) then
    perform game.settle_food(auth.uid());
  end if;
  return query
  select l.good_code, sum(l.quantity)
  from game.inventory_lots as l
  join game.holders as h on h.id = l.holder_id and h.kind = 'citizen'
  where h.user_id = auth.uid()
  group by l.good_code
  having sum(l.quantity) > 0
  order by l.good_code;
end;
$$;

-- squawk-ignore ban-drop-function
drop function public.list_goods_effects();

create function public.list_goods_effects()
returns table (code text, damage_multiplier numeric, energy integer, heal integer, food_energy_per_interval integer)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code, g.damage_multiplier, g.energy, g.heal, game.param('food_energy_per_interval')::integer
  from game.goods as g
  order by g.code;
$$;
comment on function public.list_goods_effects() is 'What each good does, for the inventory screen. Public.';
grant execute on function public.list_goods_effects() to anon, authenticated;

-- Food is eaten automatically now; game.meals and game.food_days stay as history.
-- squawk-ignore ban-drop-function
drop function public.eat_rations(integer, uuid);
-- squawk-ignore ban-drop-function
drop function public.get_my_food_today();

-- Energy comes only from food (owner, ADR 0047).
--
-- The hourly recharge is gone: without food energy does not rise. Food builds up 2 energy of appetite a minute,
-- capped at 10 and at what is missing; on a 1-minute UTC grid, once the appetite covers the lowest-quality food
-- held, that unit is eaten and gives all of its energy (Q1 2, Q2 4, Q3 6, Q4 8, Q5 10). Nothing is wasted: a
-- Q2 waits until 4 are missing and 4 have built up. Every training session costs 10 energy.
--
-- player_stats.food_appetite; game.food_appetite_after; game.settle_food, game.spend_energy and
-- game.add_energy without the recharge; game.put_goods settles a citizen's meals before food arrives, so food
-- bought now is never eaten in minutes already past; public.get_my_profile returns the appetite and the next
-- meal instead of the recharge.
--
-- Rollback: restore game.settle_food, game.spend_energy, game.add_energy and public.get_my_profile from
-- 20261013120000, game.put_goods from 20261013110000, game.recharged_energy and game.next_energy_at from
-- 20261009183000; drop game.food_appetite_after and player_stats.food_appetite; restore energy_per_hour (10),
-- food_interval_minutes (5), food_energy_per_interval (10), training_energy_advanced (15) and
-- training_energy_elite (20); set the food goods' energy back to 10 × quality.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

delete from game.balance_params where key = 'energy_per_hour';
update game.balance_params set value = 1, description = 'Minutes between automatic meals (owner, ADR 0047).'
where key = 'food_interval_minutes';
update game.balance_params set value = 2, description = 'Appetite (energy food may restore) built up each interval.'
where key = 'food_energy_per_interval';
update game.balance_params set value = 10 where key in ('training_energy_advanced', 'training_energy_elite');
insert into game.balance_params (key, value, description) values
  ('food_appetite_max', 10, 'Most appetite that builds up; one meal never restores more (owner, ADR 0047).');

update game.goods set energy = 2 * quality where category = 'food' and energy is not null;
comment on column game.goods.energy is 'Energy one unit of food gives: 2 per quality level.';

-- squawk-ignore adding-required-field
alter table game.player_stats add column food_appetite integer not null default 0
  check (food_appetite >= 0);
comment on column game.player_stats.food_appetite is
  'Energy food may restore right now: builds up each interval, capped at food_appetite_max and at what is missing.';
comment on column game.player_stats.energy_at is 'When energy last changed. Energy no longer recharges by time.';

-- squawk-ignore ban-drop-function
drop function game.next_energy_at(integer, timestamptz, timestamptz);
-- squawk-ignore ban-drop-function
drop function game.recharged_energy(integer, timestamptz, timestamptz);

create function game.food_appetite_after(p_appetite integer, p_energy integer, p_intervals bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(0, least(
    p_appetite + p_intervals * game.param('food_energy_per_interval')::integer,
    game.param('food_appetite_max')::integer,
    game.param('energy_max')::integer - p_energy
  ))::integer;
$$;
comment on function game.food_appetite_after(integer, integer, bigint) is
  'Appetite after some intervals: capped at food_appetite_max and at the energy missing.';

-- Settles every interval up to now and returns the energy now. Locks the player's stats.
create or replace function game.settle_food(p_user_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_stats game.player_stats;
  v_last timestamptz := game.food_tick(game.now());
  v_step interval := make_interval(mins => game.param('food_interval_minutes')::integer);
  v_holder bigint;
  v_tick timestamptz;
  v_good text;
  v_value integer;
begin
  select * into v_stats from game.player_stats where user_id = p_user_id for update;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  select id into v_holder from game.holders where kind = 'citizen' and user_id = p_user_id;

  if v_stats.food_at is not null and v_holder is not null and v_stats.food_at < v_last then
    v_tick := v_stats.food_at + v_step;
    -- Bounded: a meal comes at least every 5 intervals and the bar fills within 50 meals; without food or
    -- with a full bar the remaining intervals are settled at once.
    while v_tick <= v_last loop
      select l.good_code, g.energy into v_good, v_value
      from game.inventory_lots as l
      join game.goods as g on g.code = l.good_code
      where l.holder_id = v_holder and l.quantity >= 1 and g.energy is not null
      order by g.energy, l.id
      limit 1;
      if v_good is null or v_stats.energy >= game.param('energy_max') then
        v_stats.food_appetite := game.food_appetite_after(
          v_stats.food_appetite, v_stats.energy,
          (extract(epoch from v_last - v_tick) / extract(epoch from v_step))::bigint + 1);
        exit;
      end if;
      v_stats.food_appetite := game.food_appetite_after(v_stats.food_appetite, v_stats.energy, 1);
      -- The lowest quality held, once the appetite covers all of it; until then nothing is eaten.
      if v_stats.food_appetite >= v_value then
        perform game.take_goods(v_holder, v_good, 1, 'automatic_food',
                                'food:' || p_user_id::text || ':' || to_char(v_tick at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI'));
        v_stats.energy := v_stats.energy + v_value;
        v_stats.energy_at := v_tick;
        v_stats.food_appetite := v_stats.food_appetite - v_value;
      end if;
      v_tick := v_tick + v_step;
    end loop;
  end if;

  update game.player_stats
  set energy = v_stats.energy, energy_at = v_stats.energy_at, food_appetite = v_stats.food_appetite,
      food_at = v_last
  where user_id = p_user_id;
  return v_stats.energy;
end;
$$;
comment on function game.settle_food(uuid) is
  'Eats the automatic meals of every interval up to now: the lowest quality held, once the appetite covers it.';

create or replace function game.spend_energy(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_current integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'energy_amount_invalid' using errcode = '22023';
  end if;
  v_current := game.settle_food(p_user_id);
  if v_current < p_amount then
    raise exception 'not_enough_energy' using errcode = '22023';
  end if;
  update game.player_stats
  set energy = v_current - p_amount, energy_at = game.now()
  where user_id = p_user_id;
  return v_current - p_amount;
end;
$$;
comment on function game.spend_energy(uuid, integer) is
  'Spends energy after settling automatic food; fails with not_enough_energy. Returns what is left.';

create or replace function game.add_energy(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_current integer;
begin
  v_current := game.settle_food(p_user_id) + p_amount;
  update game.player_stats
  set energy = v_current, energy_at = game.now(),
      food_appetite = game.food_appetite_after(food_appetite, v_current, 0)
  where user_id = p_user_id;
  return v_current;
end;
$$;
comment on function game.add_energy(uuid, integer) is 'Adds energy after settling automatic food.';

-- Food that reaches a citizen is never eaten in intervals already past: their meals are settled first.
create or replace function game.put_goods(
  p_holder_id bigint,
  p_good_code text,
  p_origin_country_code text,
  p_quantity numeric,
  p_kind text,
  p_reference text,
  p_from_holder_id bigint default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.goods
                 where code = p_good_code and (active or p_kind = 'market_withdrawal')) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if exists (select 1 from game.goods where code = p_good_code and energy is not null) then
    select h.user_id into v_user_id from game.holders as h where h.id = p_holder_id and h.kind = 'citizen';
    if v_user_id is not null and exists (select 1 from game.player_stats as s where s.user_id = v_user_id) then
      perform game.settle_food(v_user_id);
    end if;
  end if;
  insert into game.inventory_lots (holder_id, good_code, origin_country_code, quantity, created_at)
  values (p_holder_id, p_good_code, p_origin_country_code, p_quantity, game.now())
  on conflict (holder_id, good_code, origin_country_code)
  do update set quantity = game.inventory_lots.quantity + excluded.quantity;
  insert into game.inventory_movements (kind, good_code, origin_country_code, quantity, from_holder_id, to_holder_id,
                                        reference, created_at)
  values (p_kind, p_good_code, p_origin_country_code, p_quantity, p_from_holder_id, p_holder_id, p_reference, game.now());
end;
$$;

-- The profile shows the appetite and the next meal instead of the recharge.
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
  food_appetite integer,
  food_appetite_max integer,
  food_energy_per_interval integer,
  food_interval_minutes integer,
  food_at timestamptz,
  next_meal_energy integer,
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
    select c.*, s.experience, s.health, s.strength, s.military_xp, s.damage, s.influence, s.energy,
           s.food_appetite, s.food_at,
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
         me.energy,
         game.param('energy_max')::integer,
         me.food_appetite,
         game.param('food_appetite_max')::integer,
         game.param('food_energy_per_interval')::integer,
         game.param('food_interval_minutes')::integer,
         me.food_at,
         (select min(g.energy)
          from game.inventory_lots as l
          join game.holders as h on h.id = l.holder_id and h.kind = 'citizen'
          join game.goods as g on g.code = l.good_code
          where h.user_id = me.user_id and l.quantity >= 1 and g.energy is not null),
         me.checked_at
  from me;
end;
$$;
comment on function public.get_my_profile() is
  'The signed-in citizen''s profile, after settling automatic food; next_meal_energy is null without food.';
grant execute on function public.get_my_profile() to authenticated;

-- With food held, the appetite never exceeds what the next meal gives (owner, ADR 0047 amended).
--
-- The appetite built up without food (up to 10) stayed banked once food arrived: after a run of Q1 meals 8 were
-- left over, so a Q3 was eaten one minute after the last Q1 instead of waiting three. Now, on each interval with
-- food, the appetite is capped at the next meal's energy: a Q1 every minute, a Q2 every two, a Q5 every five.
-- Without food it still builds up to 10, shown fainter on the bar.
--
-- game.settle_food.
--
-- Rollback: restore game.settle_food from 20261108090000.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

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
      -- Never more than this meal gives, so nothing banked makes a meal come early.
      v_stats.food_appetite := least(game.food_appetite_after(v_stats.food_appetite, v_stats.energy, 1), v_value);
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
  'Eats the automatic meals of every interval up to now: the lowest quality held, once the appetite (capped at '
  'that meal) covers it.';

-- D12 · Products and consumption.
--
-- game.goods.damage_multiplier  ×(1 + 0.2 × Q) for weapons (GDD module 4), used by combat (D16)
-- game.food_days                energy recovered from food per player and game day
-- game.add_energy               adds energy, settling the recharge first (food, hospitals)
-- public.eat_rations            rations into energy, at most 200 per game day
-- public.move_goods             between an own company's depot and the owner's inventory
--
-- Errors (ADR 0005): amount_invalid, quantity_unavailable, food_limit, not_your_company, good_invalid,
-- no_citizen, not_authenticated.
--
-- Rollback: drop public.eat_rations, public.move_goods, game.add_energy and game.food_days, drop the
-- damage_multiplier column and delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('ration_energy', 10, 'Energy a ration gives.'),
  ('food_energy_daily_max', 200, 'Energy a player may recover from food in one game day.'),
  ('weapon_damage_per_quality', 0.2, 'A Q weapon multiplies damage by 1 + this × Q.');

alter table game.goods add column damage_multiplier numeric check (damage_multiplier > 1);
comment on column game.goods.damage_multiplier is 'Damage multiplier of one hit with this weapon.';
update game.goods
set damage_multiplier = 1 + game.param('weapon_damage_per_quality') * quality
where quality is not null;

create table game.food_days (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  game_day date not null,
  energy integer not null check (energy >= 0),
  primary key (user_id, game_day)
);
alter table game.food_days enable row level security;
comment on table game.food_days is 'Energy recovered from food per player and game day (capped).';

create table game.meals (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  idempotency_key text not null,
  rations integer not null,
  energy_gained integer not null,
  created_at timestamptz not null,
  primary key (user_id, idempotency_key)
);
alter table game.meals enable row level security;
comment on table game.meals is 'Each meal, so a repeated request eats nothing more.';

-- Adds energy after settling the recharge, keeping the progress toward the next point as spending does.
create function game.add_energy(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_stats game.player_stats;
  v_now timestamptz := game.now();
  v_current integer;
begin
  select * into v_stats from game.player_stats where user_id = p_user_id for update;
  if not found then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
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
comment on function game.add_energy(uuid, integer) is 'Adds energy (food, hospitals) after settling the recharge.';

create function public.eat_rations(p_quantity integer, p_key uuid)
returns table (energy_gained integer, energy integer, food_energy_today integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := p_key::text;
  v_day date := game.game_day();
  v_gain integer;
  v_today integer;
  v_energy integer;
begin
  if exists (select 1 from game.meals as m where m.user_id = v_citizen.user_id and m.idempotency_key = v_key) then
    return query
      select m.energy_gained,
             (select pr.energy from public.get_my_profile() as pr),
             coalesce((select f.energy from game.food_days as f where f.user_id = v_citizen.user_id and f.game_day = v_day), 0)
      from game.meals as m where m.user_id = v_citizen.user_id and m.idempotency_key = v_key;
    return;
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if coalesce((select i.quantity from game.inventories as i
               where i.user_id = v_citizen.user_id and i.good_code = 'ration'), 0) < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;

  v_gain := p_quantity * game.param('ration_energy')::integer;
  insert into game.food_days as f (user_id, game_day, energy) values (v_citizen.user_id, v_day, 0)
  on conflict (user_id, game_day) do nothing;
  select f.energy into v_today from game.food_days as f
  where f.user_id = v_citizen.user_id and f.game_day = v_day for update;
  if v_today + v_gain > game.param('food_energy_daily_max') then
    raise exception 'food_limit' using errcode = '22023';
  end if;

  perform game.add_goods(v_citizen.user_id, null, 'ration', -p_quantity);
  update game.food_days as f set energy = f.energy + v_gain
  where f.user_id = v_citizen.user_id and f.game_day = v_day;
  v_energy := game.add_energy(v_citizen.user_id, v_gain);
  insert into game.meals (user_id, idempotency_key, rations, energy_gained, created_at)
  values (v_citizen.user_id, v_key, p_quantity, v_gain, game.now());

  return query select v_gain, v_energy, v_today + v_gain;
end;
$$;
comment on function public.eat_rations(integer, uuid) is 'Eats rations for 10 energy each, up to 200 from food per game day.';
grant execute on function public.eat_rations(integer, uuid) to authenticated;

create function public.get_my_food_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.energy from game.food_days as f
                   where f.user_id = auth.uid() and f.game_day = game.game_day()), 0);
$$;
comment on function public.get_my_food_today() is 'Energy the player recovered from food today.';
grant execute on function public.get_my_food_today() to authenticated;

-- p_to_inventory: true moves from the depot to the owner's inventory, false the other way.
create function public.move_goods(p_company_id bigint, p_good_code text, p_quantity numeric, p_to_inventory boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
begin
  if not exists (select 1 from game.goods where code = p_good_code) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_to_inventory then
    perform game.add_goods(v_company.owner_user_id, v_company.id, p_good_code, -p_quantity);
    perform game.add_goods(v_company.owner_user_id, null, p_good_code, p_quantity);
  else
    perform game.add_goods(v_company.owner_user_id, null, p_good_code, -p_quantity);
    perform game.add_goods(v_company.owner_user_id, v_company.id, p_good_code, p_quantity);
  end if;
end;
$$;
comment on function public.move_goods(bigint, text, numeric, boolean) is
  'Moves goods between an own company''s depot and the owner''s inventory.';
grant execute on function public.move_goods(bigint, text, numeric, boolean) to authenticated;

create function public.list_goods_effects()
returns table (code text, damage_multiplier numeric, ration_energy integer, food_energy_daily_max integer)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code, g.damage_multiplier, game.param('ration_energy')::integer, game.param('food_energy_daily_max')::integer
  from game.goods as g
  order by g.code;
$$;
comment on function public.list_goods_effects() is 'What each good does, for the inventory screen. Public.';
grant execute on function public.list_goods_effects() to anon, authenticated;

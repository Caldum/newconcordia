-- R7 · Personal medical kits (spec sections 1 and 7, ADR 0023): a kit Q1–Q5 heals 5 × Q health up to the
-- maximum, the whole unit is consumed even if part of it is wasted, and it can be used at zero health.
--
-- game.kit_uses     every kit used: which, from which origin, what it healed and the health after
-- public.use_kit    consumes one kit of the player's inventory (oldest lot first)
--
-- Errors (ADR 0005): good_invalid, health_full, quantity_unavailable, no_citizen, not_authenticated.
--
-- Rollback: drop public.use_kit and game.kit_uses.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table game.kit_uses (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  good_code text not null references game.goods (code),
  origin_country_code text not null references game.countries (code),
  healed integer not null check (healed >= 0),
  health_after integer not null check (health_after between 0 and 100),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null
);
alter table game.kit_uses enable row level security;
comment on table game.kit_uses is 'Every personal medical kit used, with what it healed.';
create index kit_uses_user_idx on game.kit_uses (user_id, created_at);

create function public.use_kit(p_good_code text, p_key uuid)
returns table (healed integer, health integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'kit:' || auth.uid()::text || ':' || p_key::text;
  v_heal integer;
  v_health integer;
  v_max integer := game.param('health_max')::integer;
  v_origin text;
  v_healed integer;
begin
  -- The player's stats row serializes their kits, so a repeated key finds the first use.
  select s.health into v_health from game.player_stats as s where s.user_id = v_citizen.user_id for update;
  if exists (select 1 from game.kit_uses as u where u.idempotency_key = v_key) then
    return query select u.healed, u.health_after from game.kit_uses as u where u.idempotency_key = v_key;
    return;
  end if;
  select g.heal into v_heal from game.goods as g where g.code = p_good_code and g.category = 'medical' and g.heal is not null;
  if v_heal is null then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if v_health >= v_max then
    raise exception 'health_full' using errcode = '22023';
  end if;

  select t.taken_origin into v_origin
  from game.take_goods(game.holder_for_citizen(v_citizen.user_id), p_good_code, 1, 'kit_used', v_key) as t
  limit 1;
  v_healed := least(v_heal, v_max - v_health);
  update game.player_stats as s set health = s.health + v_healed where s.user_id = v_citizen.user_id;
  insert into game.kit_uses (user_id, good_code, origin_country_code, healed, health_after, idempotency_key, created_at)
  values (v_citizen.user_id, p_good_code, v_origin, v_healed, v_health + v_healed, v_key, game.now());
  return query select v_healed, v_health + v_healed;
end;
$$;
comment on function public.use_kit(text, uuid) is
  'Uses one medical kit of the inventory: heals 5 × Q up to the maximum, also at zero health; the whole kit is spent.';
grant execute on function public.use_kit(text, uuid) to authenticated;

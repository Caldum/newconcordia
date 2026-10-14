-- P2 · Where every citizen is and travel between regions, priced by real distance (ADR 0042; spec PD-03 decided by the
-- owner on 2026-11-03).
--
-- A trip costs 0.0001 GOLD per kilometre between the regions' centroids, charged in the traveller's national
-- currency at the average GOLD price of their currency's market over the last 6 hours (500 per GOLD while that
-- market has no trades). The money is burned. Trips are instant; at zero health nobody travels (spec section 6).
--
-- game.regions             + latitude, longitude (centroids from data/map/scripts/region_centroids.mjs)
-- game.travel_events       every trip with its distance and price
-- game.region_distance_km, game.gold_rate, game.travel_price
-- public.travel (replaced), get_travel_terms (replaced), list_travel_destinations
--
-- Errors (ADR 0005): travel_disabled, region_invalid, health_zero, insufficient_funds.
--
-- Rollback: drop public.list_travel_destinations, game.travel_price, game.gold_rate, game.region_distance_km,
-- game.travel_events and the regions' latitude and longitude; restore public.travel and public.get_travel_terms from
-- 20261027090000; set travel_enabled to 0, delete the balance_params rows added here and add travel_price_gold back.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

update game.balance_params
set value = 1, updated_at = now(), description = 'Travel between regions is open (PD-03 decided by the owner).'
where key = 'travel_enabled';
delete from game.balance_params where key = 'travel_price_gold';
insert into game.balance_params (key, value, description) values
  ('travel_gold_per_km', 0.0001, 'GOLD a trip costs per kilometre, charged in the national currency.'),
  ('travel_rate_hours', 6, 'Hours of the national currency''s GOLD market averaged to price a trip.'),
  ('travel_fallback_rate', 500, 'National currency units per GOLD while its market has no recent trades.');

-- Where regions are --------------------------------------------------------------------------------------------------

-- 78 static rows, read-only for players: the scan and locks are instant.
alter table game.regions add column latitude numeric(6, 3) check (latitude between -90 and 90);
alter table game.regions add column longitude numeric(6, 3) check (longitude between -180 and 180);
comment on column game.regions.latitude is 'Centroid of the region, for travel distances.';
comment on column game.regions.longitude is 'Centroid of the region, for travel distances.';

update game.regions as r
set latitude = v.latitude, longitude = v.longitude, updated_at = now()
from (values
  ('ARG-01', -36.678, -60.562),
  ('ARG-02', -31.599, -61.847),
  ('ARG-03', -25.980, -64.981),
  ('ARG-04', -26.794, -59.027),
  ('ARG-05', -32.573, -67.866),
  ('ARG-06', -43.401, -68.352),
  ('BRA-01', -3.400, -64.303),
  ('BRA-02', -4.628, -52.215),
  ('BRA-03', -10.282, -65.836),
  ('BRA-04', -6.110, -44.284),
  ('BRA-05', -5.691, -38.414),
  ('BRA-06', -8.886, -37.651),
  ('BRA-07', -12.473, -41.699),
  ('BRA-08', -15.298, -54.305),
  ('BRA-09', -18.448, -44.675),
  ('BRA-10', -22.262, -48.720),
  ('BRA-11', -20.860, -41.650),
  ('BRA-12', -27.572, -52.264),
  ('CAN-01', 51.341, -61.524),
  ('CAN-02', 53.390, -71.785),
  ('CAN-03', 50.063, -85.827),
  ('CAN-04', 54.840, -106.014),
  ('CAN-05', 54.766, -124.744),
  ('CAN-06', 68.839, -102.912),
  ('CHL-01', -22.297, -69.231),
  ('CHL-02', -28.450, -70.247),
  ('CHL-03', -34.356, -71.184),
  ('CHL-04', -39.656, -72.534),
  ('CHL-05', -49.875, -72.419),
  ('DEU-01', 53.289, 10.193),
  ('DEU-02', 51.475, 7.554),
  ('DEU-03', 49.473, 8.569),
  ('DEU-04', 51.771, 12.537),
  ('DEU-05', 48.943, 11.410),
  ('ESP-01', 42.938, -6.999),
  ('ESP-02', 41.903, -1.156),
  ('ESP-03', 40.493, -3.716),
  ('ESP-04', 40.479, -4.359),
  ('ESP-05', 40.704, 0.852),
  ('ESP-06', 37.526, -4.215),
  ('ESP-07', 28.330, -15.659),
  ('FRA-01', 49.423, 1.647),
  ('FRA-02', 47.679, -0.381),
  ('FRA-03', 48.033, 5.247),
  ('FRA-04', 44.511, 1.094),
  ('FRA-05', 44.830, 5.297),
  ('FRA-06', 3.420, -49.695),
  ('GBR-01', 52.596, -1.462),
  ('GBR-02', 56.826, -4.153),
  ('GBR-03', 52.336, -3.759),
  ('GBR-04', 54.608, -6.693),
  ('ITA-01', 45.259, 8.723),
  ('ITA-02', 45.489, 11.578),
  ('ITA-03', 42.939, 12.129),
  ('ITA-04', 40.747, 15.614),
  ('ITA-05', 38.816, 11.636),
  ('MEX-01', 28.471, -111.388),
  ('MEX-02', 27.571, -105.962),
  ('MEX-03', 25.517, -100.636),
  ('MEX-04', 21.225, -103.066),
  ('MEX-05', 19.924, -99.323),
  ('MEX-06', 17.013, -96.153),
  ('MEX-07', 19.386, -91.736),
  ('PRT-01', 39.679, -7.976),
  ('PRT-02', 38.319, -27.220),
  ('PRT-03', 32.761, -16.942),
  ('PRY-01', -22.007, -59.788),
  ('PRY-02', -24.068, -56.066),
  ('PRY-03', -26.418, -56.716),
  ('USA-01', 44.253, -70.660),
  ('USA-02', 41.906, -76.535),
  ('USA-03', 42.728, -86.896),
  ('USA-04', 42.900, -97.181),
  ('USA-05', 34.155, -80.931),
  ('USA-06', 34.592, -87.091),
  ('USA-07', 32.564, -97.412),
  ('USA-08', 40.448, -110.296),
  ('USA-09', 58.580, -144.457)
) as v (code, latitude, longitude)
where r.code = v.code;

-- Great-circle distance between two regions' centroids, in kilometres (mean Earth radius 6371 km).
create function game.region_distance_km(p_from text, p_to text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select round((2 * 6371 * asin(sqrt(
           power(sin(radians(b.latitude - a.latitude) / 2), 2)
           + cos(radians(a.latitude)) * cos(radians(b.latitude)) * power(sin(radians(b.longitude - a.longitude) / 2), 2)
         )))::numeric, 1)
  from game.regions as a, game.regions as b
  where a.code = p_from and b.code = p_to;
$$;
comment on function game.region_distance_km(text, text) is 'Kilometres between the centroids of two regions.';

-- National currency units per GOLD: the volume-weighted price of the currency's GOLD market over the last hours,
-- or the fallback while it had no trades.
create function game.gold_rate(p_currency text)
returns table (rate numeric, from_market boolean)
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(t.currency_amount)::numeric / nullif(sum(t.gold_amount), 0), game.param('travel_fallback_rate')),
         sum(t.gold_amount) is not null
  from game.fx_trades as t
  join game.fx_offers as o on o.id = t.offer_id
  where o.currency_code = p_currency
    and t.created_at >= game.now() - make_interval(hours => game.param('travel_rate_hours')::integer);
$$;
comment on function game.gold_rate(text) is 'Average national currency per GOLD of the recent market, or the fallback.';

-- What a trip costs: hundredths of the currency, rounded up to the next hundredth.
create function game.travel_price(p_currency text, p_km numeric)
returns bigint
language sql
stable
set search_path = ''
as $$
  select ceil(p_km * game.param('travel_gold_per_km') * r.rate * 100)::bigint
  from game.gold_rate(p_currency) as r;
$$;
comment on function game.travel_price(text, numeric) is 'Price of a trip of some kilometres in a currency''s hundredths.';

-- Trips -------------------------------------------------------------------------------------------------------------

create table game.travel_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  from_region_code text references game.regions (code),
  to_region_code text not null references game.regions (code),
  km numeric not null check (km >= 0),
  currency_code text not null references game.currencies (code),
  price bigint not null check (price >= 0),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null
);
alter table game.travel_events enable row level security;
comment on table game.travel_events is 'Every trip between regions, with its distance and what it cost.';
create index travel_events_user_idx on game.travel_events (user_id, created_at);
create index travel_events_from_idx on game.travel_events (from_region_code);
create index travel_events_to_idx on game.travel_events (to_region_code);
create index travel_events_currency_idx on game.travel_events (currency_code);

create or replace function public.travel(p_region_code text, p_key uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'travel:' || v_citizen.user_id::text || ':' || coalesce(p_key::text, gen_random_uuid()::text);
  v_km numeric;
  v_price bigint;
begin
  if exists (select 1 from game.travel_events where idempotency_key = v_key) then
    return (select to_region_code from game.travel_events where idempotency_key = v_key);
  end if;
  if game.param('travel_enabled') = 0 then
    raise exception 'travel_disabled' using errcode = '22023';
  end if;
  if not exists (select 1 from game.regions where code = p_region_code and is_enabled)
     or p_region_code = v_citizen.region_code then
    raise exception 'region_invalid' using errcode = '22023';
  end if;
  if (select health from game.player_stats where user_id = v_citizen.user_id for update) <= 0 then
    raise exception 'health_zero' using errcode = '22023';
  end if;
  v_km := coalesce(game.region_distance_km(v_citizen.region_code, p_region_code), 0);
  v_price := game.travel_price(v_citizen.country_code, v_km);
  if v_price > 0 then
    perform game.post(
      'travel', v_key, v_citizen.user_id,
      array[row(game.citizen_account(v_citizen.user_id, v_citizen.country_code),
                game.system_account('sink', v_citizen.country_code), v_price, 'travel', p_region_code)::game.ledger_leg]
    );
  end if;
  insert into game.travel_events (user_id, from_region_code, to_region_code, km, currency_code, price, idempotency_key,
                                  created_at)
  values (v_citizen.user_id, v_citizen.region_code, p_region_code, v_km, v_citizen.country_code, v_price, v_key,
          game.now());
  update game.citizens set region_code = p_region_code where user_id = v_citizen.user_id;
  return p_region_code;
end;
$$;
comment on function public.travel(text, uuid) is
  'Moves the player to another region at once, paying the distance in their national currency (burned).';

-- The web reads the new columns in the same release (ADR 0042).
-- squawk-ignore ban-drop-function
drop function public.get_travel_terms();
create function public.get_travel_terms()
returns table (enabled boolean, gold_per_km numeric, currency_code text, rate numeric, rate_from_market boolean,
               region_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select game.param('travel_enabled') <> 0, game.param('travel_gold_per_km'), c.country_code, r.rate, r.from_market,
         c.region_code
  from game.citizens as c
  cross join lateral game.gold_rate(c.country_code) as r
  where c.user_id = auth.uid();
$$;
comment on function public.get_travel_terms() is
  'Whether travel is open, its GOLD per kilometre, the player''s currency and its GOLD rate, and where they are.';
grant execute on function public.get_travel_terms() to authenticated;

create function public.list_travel_destinations()
returns table (region_code text, country_code text, km numeric, price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.owner_country_code, d.km, game.travel_price(c.country_code, d.km)
  from game.citizens as c
  join game.regions as r on r.is_enabled and r.code <> c.region_code
  cross join lateral (select game.region_distance_km(c.region_code, r.code) as km) as d
  where c.user_id = auth.uid()
  order by d.km, r.code;
$$;
comment on function public.list_travel_destinations() is
  'Every region the player can travel to, nearest first, with the distance and the price in their currency.';
grant execute on function public.list_travel_destinations() to authenticated;

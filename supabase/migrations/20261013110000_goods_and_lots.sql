-- R3 · Goods catalog, inventory lots with origin, holders and the movement log (spec sections 1 and 5,
-- ADR 0017).
--
-- game.goods                catalog of spec section 5: food, military and medical raw; food, weapons and kits
--                           Q1–Q5. D10 goods are mapped (replaced_by) and retired
-- game.holders              who holds an inventory: citizen, company, ministry or hospital
-- game.inventory_lots       quantity per holder, good and origin country; the origin never changes
-- game.inventory_movements  append-only log of every unit that arrives, moves or leaves
-- game.put_goods, game.take_goods (oldest lots first), game.holder_quantity
--
-- Errors (ADR 0005): amount_invalid, good_invalid, quantity_unavailable, origin_immutable, no_quality.
--
-- Rollback: recreate game.inventories and game.company_stock from 20261009220000 and 20261009210000 with
-- the lots summed per holder and good (mapped back through replaced_by), restore game.add_inventory,
-- game.add_stock, game.add_goods and every function replaced here from their earlier migrations, then drop
-- the movement log, lots, holders, the new goods and the goods columns added here, and restore ration_energy.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

delete from game.balance_params where key = 'ration_energy';

-- Catalog -----------------------------------------------------------------------------------------

alter table game.goods add column category text check (category in ('food', 'military', 'medical'));
alter table game.goods add column active boolean not null default true;
alter table game.goods add column energy integer check (energy > 0);
alter table game.goods add column heal integer check (heal > 0);
-- squawk-ignore adding-foreign-key-constraint
alter table game.goods add column replaced_by text references game.goods (code);
comment on column game.goods.category is 'Food, military or medical: the raw material and the products made from it.';
comment on column game.goods.active is 'Retired goods are kept for history but never produced, granted or traded again.';
comment on column game.goods.energy is 'Energy one unit of food gives.';
comment on column game.goods.heal is 'Health one medical kit restores.';
comment on column game.goods.replaced_by is 'For a retired good, the good its units became.';

-- points_per_unit stays the D10 work model until R5 brings the production formulas.
insert into game.goods (code, kind, input_good_code, input_per_unit, points_per_unit, quality, category) values
  ('food_raw', 'raw', null, null, 1, null, 'food'),
  ('military_raw', 'raw', null, null, 1, null, 'military'),
  ('medical_raw', 'raw', null, null, 1, null, 'medical');

insert into game.goods (code, kind, input_good_code, input_per_unit, points_per_unit, quality, category, energy, heal)
select line.prefix || q::text, 'product', line.input, line.input_factor * q, 2, q, line.category,
       case when line.category = 'food' then 10 * q end,
       case when line.category = 'medical' then 5 * q end
from (values ('food_q', 'food_raw', 1, 'food'), ('kit_q', 'medical_raw', 5, 'medical'))
       as line (prefix, input, input_factor, category)
cross join generate_series(1, 5) as q;

update game.goods
set input_good_code = 'military_raw', input_per_unit = 10 * quality, category = 'military'
where code like 'weapon_q%';

update game.goods as g
set active = false, category = m.category, replaced_by = m.replaced_by
from (values ('wheat', 'food', 'food_raw'), ('iron', 'military', 'military_raw'), ('oil', 'military', 'military_raw'),
             ('ration', 'food', 'food_q1'), ('fuel', 'military', null))
       as m (code, category, replaced_by)
where g.code = m.code;

-- Everything that named an old good now names its successor; fuel has none in the specification.
update game.companies as c set good_code = g.replaced_by
from game.goods as g where g.code = c.good_code and g.replaced_by is not null;
update game.market_offers as o set good_code = g.replaced_by
from game.goods as g where g.code = o.good_code and g.replaced_by is not null;

-- Holders -----------------------------------------------------------------------------------------

create table game.holders (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('citizen', 'company', 'ministry', 'hospital')),
  user_id uuid references game.citizens (user_id) on delete restrict,
  company_id bigint references game.companies (id) on delete restrict,
  country_code text references game.countries (code),
  ministry text check (ministry in ('economy', 'defense', 'foreign_affairs', 'health', 'development')),
  region_code text references game.regions (code),
  created_at timestamptz not null,
  constraint holders_owner_matches_kind check (
    case kind
      when 'citizen' then user_id is not null and company_id is null and country_code is null and ministry is null and region_code is null
      when 'company' then company_id is not null and user_id is null and country_code is null and ministry is null and region_code is null
      when 'ministry' then country_code is not null and ministry is not null and user_id is null and company_id is null and region_code is null
      else region_code is not null and user_id is null and company_id is null and country_code is null and ministry is null
    end
  )
);
alter table game.holders enable row level security;
comment on table game.holders is 'Owner of an inventory: a citizen, a company, a ministry or a public hospital.';

create unique index holders_citizen_key on game.holders (user_id) where kind = 'citizen';
create unique index holders_company_key on game.holders (company_id) where kind = 'company';
create unique index holders_ministry_key on game.holders (country_code, ministry) where kind = 'ministry';
create unique index holders_hospital_key on game.holders (region_code) where kind = 'hospital';

create function game.holder_for_citizen(p_user_id uuid)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.holders (kind, user_id, created_at) values ('citizen', p_user_id, game.now())
  on conflict (user_id) where kind = 'citizen' do nothing;
  select id into v_id from game.holders where kind = 'citizen' and user_id = p_user_id;
  return v_id;
end;
$$;
comment on function game.holder_for_citizen(uuid) is 'The citizen''s inventory holder, created on first use.';

create function game.holder_for_company(p_company_id bigint)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.holders (kind, company_id, created_at) values ('company', p_company_id, game.now())
  on conflict (company_id) where kind = 'company' do nothing;
  select id into v_id from game.holders where kind = 'company' and company_id = p_company_id;
  return v_id;
end;
$$;
comment on function game.holder_for_company(bigint) is 'The company''s depot holder, created on first use.';

-- Lots and movements ------------------------------------------------------------------------------

create table game.inventory_lots (
  id bigint generated always as identity primary key,
  holder_id bigint not null references game.holders (id),
  good_code text not null references game.goods (code),
  origin_country_code text not null references game.countries (code),
  quantity numeric not null check (quantity >= 0),
  created_at timestamptz not null,
  constraint inventory_lots_key unique (holder_id, good_code, origin_country_code)
);
alter table game.inventory_lots enable row level security;
comment on table game.inventory_lots is 'Units a holder has of a good from one origin country. Taken oldest first.';
comment on column game.inventory_lots.origin_country_code is 'Country where the units were produced or granted. Immutable.';

create function game.reject_lot_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.holder_id <> old.holder_id or new.good_code <> old.good_code
     or new.origin_country_code <> old.origin_country_code then
    raise exception 'origin_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger inventory_lots_identity
before update on game.inventory_lots
for each row execute function game.reject_lot_identity_change();

create table game.inventory_movements (
  id bigint generated always as identity primary key,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  good_code text not null references game.goods (code),
  origin_country_code text not null references game.countries (code),
  quantity numeric not null check (quantity > 0),
  from_holder_id bigint references game.holders (id),
  to_holder_id bigint references game.holders (id),
  reference text check (char_length(reference) <= 200),
  created_at timestamptz not null,
  constraint inventory_movements_somewhere check (from_holder_id is not null or to_holder_id is not null)
);
alter table game.inventory_movements enable row level security;
comment on table game.inventory_movements is 'Append-only. Every unit that arrives (no from), moves, or leaves (no to).';

create index inventory_movements_from_idx on game.inventory_movements (from_holder_id, id);
create index inventory_movements_to_idx on game.inventory_movements (to_holder_id, id);
create index inventory_movements_reference_idx on game.inventory_movements (reference);

create function game.reject_inventory_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'the inventory log is append-only' using errcode = '42501';
end;
$$;

create trigger inventory_movements_append_only
before update or delete on game.inventory_movements
for each statement execute function game.reject_inventory_log_change();

create trigger inventory_movements_no_truncate
before truncate on game.inventory_movements
for each statement execute function game.reject_inventory_log_change();

-- Existing inventories and depots become lots of the holder's country.
insert into game.holders (kind, user_id, created_at)
select 'citizen', i.user_id, now() from game.inventories as i group by i.user_id;
insert into game.holders (kind, company_id, created_at)
select 'company', s.company_id, now() from game.company_stock as s group by s.company_id;

insert into game.inventory_lots (holder_id, good_code, origin_country_code, quantity, created_at)
select h.id, coalesce(g.replaced_by, g.code), c.country_code, sum(i.quantity), now()
from game.inventories as i
join game.goods as g on g.code = i.good_code
join game.citizens as c on c.user_id = i.user_id
join game.holders as h on h.kind = 'citizen' and h.user_id = i.user_id
group by h.id, coalesce(g.replaced_by, g.code), c.country_code
having sum(i.quantity) > 0;

insert into game.inventory_lots (holder_id, good_code, origin_country_code, quantity, created_at)
select h.id, coalesce(g.replaced_by, g.code), co.country_code, sum(s.quantity), now()
from game.company_stock as s
join game.goods as g on g.code = s.good_code
join game.companies as co on co.id = s.company_id
join game.holders as h on h.kind = 'company' and h.company_id = s.company_id
group by h.id, coalesce(g.replaced_by, g.code), co.country_code
having sum(s.quantity) > 0;

insert into game.inventory_movements (kind, good_code, origin_country_code, quantity, to_holder_id, reference, created_at)
select 'migration', l.good_code, l.origin_country_code, l.quantity, l.holder_id, 'r3', now()
from game.inventory_lots as l
order by l.id;

-- Core functions ----------------------------------------------------------------------------------

-- Adds units of one origin to a holder. Retired goods only come back from an offer.
create function game.put_goods(
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
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.goods
                 where code = p_good_code and (active or p_kind = 'market_withdrawal')) then
    raise exception 'good_invalid' using errcode = '22023';
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
comment on function game.put_goods(bigint, text, text, numeric, text, text, bigint) is
  'Adds units of one origin to a holder''s lot and logs it.';

-- Takes units oldest lot first (optionally of one origin only). With a destination the units move there
-- keeping their origin; without one they leave (consumed, offered, used as input). Returns what was taken.
create function game.take_goods(
  p_holder_id bigint,
  p_good_code text,
  p_quantity numeric,
  p_kind text,
  p_reference text,
  p_origin_country_code text default null,
  p_to_holder_id bigint default null
)
returns table (taken_origin text, taken_quantity numeric)
language plpgsql
set search_path = ''
as $$
declare
  v_lot game.inventory_lots;
  v_left numeric := p_quantity;
  v_take numeric;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  perform 1 from game.inventory_lots as l
  where l.holder_id = p_holder_id and l.good_code = p_good_code
    and (p_origin_country_code is null or l.origin_country_code = p_origin_country_code)
  order by l.id
  for update;
  if game.holder_quantity(p_holder_id, p_good_code, p_origin_country_code) < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;

  for v_lot in
    select * from game.inventory_lots as l
    where l.holder_id = p_holder_id and l.good_code = p_good_code and l.quantity > 0
      and (p_origin_country_code is null or l.origin_country_code = p_origin_country_code)
    order by l.id
  loop
    v_take := least(v_lot.quantity, v_left);
    update game.inventory_lots set quantity = quantity - v_take where id = v_lot.id;
    if p_to_holder_id is not null then
      insert into game.inventory_lots (holder_id, good_code, origin_country_code, quantity, created_at)
      values (p_to_holder_id, p_good_code, v_lot.origin_country_code, v_take, game.now())
      on conflict (holder_id, good_code, origin_country_code)
      do update set quantity = game.inventory_lots.quantity + excluded.quantity;
    end if;
    insert into game.inventory_movements (kind, good_code, origin_country_code, quantity, from_holder_id, to_holder_id,
                                          reference, created_at)
    values (p_kind, p_good_code, v_lot.origin_country_code, v_take, p_holder_id, p_to_holder_id, p_reference, game.now());
    taken_origin := v_lot.origin_country_code;
    taken_quantity := v_take;
    return next;
    v_left := v_left - v_take;
    exit when v_left = 0;
  end loop;
end;
$$;
comment on function game.take_goods(bigint, text, numeric, text, text, text, bigint) is
  'Takes units oldest lot first, moving them with their origin or out of the game. Fails with quantity_unavailable.';

create function game.holder_quantity(p_holder_id bigint, p_good_code text, p_origin_country_code text default null)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(quantity), 0) from game.inventory_lots
  where holder_id = p_holder_id and good_code = p_good_code
    and (p_origin_country_code is null or origin_country_code = p_origin_country_code);
$$;
comment on function game.holder_quantity(bigint, text, text) is 'Units of a good a holder has, of every origin or one.';

-- Production --------------------------------------------------------------------------------------

create or replace function game.produce(p_company_id bigint)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_company game.companies;
  v_good game.goods;
  v_holder bigint;
  v_units numeric;
  v_reference text := 'company:' || p_company_id::text;
begin
  select * into v_company from game.companies where id = p_company_id for update;
  select * into v_good from game.goods where code = v_company.good_code;
  if not v_good.active then
    return 0;
  end if;
  v_holder := game.holder_for_company(p_company_id);

  if v_good.kind = 'raw' then
    v_units := round(v_company.points / v_good.points_per_unit * game.raw_yield(v_company.region_code, v_good.code), 2);
    update game.companies set points = 0 where id = p_company_id;
  else
    v_units := least(floor(v_company.points / v_good.points_per_unit),
                     floor(game.holder_quantity(v_holder, v_good.input_good_code) / v_good.input_per_unit));
    if v_units > 0 then
      perform game.take_goods(v_holder, v_good.input_good_code, v_units * v_good.input_per_unit,
                              'production_input', v_reference);
      update game.companies set points = points - v_units * v_good.points_per_unit where id = p_company_id;
    end if;
  end if;

  if v_units > 0 then
    perform game.put_goods(v_holder, v_good.code, v_company.country_code, v_units, 'production', v_reference);
  end if;
  return v_units;
end;
$$;
comment on function game.produce(bigint) is
  'Turns a company''s points into goods of its country, using inputs from its depot; keeps points waiting for inputs.';

create or replace function public.found_company(p_name text, p_good_code text, p_region_code text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'company:' || auth.uid()::text || ':' || p_key::text;
  v_name text := btrim(p_name);
  v_id bigint;
begin
  select id into v_id from game.companies where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if char_length(v_name) not between 3 and 40 then
    raise exception 'company_name_invalid' using errcode = '22023';
  end if;
  -- Active goods only; a quality line starts at Q1.
  if not exists (select 1 from game.goods where code = p_good_code and active and coalesce(quality, 1) = 1) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.regions
                 where code = p_region_code and owner_country_code = v_citizen.country_code and is_enabled) then
    raise exception 'region_unavailable' using errcode = '22023';
  end if;

  perform game.post(
    'company_founded', v_key, auth.uid(),
    array[row(game.citizen_account(auth.uid(), 'GOLD'), game.system_account('sink', 'GOLD'),
              (game.param('company_found_gold') * 100)::bigint, 'company_founded', v_name)::game.ledger_leg]
  );
  begin
    insert into game.companies (name, owner_user_id, country_code, region_code, good_code, creation_key, created_at)
    values (v_name, auth.uid(), v_citizen.country_code, p_region_code, p_good_code, v_key, game.now())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'company_name_taken' using errcode = '23505';
  end;
  perform game.company_account(v_id, v_citizen.country_code);
  return v_id;
end;
$$;

create or replace function public.upgrade_company_quality(p_company_id bigint, p_key uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
  v_quality integer := (select quality from game.goods where code = v_company.good_code);
begin
  if v_quality is null then
    raise exception 'no_quality' using errcode = '22023';
  end if;
  if v_quality >= 5 then
    raise exception 'max_quality' using errcode = '22023';
  end if;
  perform game.post(
    'company_quality', 'quality:' || auth.uid()::text || ':' || p_key::text, auth.uid(),
    array[row(game.citizen_account(auth.uid(), 'GOLD'), game.system_account('sink', 'GOLD'),
              (game.param('company_quality_gold_per_q') * v_quality * 100)::bigint,
              'company_quality', v_company.name)::game.ledger_leg]
  );
  update game.companies set good_code = regexp_replace(good_code, '_q[1-5]$', '_q' || (v_quality + 1)::text)
  where id = p_company_id;
  return v_quality + 1;
end;
$$;
comment on function public.upgrade_company_quality(bigint, uuid) is
  'Raises a food, weapon or kit company from Q to Q+1 for 20 × Q Gold.';

create or replace function public.get_company_stock(p_company_id bigint)
returns table (good_code text, quantity numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select l.good_code, sum(l.quantity)
  from game.inventory_lots as l
  join game.holders as h on h.id = l.holder_id and h.kind = 'company'
  join game.companies as c on c.id = h.company_id
  where h.company_id = p_company_id and c.owner_user_id = auth.uid()
  group by l.good_code
  having sum(l.quantity) > 0
  order by l.good_code;
$$;

-- The return type gains category, energy and heal, which needs a new function. Only this web calls it.
-- squawk-ignore ban-drop-function
drop function public.list_goods();

create function public.list_goods()
returns table (
  code text, kind text, category text, input_good_code text, input_per_unit numeric, points_per_unit numeric,
  quality integer, energy integer, heal integer, raw_yield numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code, g.kind, g.category, g.input_good_code, g.input_per_unit, g.points_per_unit, g.quality, g.energy,
         g.heal, case when g.kind = 'raw' then game.param('raw_yield_base') end
  from game.goods as g
  where g.active
  order by g.kind desc, g.category, g.quality nulls first, g.code;
$$;
comment on function public.list_goods() is 'Active goods with their recipes and effects, for the economy screens. Public.';
grant execute on function public.list_goods() to anon, authenticated;

-- squawk-ignore ban-drop-function
drop function public.list_goods_effects();

create function public.list_goods_effects()
returns table (code text, damage_multiplier numeric, energy integer, heal integer, food_energy_daily_max integer)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code, g.damage_multiplier, g.energy, g.heal, game.param('food_energy_daily_max')::integer
  from game.goods as g
  order by g.code;
$$;
comment on function public.list_goods_effects() is 'What each good does, for the inventory screen. Public.';
grant execute on function public.list_goods_effects() to anon, authenticated;

-- Market ------------------------------------------------------------------------------------------

-- A new optional parameter (the origin to sell) changes the signature.
-- squawk-ignore ban-drop-function
drop function public.post_offer(text, integer, bigint, text, uuid, bigint);

create function public.post_offer(
  p_good_code text,
  p_quantity integer,
  p_price bigint,
  p_market_country_code text,
  p_key uuid,
  p_company_id bigint default null,
  p_origin_country_code text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'offer:' || auth.uid()::text || ':' || p_key::text;
  v_holder bigint;
  v_origin text := p_origin_country_code;
  v_id bigint;
begin
  select id into v_id from game.market_offers where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if not exists (select 1 from game.goods where code = p_good_code and active) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.countries where code = p_market_country_code and is_active) then
    raise exception 'market_invalid' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_price is null or p_price <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_company_id is null then
    v_holder := game.holder_for_citizen(v_citizen.user_id);
  else
    perform game.own_company(p_company_id);
    v_holder := game.holder_for_company(p_company_id);
  end if;
  if (select count(*) from game.market_offers where seller_user_id = v_citizen.user_id and closed_at is null)
     >= game.param('market_max_open_offers') then
    raise exception 'too_many_offers' using errcode = '22023';
  end if;
  -- One origin per offer: the oldest lot that covers the quantity, unless the seller picks one.
  if v_origin is null then
    select l.origin_country_code into v_origin from game.inventory_lots as l
    where l.holder_id = v_holder and l.good_code = p_good_code and l.quantity >= p_quantity
    order by l.id
    limit 1;
    if v_origin is null then
      raise exception 'quantity_unavailable' using errcode = '22023';
    end if;
  end if;

  insert into game.market_offers (
    market_country_code, seller_user_id, seller_company_id, origin_country_code, good_code, quantity, price,
    creation_key, created_at
  ) values (
    p_market_country_code, v_citizen.user_id, p_company_id, v_origin, p_good_code, p_quantity, p_price,
    v_key, game.now()
  )
  returning id into v_id;
  perform game.take_goods(v_holder, p_good_code, p_quantity, 'market_offer', 'offer:' || v_id::text, v_origin);
  return v_id;
end;
$$;
comment on function public.post_offer(text, integer, bigint, text, uuid, bigint, text) is
  'Posts whole units of one origin from the player''s inventory or company depot to a country''s market.';
grant execute on function public.post_offer(text, integer, bigint, text, uuid, bigint, text) to authenticated;

create or replace function public.withdraw_offer(p_offer_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer game.market_offers;
begin
  select * into v_offer from game.market_offers where id = p_offer_id for update;
  if not found or v_offer.seller_user_id is distinct from auth.uid() or v_offer.closed_at is not null then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if v_offer.quantity > 0 then
    perform game.put_goods(
      case when v_offer.seller_company_id is null then game.holder_for_citizen(v_offer.seller_user_id)
           else game.holder_for_company(v_offer.seller_company_id) end,
      v_offer.good_code, v_offer.origin_country_code, v_offer.quantity, 'market_withdrawal',
      'offer:' || v_offer.id::text
    );
  end if;
  update game.market_offers set quantity = 0, closed_at = game.now() where id = p_offer_id;
end;
$$;

-- Buys units of an offer. The buyer pays price × quantity, plus the tariff on imports; from the gross the
-- VAT goes to the market's treasury and the fee leaves the game; the seller gets the rest.
create or replace function public.buy(p_offer_id bigint, p_quantity integer, p_key uuid, p_company_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'buy:' || auth.uid()::text || ':' || p_key::text;
  v_offer game.market_offers;
  v_policy game.country_policies;
  v_currency text;
  v_gross bigint;
  v_vat bigint;
  v_tariff bigint := 0;
  v_fee bigint;
  v_buyer bigint;
  v_seller bigint;
  v_treasury bigint;
  v_paid bigint;
begin
  select gross + tariff into v_paid from game.market_trades where idempotency_key = v_key;
  if found then
    return v_paid;
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  select * into v_offer from game.market_offers where id = p_offer_id for update;
  if not found or v_offer.closed_at is not null then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if v_offer.seller_user_id = v_citizen.user_id then
    raise exception 'own_offer' using errcode = '22023';
  end if;
  if v_offer.quantity < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;
  if p_company_id is not null then
    perform game.own_company(p_company_id);
  end if;

  select * into v_policy from game.country_policies where country_code = v_offer.market_country_code;
  v_currency := v_offer.market_country_code;
  v_gross := v_offer.price * p_quantity;
  v_vat := round(v_gross - v_gross / (1 + v_policy.vat));
  v_fee := round(v_gross * game.param('market_fee'));
  if v_offer.origin_country_code <> v_offer.market_country_code then
    v_tariff := round(v_gross * v_policy.tariff);
  end if;

  v_buyer := game.citizen_account(v_citizen.user_id, v_currency);
  v_seller := case when v_offer.seller_company_id is null
                   then game.citizen_account(v_offer.seller_user_id, v_currency)
                   else game.company_account(v_offer.seller_company_id, v_currency) end;
  v_treasury := game.treasury_account(v_offer.market_country_code, v_currency);

  perform game.post(
    'market_purchase', v_key, v_citizen.user_id,
    array[
      row(v_buyer, v_seller, v_gross - v_vat - v_fee, 'market_sale', null)::game.ledger_leg,
      row(v_buyer, v_treasury, v_vat + v_tariff, 'market_tax', null)::game.ledger_leg,
      row(v_buyer, game.system_account('sink', v_currency), v_fee, 'market_fee', null)::game.ledger_leg
    ]
  );

  update game.market_offers
  set quantity = quantity - p_quantity,
      closed_at = case when quantity - p_quantity = 0 then game.now() end
  where id = p_offer_id;
  perform game.put_goods(
    case when p_company_id is null then game.holder_for_citizen(v_citizen.user_id)
         else game.holder_for_company(p_company_id) end,
    v_offer.good_code, v_offer.origin_country_code, p_quantity, 'market_purchase', 'offer:' || v_offer.id::text
  );
  insert into game.market_trades (offer_id, buyer_user_id, quantity, price, gross, vat, tariff, fee, idempotency_key, created_at)
  values (p_offer_id, v_citizen.user_id, p_quantity, v_offer.price, v_gross, v_vat, v_tariff, v_fee, v_key, game.now());
  return v_gross + v_tariff;
end;
$$;

create or replace function public.market_summary(p_country_code text)
returns table (
  good_code text, best_price bigint, average_24h bigint, offers integer, vat numeric, tariff numeric, fee numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.code,
         (select min(o.price) from game.market_offers as o
          where o.market_country_code = p_country_code and o.good_code = g.code and o.closed_at is null and o.quantity > 0),
         (select round(sum(t.gross)::numeric / nullif(sum(t.quantity), 0))::bigint
          from game.market_trades as t join game.market_offers as o on o.id = t.offer_id
          where o.market_country_code = p_country_code and o.good_code = g.code
            and t.created_at > game.now() - interval '24 hours'),
         (select count(*)::integer from game.market_offers as o
          where o.market_country_code = p_country_code and o.good_code = g.code and o.closed_at is null and o.quantity > 0),
         p.vat, p.tariff, game.param('market_fee')
  from game.goods as g
  cross join game.country_policies as p
  where p.country_code = p_country_code and g.active
  order by g.kind desc, g.category, g.quality nulls first, g.code;
$$;

create or replace function public.get_my_inventory()
returns table (good_code text, quantity numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select l.good_code, sum(l.quantity)
  from game.inventory_lots as l
  join game.holders as h on h.id = l.holder_id and h.kind = 'citizen'
  where h.user_id = auth.uid()
  group by l.good_code
  having sum(l.quantity) > 0
  order by l.good_code;
$$;

-- Consumption and moves ---------------------------------------------------------------------------

create or replace function public.eat_rations(p_quantity integer, p_key uuid)
returns table (energy_gained integer, energy integer, food_energy_today integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := p_key::text;
  v_day date := game.game_day();
  v_holder bigint;
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
  v_holder := game.holder_for_citizen(v_citizen.user_id);
  if game.holder_quantity(v_holder, 'food_q1') < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;

  v_gain := p_quantity * (select g.energy from game.goods as g where g.code = 'food_q1');
  insert into game.food_days as f (user_id, game_day, energy) values (v_citizen.user_id, v_day, 0)
  on conflict (user_id, game_day) do nothing;
  select f.energy into v_today from game.food_days as f
  where f.user_id = v_citizen.user_id and f.game_day = v_day for update;
  if v_today + v_gain > game.param('food_energy_daily_max') then
    raise exception 'food_limit' using errcode = '22023';
  end if;

  perform game.take_goods(v_holder, 'food_q1', p_quantity, 'consumption', 'meal:' || v_key);
  update game.food_days as f set energy = f.energy + v_gain
  where f.user_id = v_citizen.user_id and f.game_day = v_day;
  v_energy := game.add_energy(v_citizen.user_id, v_gain);
  insert into game.meals (user_id, idempotency_key, rations, energy_gained, created_at)
  values (v_citizen.user_id, v_key, p_quantity, v_gain, game.now());

  return query select v_gain, v_energy, v_today + v_gain;
end;
$$;
comment on function public.eat_rations(integer, uuid) is
  'Eats Q1 food for its energy (10 each), up to 200 from food per game day. Automatic food arrives in R4.';

create or replace function public.move_goods(p_company_id bigint, p_good_code text, p_quantity numeric, p_to_inventory boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company game.companies := game.own_company(p_company_id);
  v_depot bigint := game.holder_for_company(p_company_id);
  v_inventory bigint := game.holder_for_citizen(v_company.owner_user_id);
begin
  if not exists (select 1 from game.goods where code = p_good_code) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if p_to_inventory then
    perform game.take_goods(v_depot, p_good_code, p_quantity, 'transfer', 'company:' || p_company_id::text, null, v_inventory);
  else
    perform game.take_goods(v_inventory, p_good_code, p_quantity, 'transfer', 'company:' || p_company_id::text, null, v_depot);
  end if;
end;
$$;
comment on function public.move_goods(bigint, text, numeric, boolean) is
  'Moves goods, with their origins, between an own company''s depot and the owner''s inventory.';

-- Sign-up grant -----------------------------------------------------------------------------------

create or replace function game.grant_welcome(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_country text;
  v_key text := 'welcome:' || p_user_id::text;
begin
  select country_code into v_country from game.citizens where user_id = p_user_id;
  if v_country is null or exists (select 1 from game.ledger_transactions where idempotency_key = v_key) then
    return;
  end if;
  perform game.post(
    'welcome_grant', v_key, p_user_id,
    array[
      row(game.system_account('issuer', 'GOLD'), game.citizen_account(p_user_id, 'GOLD'),
          (game.param('welcome_gold') * 100)::bigint, 'welcome_grant', null)::game.ledger_leg,
      row(game.system_account('issuer', v_country), game.citizen_account(p_user_id, v_country),
          (game.param('welcome_credit') * 100)::bigint, 'welcome_grant', null)::game.ledger_leg
    ]
  );
  perform game.put_goods(game.holder_for_citizen(p_user_id), 'food_q1', v_country, game.param('welcome_food'),
                         'welcome_grant', v_key);
end;
$$;
comment on function game.grant_welcome(uuid) is
  '5 GOLD, 100 of the country''s currency and 10 Q1 food of that country, once per account.';

-- The D10–D12 stock tables and helpers, replaced by lots above.
-- squawk-ignore ban-drop-function
drop function game.add_goods(uuid, bigint, text, numeric);
-- squawk-ignore ban-drop-function
drop function game.add_inventory(uuid, text, numeric);
-- squawk-ignore ban-drop-function
drop function game.add_stock(bigint, text, numeric);
-- Their rows were copied into game.inventory_lots in this same migration.
-- squawk-ignore ban-drop-table
drop table game.inventories;
-- squawk-ignore ban-drop-table
drop table game.company_stock;

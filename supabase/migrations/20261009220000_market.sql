-- D11 · Market (ADR 0013).
--
-- game.inventories     goods each player holds
-- game.market_offers   offers per country market, priced in its Credit with VAT included; their units are
--                      held by the offer until sold or withdrawn
-- game.market_trades   every purchase, with its VAT, tariff and fee
-- public.post_offer, withdraw_offer, buy, list_market, market_summary, list_my_offers, get_my_inventory
--
-- Errors (ADR 0005): good_invalid, market_invalid, amount_invalid, quantity_unavailable, not_your_company,
-- offer_not_found, own_offer, too_many_offers, insufficient_funds, no_citizen, not_authenticated.
--
-- Rollback: drop the public and game functions created here, then game.market_trades,
-- game.market_offers and game.inventories, and delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('market_fee', 0.01, 'Share of each sale that leaves the game (paid by the seller).'),
  ('market_max_open_offers', 20, 'Open offers a player may have at once.');

create table game.inventories (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  good_code text not null references game.goods (code),
  quantity numeric not null default 0 check (quantity >= 0),
  primary key (user_id, good_code)
);
alter table game.inventories enable row level security;
comment on table game.inventories is 'Goods a player holds.';

create table game.market_offers (
  id bigint generated always as identity primary key,
  market_country_code text not null references game.countries (code),
  seller_user_id uuid not null references game.citizens (user_id) on delete cascade,
  seller_company_id bigint references game.companies (id),
  origin_country_code text not null references game.countries (code),
  good_code text not null references game.goods (code),
  quantity integer not null check (quantity >= 0),
  price bigint not null check (price > 0),
  creation_key text unique,
  created_at timestamptz not null,
  closed_at timestamptz
);
alter table game.market_offers enable row level security;
comment on table game.market_offers is 'Units held for sale. Price per unit in hundredths of the market''s Credit, VAT included.';
create index market_offers_open_idx on game.market_offers (market_country_code, good_code, price) where closed_at is null;
create index market_offers_seller_idx on game.market_offers (seller_user_id) where closed_at is null;

create table game.market_trades (
  id bigint generated always as identity primary key,
  offer_id bigint not null references game.market_offers (id),
  buyer_user_id uuid not null references game.citizens (user_id) on delete cascade,
  quantity integer not null check (quantity > 0),
  price bigint not null,
  gross bigint not null,
  vat bigint not null,
  tariff bigint not null,
  fee bigint not null,
  idempotency_key text unique,
  created_at timestamptz not null
);
alter table game.market_trades enable row level security;
create index market_trades_offer_idx on game.market_trades (offer_id);
create index market_trades_recent_idx on game.market_trades (created_at);

create function game.add_inventory(p_user_id uuid, p_good_code text, p_quantity numeric)
returns void
language sql
set search_path = ''
as $$
  insert into game.inventories (user_id, good_code, quantity)
  values (p_user_id, p_good_code, p_quantity)
  on conflict (user_id, good_code) do update set quantity = game.inventories.quantity + excluded.quantity;
$$;
comment on function game.add_inventory(uuid, text, numeric) is 'Adds (or, negative, removes) goods; the check refuses going below zero.';

create function game.add_goods(p_user_id uuid, p_company_id bigint, p_good_code text, p_quantity numeric)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_quantity >= 0 then
    if p_company_id is null then
      perform game.add_inventory(p_user_id, p_good_code, p_quantity);
    else
      perform game.add_stock(p_company_id, p_good_code, p_quantity);
    end if;
    return;
  end if;

  -- Taking out is an update: an upsert would check the negative row before finding the existing one.
  if p_company_id is null then
    update game.inventories set quantity = quantity + p_quantity
    where user_id = p_user_id and good_code = p_good_code;
  else
    update game.company_stock set quantity = quantity + p_quantity
    where company_id = p_company_id and good_code = p_good_code;
  end if;
  if not found then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;
exception when check_violation then
  raise exception 'quantity_unavailable' using errcode = '22023';
end;
$$;
comment on function game.add_goods(uuid, bigint, text, numeric) is 'Moves goods in or out of a player''s inventory or a company''s depot.';

-- API --------------------------------------------------------------------------------------------------

create function public.post_offer(
  p_good_code text,
  p_quantity integer,
  p_price bigint,
  p_market_country_code text,
  p_key uuid,
  p_company_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'offer:' || auth.uid()::text || ':' || p_key::text;
  v_origin text := v_citizen.country_code;
  v_id bigint;
begin
  select id into v_id from game.market_offers where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if not exists (select 1 from game.goods where code = p_good_code) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.countries where code = p_market_country_code and is_active) then
    raise exception 'market_invalid' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_price is null or p_price <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_company_id is not null then
    v_origin := (game.own_company(p_company_id)).country_code;
  end if;
  if (select count(*) from game.market_offers where seller_user_id = v_citizen.user_id and closed_at is null)
     >= game.param('market_max_open_offers') then
    raise exception 'too_many_offers' using errcode = '22023';
  end if;

  perform game.add_goods(v_citizen.user_id, p_company_id, p_good_code, -p_quantity);
  insert into game.market_offers (
    market_country_code, seller_user_id, seller_company_id, origin_country_code, good_code, quantity, price,
    creation_key, created_at
  ) values (
    p_market_country_code, v_citizen.user_id, p_company_id, v_origin, p_good_code, p_quantity, p_price,
    v_key, game.now()
  )
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.post_offer(text, integer, bigint, text, uuid, bigint) is
  'Posts whole units from the player''s inventory or company depot to a country''s market.';
grant execute on function public.post_offer(text, integer, bigint, text, uuid, bigint) to authenticated;

create function public.withdraw_offer(p_offer_id bigint)
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
    perform game.add_goods(v_offer.seller_user_id, v_offer.seller_company_id, v_offer.good_code, v_offer.quantity);
  end if;
  update game.market_offers set quantity = 0, closed_at = game.now() where id = p_offer_id;
end;
$$;
comment on function public.withdraw_offer(bigint) is 'Closes the player''s offer and returns the unsold units.';
grant execute on function public.withdraw_offer(bigint) to authenticated;

-- Buys units of an offer. The buyer pays price × quantity, plus the tariff on imports; from the gross the
-- VAT goes to the market's treasury and the fee leaves the game; the seller gets the rest.
create function public.buy(p_offer_id bigint, p_quantity integer, p_key uuid, p_company_id bigint default null)
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
  perform game.add_goods(v_citizen.user_id, p_company_id, v_offer.good_code, p_quantity);
  insert into game.market_trades (offer_id, buyer_user_id, quantity, price, gross, vat, tariff, fee, idempotency_key, created_at)
  values (p_offer_id, v_citizen.user_id, p_quantity, v_offer.price, v_gross, v_vat, v_tariff, v_fee, v_key, game.now());
  return v_gross + v_tariff;
end;
$$;
comment on function public.buy(bigint, integer, uuid, bigint) is
  'Buys units of an offer into the inventory or an own company''s depot. Returns what the buyer paid.';
grant execute on function public.buy(bigint, integer, uuid, bigint) to authenticated;

create function public.list_market(p_country_code text, p_good_code text)
returns table (
  offer_id bigint, seller_name text, origin_country_code text, quantity integer, price bigint, imported boolean,
  tariff numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, coalesce(co.name, c.name), o.origin_country_code, o.quantity, o.price,
         o.origin_country_code <> o.market_country_code, p.tariff
  from game.market_offers as o
  join game.citizens as c on c.user_id = o.seller_user_id
  left join game.companies as co on co.id = o.seller_company_id
  join game.country_policies as p on p.country_code = o.market_country_code
  where o.market_country_code = p_country_code and o.good_code = p_good_code
    and o.closed_at is null and o.quantity > 0
  order by o.price, o.id
  limit 100;
$$;
comment on function public.list_market(text, text) is 'Open offers of a good in a country''s market, cheapest first.';
grant execute on function public.list_market(text, text) to anon, authenticated;

create function public.market_summary(p_country_code text)
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
  where p.country_code = p_country_code
  order by g.kind desc, g.code;
$$;
comment on function public.market_summary(text) is 'Per good: the best open price, the 24-hour average and the offers.';
grant execute on function public.market_summary(text) to anon, authenticated;

create function public.list_my_offers()
returns table (
  offer_id bigint, market_country_code text, good_code text, company_name text, quantity integer, price bigint,
  sold integer, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.market_country_code, o.good_code, co.name, o.quantity, o.price,
         coalesce((select sum(t.quantity)::integer from game.market_trades as t where t.offer_id = o.id), 0),
         o.created_at
  from game.market_offers as o
  left join game.companies as co on co.id = o.seller_company_id
  where o.seller_user_id = auth.uid() and o.closed_at is null
  order by o.created_at desc;
$$;
grant execute on function public.list_my_offers() to authenticated;

create function public.get_my_inventory()
returns table (good_code text, quantity numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select i.good_code, i.quantity from game.inventories as i
  where i.user_id = auth.uid() and i.quantity > 0
  order by i.good_code;
$$;
grant execute on function public.get_my_inventory() to authenticated;

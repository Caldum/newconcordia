-- R6 · Market orders: sell and buy orders, locked goods and money, partial fills, price-time matching,
-- cancellation, the export tax and foreign market licenses (spec sections 5, 8 and 12.5, ADR 0021).
--
-- game.market_offers       sell orders gain a status (open, partial, filled, cancelled, expired)
-- game.market_buy_orders   buy orders: the limit per unit (everything the buyer pays, tariff included) times
--                          the quantity is locked in an escrow (R2 hold) before the order is published
-- game.market_trades       every execution, with its buy order and its export tax
-- game.market_access_licenses  access to foreign markets; required only when market_foreign_license_required
--                          is 1 (price PENDING in the specification, so it ships off)
-- country_policies.export_tax  0–100 % of the seller's net on sales outside the production country, to the
--                          production country's treasury
-- game.execute_trade, game.match_buy_order, game.match_offer, game.lock_book, game.require_market_access
-- public.post_buy_order, cancel_buy_order, list_buy_orders, list_my_buy_orders; post_offer and buy match
-- and settle through game.execute_trade; market_summary and list_my_offers return more columns
--
-- Matching: price-time priority. A new buy order takes the cheapest offers first (by what the buyer pays,
-- tariff included), then the oldest; a new offer goes to the highest buy orders first, then the oldest.
-- Every trade executes at the offer's price; what a buy order had locked above that returns to the buyer
-- at once, so the escrow always holds exactly remaining × limit.
--
-- Errors (ADR 0005): order_not_found, license_required, plus those of post_offer and buy.
--
-- Rollback: drop the public functions created here and restore post_offer, withdraw_offer, buy,
-- market_summary and list_my_offers from 20261013110000 (list_my_offers from 20261009220000); release the
-- open buy orders' holds; drop game.execute_trade, game.match_buy_order, game.match_offer, game.lock_book,
-- game.require_market_access, game.market_access_licenses, market_trades.buy_order_id and export_tax,
-- game.market_buy_orders, market_offers.status, country_policies.export_tax and the balance_params rows
-- added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('market_foreign_license_required', 0,
   '1 = selling or buying in another country''s market needs a license (price PENDING in the specification).');
update game.balance_params
set description = 'Open offers and buy orders a player may have at once.', updated_at = now()
where key = 'market_max_open_offers';

-- squawk-ignore adding-field-with-default
alter table game.country_policies add column export_tax numeric not null default 0
  -- squawk-ignore constraint-missing-not-valid
  constraint country_policies_export_tax_check check (export_tax between 0 and 1);
comment on column game.country_policies.export_tax is
  'Share of the seller''s net taken on sales of this country''s production in other markets (spec section 5).';

-- Sell orders -------------------------------------------------------------------------------------

-- squawk-ignore adding-field-with-default
alter table game.market_offers add column status text not null default 'open'
  -- squawk-ignore constraint-missing-not-valid
  constraint market_offers_status_check check (status in ('open', 'partial', 'filled', 'cancelled', 'expired'));
comment on column game.market_offers.status is 'open → partial → filled, or cancelled (withdrawn) or expired.';

update game.market_offers as o
set status = case
  when o.closed_at is null then
    case when exists (select 1 from game.market_trades as t where t.offer_id = o.id) then 'partial' else 'open' end
  when exists (select 1 from game.inventory_movements as m
               where m.kind = 'market_withdrawal' and m.reference = 'offer:' || o.id::text) then 'cancelled'
  else 'filled'
end;

-- Buy orders --------------------------------------------------------------------------------------

create table game.market_buy_orders (
  id bigint generated always as identity primary key,
  market_country_code text not null references game.countries (code),
  buyer_user_id uuid not null references game.citizens (user_id) on delete cascade,
  buyer_company_id bigint references game.companies (id),
  good_code text not null references game.goods (code),
  quantity integer not null check (quantity > 0),
  remaining integer not null check (remaining >= 0),
  limit_price bigint not null check (limit_price > 0),
  hold_id bigint not null unique references game.ledger_holds (id),
  status text not null default 'open' check (status in ('open', 'partial', 'filled', 'cancelled', 'expired')),
  creation_key text unique check (char_length(creation_key) <= 200),
  created_at timestamptz not null,
  closed_at timestamptz,
  constraint market_buy_orders_remaining check (remaining <= quantity),
  constraint market_buy_orders_closed check ((status in ('open', 'partial')) = (closed_at is null))
);
alter table game.market_buy_orders enable row level security;
comment on table game.market_buy_orders is
  'Public buy orders. limit_price is the most the buyer pays per unit, tariff included, in hundredths of the market''s Credit; remaining × limit_price stays locked in the hold.';
create index market_buy_orders_book_idx on game.market_buy_orders (market_country_code, good_code, limit_price desc, id)
  where status in ('open', 'partial');
create index market_buy_orders_buyer_idx on game.market_buy_orders (buyer_user_id) where status in ('open', 'partial');
create index market_buy_orders_company_idx on game.market_buy_orders (buyer_company_id) where buyer_company_id is not null;

-- squawk-ignore adding-foreign-key-constraint
alter table game.market_trades add column buy_order_id bigint references game.market_buy_orders (id);
-- squawk-ignore adding-field-with-default
alter table game.market_trades add column export_tax bigint not null default 0;
comment on column game.market_trades.export_tax is 'Paid by the seller to the production country''s treasury.';
-- The table only receives rows from the market functions, which are not running during the migration.
-- squawk-ignore require-concurrent-index-creation
create index market_trades_buy_order_idx on game.market_trades (buy_order_id) where buy_order_id is not null;

-- Foreign market licenses -------------------------------------------------------------------------

create table game.market_access_licenses (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  market_country_code text not null references game.countries (code),
  granted_at timestamptz not null,
  expires_at timestamptz,
  unique (user_id, market_country_code)
);
alter table game.market_access_licenses enable row level security;
comment on table game.market_access_licenses is
  'Access to another country''s market. Only checked when market_foreign_license_required is 1.';

create function game.require_market_access(p_citizen game.citizens, p_market_country_code text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_market_country_code is distinct from p_citizen.country_code
     and game.param('market_foreign_license_required') > 0
     and not exists (select 1 from game.market_access_licenses as l
                     where l.user_id = p_citizen.user_id and l.market_country_code = p_market_country_code
                       and (l.expires_at is null or l.expires_at > game.now())) then
    raise exception 'license_required' using errcode = '42501';
  end if;
end;
$$;

-- Matching ----------------------------------------------------------------------------------------

-- Everything that changes a book (one good in one market) runs one at a time, so a new order always sees
-- the other side as it is.
create function game.lock_book(p_market_country_code text, p_good_code text)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('market_book:' || p_market_country_code || ':' || p_good_code, 0));
$$;

-- Executes `p_quantity` units of an offer at its price. The buyer pays the gross plus the tariff on imports,
-- from their account (a direct purchase, `p_key` its ledger key) or from a buy order's hold, which gets back
-- what it had locked above that. From the gross: VAT and tariff to the market's treasury, the fee leaves the
-- game, the export tax (imports only) to the production country's treasury, and the rest to the seller.
-- Returns what the buyer paid.
create function game.execute_trade(
  p_offer_id bigint,
  p_quantity integer,
  p_buyer_user_id uuid,
  p_buyer_company_id bigint,
  p_buy_order_id bigint,
  p_key text
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_offer game.market_offers;
  v_order game.market_buy_orders;
  v_market game.country_policies;
  v_currency text;
  v_imported boolean;
  v_gross bigint;
  v_vat bigint;
  v_fee bigint;
  v_tariff bigint := 0;
  v_export bigint := 0;
  v_trade_id bigint;
  v_legs game.ledger_leg[];
  v_refund bigint;
begin
  select * into v_offer from game.market_offers where id = p_offer_id for update;
  if p_quantity <= 0 or v_offer.closed_at is not null or v_offer.quantity < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;
  select * into v_market from game.country_policies where country_code = v_offer.market_country_code;
  v_currency := v_offer.market_country_code;
  v_imported := v_offer.origin_country_code <> v_offer.market_country_code;

  v_gross := v_offer.price * p_quantity;
  v_vat := round(v_gross - v_gross / (1 + v_market.vat));
  v_fee := round(v_gross * game.param('market_fee'));
  if v_imported then
    v_tariff := round(v_gross * v_market.tariff);
    v_export := round((v_gross - v_vat - v_fee)
                      * (select p.export_tax from game.country_policies as p
                         where p.country_code = v_offer.origin_country_code));
  end if;

  insert into game.market_trades (offer_id, buy_order_id, buyer_user_id, quantity, price, gross, vat, tariff, fee,
                                  export_tax, idempotency_key, created_at)
  values (p_offer_id, p_buy_order_id, p_buyer_user_id, p_quantity, v_offer.price, v_gross, v_vat, v_tariff, v_fee,
          v_export, case when p_buy_order_id is null then p_key end, game.now())
  returning id into v_trade_id;

  select array_agg(leg) into v_legs
  from unnest(array[
    row(null, case when v_offer.seller_company_id is null
                   then game.citizen_account(v_offer.seller_user_id, v_currency)
                   else game.company_account(v_offer.seller_company_id, v_currency) end,
        v_gross - v_vat - v_fee - v_export, 'market_sale', null)::game.ledger_leg,
    row(null, game.treasury_account(v_offer.market_country_code, v_currency), v_vat + v_tariff, 'market_tax',
        null)::game.ledger_leg,
    row(null, game.system_account('sink', v_currency), v_fee, 'market_fee', null)::game.ledger_leg,
    row(null, game.treasury_account(v_offer.origin_country_code, v_currency), v_export, 'export_tax',
        null)::game.ledger_leg
  ]) as leg
  where leg.amount > 0;

  if p_buy_order_id is null then
    select array_agg(row(game.citizen_account(p_buyer_user_id, v_currency), l.credit_account_id, l.amount, l.kind,
                         l.memo)::game.ledger_leg)
    into v_legs
    from unnest(v_legs) as l;
    perform game.post('market_purchase', p_key, p_buyer_user_id, v_legs);
  else
    select * into v_order from game.market_buy_orders where id = p_buy_order_id for update;
    if v_order.status not in ('open', 'partial') or v_order.remaining < p_quantity then
      raise exception 'quantity_unavailable' using errcode = '22023';
    end if;
    perform game.capture_hold(v_order.hold_id, v_legs, 'trade:' || v_trade_id::text, p_buyer_user_id);
    v_refund := v_order.limit_price * p_quantity - (v_gross + v_tariff);
    if v_refund > 0 then
      perform game.release_hold(v_order.hold_id, 'trade:' || v_trade_id::text || ':refund', v_refund,
                                p_buyer_user_id);
    end if;
    update game.market_buy_orders
    set remaining = remaining - p_quantity,
        status = case when remaining - p_quantity = 0 then 'filled' else 'partial' end,
        closed_at = case when remaining - p_quantity = 0 then game.now() end
    where id = p_buy_order_id;
  end if;

  update game.market_offers
  set quantity = quantity - p_quantity,
      status = case when quantity - p_quantity = 0 then 'filled' else 'partial' end,
      closed_at = case when quantity - p_quantity = 0 then game.now() end
  where id = p_offer_id;
  perform game.put_goods(
    case when p_buyer_company_id is null then game.holder_for_citizen(p_buyer_user_id)
         else game.holder_for_company(p_buyer_company_id) end,
    v_offer.good_code, v_offer.origin_country_code, p_quantity, 'market_purchase', 'offer:' || v_offer.id::text
  );
  return v_gross + v_tariff;
end;
$$;
comment on function game.execute_trade(bigint, integer, uuid, bigint, bigint, text) is
  'Settles units of an offer at its price, paid directly or from a buy order''s hold. Returns what the buyer paid.';

-- A new buy order takes the offers it can afford: cheapest for the buyer first (tariff included), then the
-- oldest; never the buyer's own.
create function game.match_buy_order(p_order_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order game.market_buy_orders;
  v_offer game.market_offers;
begin
  loop
    select * into v_order from game.market_buy_orders where id = p_order_id;
    exit when v_order.remaining = 0 or v_order.status not in ('open', 'partial');
    select o.* into v_offer
    from game.market_offers as o
    join game.country_policies as p on p.country_code = o.market_country_code
    where o.market_country_code = v_order.market_country_code and o.good_code = v_order.good_code
      and o.closed_at is null and o.quantity > 0 and o.seller_user_id <> v_order.buyer_user_id
      and o.price * (1 + case when o.origin_country_code <> o.market_country_code then p.tariff else 0 end)
          <= v_order.limit_price
    order by o.price * (1 + case when o.origin_country_code <> o.market_country_code then p.tariff else 0 end), o.id
    limit 1
    for update of o;
    exit when not found;
    perform game.execute_trade(v_offer.id, least(v_order.remaining, v_offer.quantity), v_order.buyer_user_id,
                               v_order.buyer_company_id, v_order.id, null);
  end loop;
end;
$$;

-- A new offer goes to the buy orders that accept its price (tariff included): highest first, then the
-- oldest; never the seller's own.
create function game.match_offer(p_offer_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offer game.market_offers;
  v_cost numeric;
  v_order game.market_buy_orders;
begin
  loop
    select * into v_offer from game.market_offers where id = p_offer_id;
    exit when v_offer.closed_at is not null or v_offer.quantity = 0;
    v_cost := v_offer.price * (1 + case when v_offer.origin_country_code <> v_offer.market_country_code
                                        then (select p.tariff from game.country_policies as p
                                              where p.country_code = v_offer.market_country_code)
                                        else 0 end);
    select b.* into v_order
    from game.market_buy_orders as b
    where b.market_country_code = v_offer.market_country_code and b.good_code = v_offer.good_code
      and b.status in ('open', 'partial') and b.buyer_user_id <> v_offer.seller_user_id
      and b.limit_price >= v_cost
    order by b.limit_price desc, b.id
    limit 1
    for update;
    exit when not found;
    perform game.execute_trade(v_offer.id, least(v_order.remaining, v_offer.quantity), v_order.buyer_user_id,
                               v_order.buyer_company_id, v_order.id, null);
  end loop;
end;
$$;

-- API: sell orders --------------------------------------------------------------------------------

create or replace function public.post_offer(
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
  perform game.lock_book(p_market_country_code, p_good_code);
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
  perform game.require_market_access(v_citizen, p_market_country_code);
  if p_company_id is null then
    v_holder := game.holder_for_citizen(v_citizen.user_id);
  else
    perform game.own_company(p_company_id);
    v_holder := game.holder_for_company(p_company_id);
  end if;
  if game.open_orders(v_citizen.user_id) >= game.param('market_max_open_offers') then
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
  perform game.match_offer(v_id);
  return v_id;
end;
$$;
comment on function public.post_offer(text, integer, bigint, text, uuid, bigint, text) is
  'Posts whole units of one origin to a country''s market; they sell at once to the buy orders that accept the price.';

create or replace function public.withdraw_offer(p_offer_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer game.market_offers;
begin
  select * into v_offer from game.market_offers where id = p_offer_id;
  if found then
    perform game.lock_book(v_offer.market_country_code, v_offer.good_code);
  end if;
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
  update game.market_offers set quantity = 0, status = 'cancelled', closed_at = game.now() where id = p_offer_id;
end;
$$;

-- Buys units of one offer directly. The price and taxes are those of game.execute_trade.
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
  v_paid bigint;
begin
  select * into v_offer from game.market_offers where id = p_offer_id;
  if found then
    perform game.lock_book(v_offer.market_country_code, v_offer.good_code);
  end if;
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
  perform game.require_market_access(v_citizen, v_offer.market_country_code);
  if p_company_id is not null then
    perform game.own_company(p_company_id);
  end if;
  return game.execute_trade(p_offer_id, p_quantity, v_citizen.user_id, p_company_id, null, v_key);
end;
$$;

-- API: buy orders ---------------------------------------------------------------------------------

create function game.open_orders(p_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select ((select count(*) from game.market_offers where seller_user_id = p_user_id and closed_at is null)
        + (select count(*) from game.market_buy_orders
           where buyer_user_id = p_user_id and status in ('open', 'partial')))::integer;
$$;
comment on function game.open_orders(uuid) is 'Open offers plus open buy orders of a player.';

create function public.post_buy_order(
  p_good_code text,
  p_quantity integer,
  p_limit_price bigint,
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
  v_key text := 'buy_order:' || auth.uid()::text || ':' || p_key::text;
  v_hold bigint;
  v_id bigint;
begin
  perform game.lock_book(p_market_country_code, p_good_code);
  select id into v_id from game.market_buy_orders where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if not exists (select 1 from game.goods where code = p_good_code and active) then
    raise exception 'good_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.countries where code = p_market_country_code and is_active) then
    raise exception 'market_invalid' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_limit_price is null or p_limit_price <= 0
     or p_limit_price::numeric * p_quantity > 1e15 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  perform game.require_market_access(v_citizen, p_market_country_code);
  if p_company_id is not null then
    perform game.own_company(p_company_id);
  end if;
  if game.open_orders(v_citizen.user_id) >= game.param('market_max_open_offers') then
    raise exception 'too_many_offers' using errcode = '22023';
  end if;

  -- The money is locked before the order exists; without it nothing is published.
  v_hold := game.hold(game.citizen_account(v_citizen.user_id, p_market_country_code), p_limit_price * p_quantity,
                      'market_buy_order', null, v_key, v_citizen.user_id);
  insert into game.market_buy_orders (market_country_code, buyer_user_id, buyer_company_id, good_code, quantity,
                                      remaining, limit_price, hold_id, creation_key, created_at)
  values (p_market_country_code, v_citizen.user_id, p_company_id, p_good_code, p_quantity, p_quantity,
          p_limit_price, v_hold, v_key, game.now())
  returning id into v_id;
  update game.ledger_holds set reference = 'buy_order:' || v_id::text where id = v_hold;
  perform game.match_buy_order(v_id);
  return v_id;
end;
$$;
comment on function public.post_buy_order(text, integer, bigint, text, uuid, bigint) is
  'Locks limit × quantity and publishes a buy order; it takes at once the offers it can afford. Units go to the inventory or an own company''s depot.';
grant execute on function public.post_buy_order(text, integer, bigint, text, uuid, bigint) to authenticated;

create function public.cancel_buy_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order game.market_buy_orders;
begin
  select * into v_order from game.market_buy_orders where id = p_order_id;
  if found then
    perform game.lock_book(v_order.market_country_code, v_order.good_code);
  end if;
  select * into v_order from game.market_buy_orders where id = p_order_id for update;
  if not found or v_order.buyer_user_id is distinct from auth.uid() or v_order.status not in ('open', 'partial') then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  perform game.release_hold(v_order.hold_id, 'buy_order_cancel:' || v_order.id::text, null, v_order.buyer_user_id);
  update game.market_buy_orders set status = 'cancelled', closed_at = game.now() where id = p_order_id;
end;
$$;
comment on function public.cancel_buy_order(bigint) is 'Cancels the rest of the player''s buy order and releases its locked money.';
grant execute on function public.cancel_buy_order(bigint) to authenticated;

-- Reads -------------------------------------------------------------------------------------------

create function public.list_buy_orders(p_country_code text, p_good_code text)
returns table (order_id bigint, buyer_name text, remaining integer, limit_price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, coalesce(co.name, c.name), b.remaining, b.limit_price
  from game.market_buy_orders as b
  join game.citizens as c on c.user_id = b.buyer_user_id
  left join game.companies as co on co.id = b.buyer_company_id
  where b.market_country_code = p_country_code and b.good_code = p_good_code and b.status in ('open', 'partial')
  order by b.limit_price desc, b.id
  limit 100;
$$;
comment on function public.list_buy_orders(text, text) is 'Open buy orders of a good in a country''s market, highest first.';
grant execute on function public.list_buy_orders(text, text) to anon, authenticated;

create function public.list_my_buy_orders()
returns table (
  order_id bigint, market_country_code text, good_code text, company_name text, quantity integer, remaining integer,
  limit_price bigint, held bigint, status text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.market_country_code, b.good_code, co.name, b.quantity, b.remaining, b.limit_price, a.balance,
         b.status, b.created_at
  from game.market_buy_orders as b
  join game.ledger_holds as h on h.id = b.hold_id
  join game.accounts as a on a.id = h.escrow_account_id
  left join game.companies as co on co.id = b.buyer_company_id
  where b.buyer_user_id = auth.uid() and b.status in ('open', 'partial')
  order by b.created_at desc, b.id desc;
$$;
comment on function public.list_my_buy_orders() is 'The player''s open buy orders with the money each still holds.';
grant execute on function public.list_my_buy_orders() to authenticated;

-- New columns change the return types.
-- squawk-ignore ban-drop-function
drop function public.market_summary(text);

create function public.market_summary(p_country_code text)
returns table (
  good_code text, best_price bigint, average_24h bigint, offers integer, best_bid bigint, bids integer, vat numeric,
  tariff numeric, fee numeric, export_tax numeric
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
         (select max(b.limit_price) from game.market_buy_orders as b
          where b.market_country_code = p_country_code and b.good_code = g.code and b.status in ('open', 'partial')),
         (select count(*)::integer from game.market_buy_orders as b
          where b.market_country_code = p_country_code and b.good_code = g.code and b.status in ('open', 'partial')),
         p.vat, p.tariff, game.param('market_fee'), p.export_tax
  from game.goods as g
  cross join game.country_policies as p
  where p.country_code = p_country_code and g.active
  order by g.kind desc, g.category, g.quality nulls first, g.code;
$$;
comment on function public.market_summary(text) is
  'Per good: the best offer and buy order, the 24-hour average, and the market''s taxes (export_tax is this country''s, on its production sold abroad).';
grant execute on function public.market_summary(text) to anon, authenticated;

-- squawk-ignore ban-drop-function
drop function public.list_my_offers();

create function public.list_my_offers()
returns table (
  offer_id bigint, market_country_code text, good_code text, company_name text, quantity integer, price bigint,
  sold integer, status text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.market_country_code, o.good_code, co.name, o.quantity, o.price,
         coalesce((select sum(t.quantity)::integer from game.market_trades as t where t.offer_id = o.id), 0),
         o.status, o.created_at
  from game.market_offers as o
  left join game.companies as co on co.id = o.seller_company_id
  where o.seller_user_id = auth.uid() and o.closed_at is null
  order by o.created_at desc;
$$;
comment on function public.list_my_offers() is 'The player''s open offers with what each has sold.';
grant execute on function public.list_my_offers() to authenticated;

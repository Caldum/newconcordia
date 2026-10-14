-- R6 amended by the owner (ADR 0022): buy orders are removed, and foreign market licenses cost 10 GOLD (5 to the
-- treasury of the country whose market it opens, 5 burned), are permanent and are now required.
--
-- Removed: public.post_buy_order, cancel_buy_order, list_buy_orders, list_my_buy_orders; game.match_buy_order,
-- game.match_offer; market_trades.buy_order_id; game.market_buy_orders (open orders are cancelled and their
-- holds released first).
-- Changed: game.execute_trade loses the buy order path; post_offer no longer matches; market_summary loses
-- best_bid and bids; game.open_orders counts offers only.
-- New: public.buy_market_license, list_my_market_licenses, get_market_license_terms.
--
-- Errors (ADR 0005): license_not_needed, market_invalid, insufficient_funds.
--
-- Rollback: recreate the buy order objects and functions from 20261014100000; drop the three license functions
-- and the market_license_* balance_params rows; set market_foreign_license_required back to 0.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Buy orders out -------------------------------------------------------------------------------------

do $$
declare
  v_order game.market_buy_orders;
begin
  for v_order in select * from game.market_buy_orders where status in ('open', 'partial') for update loop
    perform game.release_hold(v_order.hold_id, 'buy_order_removed:' || v_order.id::text, null, null);
    update game.market_buy_orders set status = 'cancelled', closed_at = game.now() where id = v_order.id;
  end loop;
end;
$$;

-- squawk-ignore ban-drop-function
drop function public.post_buy_order(text, integer, bigint, text, uuid, bigint);
-- squawk-ignore ban-drop-function
drop function public.cancel_buy_order(bigint);
-- squawk-ignore ban-drop-function
drop function public.list_buy_orders(text, text);
-- squawk-ignore ban-drop-function
drop function public.list_my_buy_orders();
-- squawk-ignore ban-drop-function
drop function game.match_buy_order(bigint);
-- squawk-ignore ban-drop-function
drop function game.match_offer(bigint);
-- squawk-ignore ban-drop-function
drop function game.execute_trade(bigint, integer, uuid, bigint, bigint, text);
-- The owner removed buy orders; their trades keep everything else they recorded.
-- squawk-ignore ban-drop-column
alter table game.market_trades drop column buy_order_id;
-- squawk-ignore ban-drop-table
drop table game.market_buy_orders;

-- Settling a purchase ----------------------------------------------------------------------------------

-- Executes `p_quantity` units of an offer at its price, paid from the buyer's account. The buyer pays the gross
-- plus the tariff on imports. From the gross: VAT and tariff to the market's treasury, the fee leaves the game,
-- the export tax (imports only) to the production country's treasury, the rest to the seller. Returns what the
-- buyer paid.
create function game.execute_trade(
  p_offer_id bigint,
  p_quantity integer,
  p_buyer_user_id uuid,
  p_buyer_company_id bigint,
  p_key text
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_offer game.market_offers;
  v_market game.country_policies;
  v_currency text;
  v_buyer bigint;
  v_gross bigint;
  v_vat bigint;
  v_fee bigint;
  v_tariff bigint := 0;
  v_export bigint := 0;
  v_legs game.ledger_leg[];
begin
  select * into v_offer from game.market_offers where id = p_offer_id for update;
  if p_quantity <= 0 or v_offer.closed_at is not null or v_offer.quantity < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;
  select * into v_market from game.country_policies where country_code = v_offer.market_country_code;
  v_currency := v_offer.market_country_code;
  v_buyer := game.citizen_account(p_buyer_user_id, v_currency);

  v_gross := v_offer.price * p_quantity;
  v_vat := round(v_gross - v_gross / (1 + v_market.vat));
  v_fee := round(v_gross * game.param('market_fee'));
  if v_offer.origin_country_code <> v_offer.market_country_code then
    v_tariff := round(v_gross * v_market.tariff);
    v_export := round((v_gross - v_vat - v_fee)
                      * (select p.export_tax from game.country_policies as p
                         where p.country_code = v_offer.origin_country_code));
  end if;

  select array_agg(leg) into v_legs
  from unnest(array[
    row(v_buyer, case when v_offer.seller_company_id is null
                      then game.citizen_account(v_offer.seller_user_id, v_currency)
                      else game.company_account(v_offer.seller_company_id, v_currency) end,
        v_gross - v_vat - v_fee - v_export, 'market_sale', null)::game.ledger_leg,
    row(v_buyer, game.treasury_account(v_offer.market_country_code, v_currency), v_vat + v_tariff, 'market_tax',
        null)::game.ledger_leg,
    row(v_buyer, game.system_account('sink', v_currency), v_fee, 'market_fee', null)::game.ledger_leg,
    row(v_buyer, game.treasury_account(v_offer.origin_country_code, v_currency), v_export, 'export_tax',
        null)::game.ledger_leg
  ]) as leg
  where leg.amount > 0;
  perform game.post('market_purchase', p_key, p_buyer_user_id, v_legs);

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
  insert into game.market_trades (offer_id, buyer_user_id, quantity, price, gross, vat, tariff, fee, export_tax,
                                  idempotency_key, created_at)
  values (p_offer_id, p_buyer_user_id, p_quantity, v_offer.price, v_gross, v_vat, v_tariff, v_fee, v_export, p_key,
          game.now());
  return v_gross + v_tariff;
end;
$$;
comment on function game.execute_trade(bigint, integer, uuid, bigint, text) is
  'Settles units of an offer at its price with VAT, tariff, fee and export tax. Returns what the buyer paid.';

create or replace function game.open_orders(p_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from game.market_offers where seller_user_id = p_user_id and closed_at is null;
$$;
comment on function game.open_orders(uuid) is 'Open offers of a player.';

update game.balance_params
set description = 'Open offers a player may have at once.', updated_at = now()
where key = 'market_max_open_offers';

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
  return v_id;
end;
$$;
comment on function public.post_offer(text, integer, bigint, text, uuid, bigint, text) is
  'Posts whole units of one origin to a country''s market; another country''s market needs a license.';

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
  return game.execute_trade(p_offer_id, p_quantity, v_citizen.user_id, p_company_id, v_key);
end;
$$;

-- squawk-ignore ban-drop-function
drop function public.market_summary(text);

create function public.market_summary(p_country_code text)
returns table (
  good_code text, best_price bigint, average_24h bigint, offers integer, vat numeric, tariff numeric, fee numeric,
  export_tax numeric
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
         p.vat, p.tariff, game.param('market_fee'), p.export_tax
  from game.goods as g
  cross join game.country_policies as p
  where p.country_code = p_country_code and g.active
  order by g.kind desc, g.category, g.quality nulls first, g.code;
$$;
comment on function public.market_summary(text) is
  'Per good: the best offer, the 24-hour average, and the market''s taxes (export_tax is this country''s, on its production sold abroad).';
grant execute on function public.market_summary(text) to anon, authenticated;

-- Licenses -------------------------------------------------------------------------------------------

insert into game.balance_params (key, value, description) values
  ('market_license_price', 1000, 'GOLD hundredths a foreign market license costs (owner, 2026-10-14).'),
  ('market_license_country_share', 500, 'GOLD hundredths of the license price that go to the market country''s treasury; the rest is burned.');
update game.balance_params
set value = 1, description = '1 = selling or buying in another country''s market needs a license.', updated_at = now()
where key = 'market_foreign_license_required';

create function public.buy_market_license(p_market_country_code text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'license:' || auth.uid()::text || ':' || p_key::text;
  v_price bigint := game.param('market_license_price')::bigint;
  v_country_share bigint := game.param('market_license_country_share')::bigint;
  v_payer bigint;
  v_id bigint;
begin
  if not exists (select 1 from game.countries where code = p_market_country_code and is_active) then
    raise exception 'market_invalid' using errcode = '22023';
  end if;
  if p_market_country_code = v_citizen.country_code then
    raise exception 'license_not_needed' using errcode = '22023';
  end if;
  -- One license per market and player: the row lock makes a second purchase wait and then find it.
  perform 1 from game.citizens where user_id = v_citizen.user_id for update;
  select id into v_id from game.market_access_licenses
  where user_id = v_citizen.user_id and market_country_code = p_market_country_code;
  if found then
    return v_id;
  end if;

  v_payer := game.citizen_account(v_citizen.user_id, 'GOLD');
  perform game.post(
    'market_license', v_key, v_citizen.user_id,
    array[
      row(v_payer, game.treasury_account(p_market_country_code, 'GOLD'), v_country_share, 'market_license', null)::game.ledger_leg,
      row(v_payer, game.system_account('sink', 'GOLD'), v_price - v_country_share, 'market_license', null)::game.ledger_leg
    ]
  );
  insert into game.market_access_licenses (user_id, market_country_code, granted_at)
  values (v_citizen.user_id, p_market_country_code, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.buy_market_license(text, uuid) is
  'Buys a permanent license to trade in another country''s market: part to its treasury, the rest burned.';
grant execute on function public.buy_market_license(text, uuid) to authenticated;

create function public.list_my_market_licenses()
returns table (market_country_code text, granted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.market_country_code, l.granted_at
  from game.market_access_licenses as l
  where l.user_id = auth.uid() and (l.expires_at is null or l.expires_at > game.now())
  order by l.granted_at;
$$;
comment on function public.list_my_market_licenses() is 'The foreign markets the player may trade in.';
grant execute on function public.list_my_market_licenses() to authenticated;

create function public.get_market_license_terms()
returns table (price bigint, country_share bigint, required boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select game.param('market_license_price')::bigint, game.param('market_license_country_share')::bigint,
         game.param('market_foreign_license_required') > 0;
$$;
comment on function public.get_market_license_terms() is 'What a foreign market license costs, in GOLD hundredths.';
grant execute on function public.get_market_license_terms() to anon, authenticated;

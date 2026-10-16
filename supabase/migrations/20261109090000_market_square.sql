-- The market square (owner, ADR 0048).
--
-- A player buys in the market of the country where they are now: the owner of the region they are in. To buy
-- in another country they travel there; being there is enough, no license is needed to buy. Licenses still let
-- a player sell in another country's market from afar. A ticket buys several offers at once, in one
-- transaction: every line or none. The market's figures (volume and average ticket of the last 24 hours, active
-- offers) are for the president and the minister of the economy of that country only.
--
-- game.location_country, game.require_market_presence; public.buy checks presence instead of the license;
-- public.buy_ticket, public.market_stats; balance param market_ticket_lines_max.
--
-- Errors (ADR 0005): not_in_market_country, ticket_invalid, not_allowed (plus those of public.buy).
--
-- Rollback: restore public.buy from 20261014110000; drop public.buy_ticket, public.market_stats,
-- game.require_market_presence and game.location_country; delete market_ticket_lines_max.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('market_ticket_lines_max', 20, 'Most offers one market ticket buys at once (ADR 0048).');

create function game.location_country(p_citizen game.citizens)
returns text
language sql
stable
set search_path = ''
as $$
  select r.owner_country_code from game.regions as r where r.code = p_citizen.region_code;
$$;
comment on function game.location_country(game.citizens) is 'The country that owns the region the citizen is in.';

create function game.require_market_presence(p_citizen game.citizens, p_market_country_code text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if game.location_country(p_citizen) is distinct from p_market_country_code then
    raise exception 'not_in_market_country' using errcode = '42501';
  end if;
end;
$$;
comment on function game.require_market_presence(game.citizens, text) is
  'Buying needs the player to be in the market''s country (ADR 0048).';

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
  perform game.require_market_presence(v_citizen, v_offer.market_country_code);
  if p_company_id is not null then
    perform game.own_company(p_company_id);
  end if;
  return game.execute_trade(p_offer_id, p_quantity, v_citizen.user_id, p_company_id, v_key);
end;
$$;
comment on function public.buy(bigint, integer, uuid, bigint) is
  'Buys units of one offer in the market of the country the player is in. Idempotent by key.';

-- Each line is an ordinary purchase with a key derived from the ticket's, so a retry repeats the same
-- purchases. Lines run book by book in a fixed order, so two tickets never wait on each other in a cycle.
create function public.buy_ticket(p_lines jsonb, p_key uuid, p_company_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line record;
  v_total bigint := 0;
begin
  perform game.require_citizen();
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0
     or jsonb_array_length(p_lines) > game.param('market_ticket_lines_max')
     or exists (select 1 from jsonb_array_elements(p_lines) as e
                where jsonb_typeof(e) <> 'object'
                   or jsonb_typeof(e -> 'offer_id') <> 'number' or jsonb_typeof(e -> 'quantity') <> 'number') then
    raise exception 'ticket_invalid' using errcode = '22023';
  end if;
  if p_key is null then
    raise exception 'ticket_invalid' using errcode = '22023';
  end if;

  for v_line in
    select l.offer_id, l.quantity
    from (select (e ->> 'offer_id')::bigint as offer_id, sum((e ->> 'quantity')::integer)::integer as quantity
          from jsonb_array_elements(p_lines) as e
          group by 1) as l
    left join game.market_offers as o on o.id = l.offer_id
    order by o.market_country_code, o.good_code, l.offer_id
  loop
    v_total := v_total + public.buy(
      v_line.offer_id, v_line.quantity,
      md5('ticket:' || p_key::text || ':' || v_line.offer_id::text)::uuid, p_company_id);
  end loop;
  return v_total;
end;
$$;
comment on function public.buy_ticket(jsonb, uuid, bigint) is
  'Buys several offers at once ([{offer_id, quantity}]): every line or none. Returns what was paid.';
grant execute on function public.buy_ticket(jsonb, uuid, bigint) to authenticated;

create function public.market_stats(p_country_code text)
returns table (
  volume_24h bigint,
  volume_prev_24h bigint,
  trades_24h integer,
  average_ticket_24h bigint,
  average_ticket_prev_24h bigint,
  active_offers integer,
  offers_today integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_now timestamptz := game.now();
begin
  if not game.holds_office(v_citizen.user_id, p_country_code, array['president', 'minister_economy']) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  with trades as (
    select t.gross + t.tariff as paid, t.created_at > v_now - interval '24 hours' as recent
    from game.market_trades as t
    join game.market_offers as o on o.id = t.offer_id
    where o.market_country_code = p_country_code and t.created_at > v_now - interval '48 hours'
  )
  select coalesce(sum(paid) filter (where recent), 0)::bigint,
         coalesce(sum(paid) filter (where not recent), 0)::bigint,
         (count(*) filter (where recent))::integer,
         round(avg(paid) filter (where recent))::bigint,
         round(avg(paid) filter (where not recent))::bigint,
         (select count(*)::integer from game.market_offers as o
          where o.market_country_code = p_country_code and o.closed_at is null and o.quantity > 0),
         (select count(*)::integer from game.market_offers as o
          where o.market_country_code = p_country_code and o.created_at >= date_trunc('day', v_now, 'UTC'))
  from trades;
end;
$$;
comment on function public.market_stats(text) is
  'A market''s figures (24 h volume and average ticket against the 24 h before, active offers, offers today): '
  'for that country''s president and minister of the economy only.';
grant execute on function public.market_stats(text) to authenticated;

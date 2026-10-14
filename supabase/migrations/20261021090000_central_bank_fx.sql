-- G6 · Central Bank and foreign exchange: FX offers of every national currency against GOLD with locked funds and
-- partial takes, the Central Bank trading what it holds, its transfers to the Treasury, and single-use
-- authorizations of the Economy minister for transfers to companies (spec section 4, ADR 0029).
--
-- game.fx_offers           an offer in the pair <currency>/GOLD: sell_gold (locks GOLD) or buy_gold (locks the
--                          currency needed); amounts in GOLD hundredths, price in currency hundredths per GOLD;
--                          open → partial → filled | cancelled; owned by a citizen or a country's Central Bank
-- game.fx_trades           every take: GOLD and currency exchanged at the offer's price (the currency side rounds
--                          down to the hundredth)
-- game.cb_authorizations   the Economy minister authorizes one transfer (amount, currency, company in the country);
--                          the governor executes it once, or the minister cancels it
-- Bill kind central_bank_allocation: GOLD and national currency from the Treasury to the Central Bank.
-- Without a governor the Central Bank is paralyzed: every operation of it requires the governor.
--
-- public.fx_post_offer, fx_take, fx_cancel, fx_book, fx_summary, list_my_fx_offers, central_bank_to_treasury,
--   authorize_cb_transfer, cancel_cb_authorization, execute_cb_transfer, list_cb_authorizations
--
-- Errors (ADR 0005): currency_invalid, side_invalid, amount_invalid, price_invalid, too_many_offers,
-- insufficient_funds, offer_not_found, own_offer, quantity_unavailable, not_governor, not_minister,
-- recipient_invalid, authorization_not_found, authorization_closed, bill_terms_invalid.
--
-- Rollback: drop the public functions created here, game.fx_owner_account, game.require_governor,
-- game.cb_authorizations, game.fx_trades, game.fx_offers; restore game.bill_terms, game.bill_spending and
-- game.execute_bill from 20261020090000 and the bills kind check; delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('fx_max_open_offers', 10, 'Open FX offers a citizen (or a Central Bank) may have at once.');

-- Bills: funds for the Central Bank ------------------------------------------------------------------------------

-- Replaced right below, in the same transaction, by the kinds of G6.
-- squawk-ignore ban-drop-constraint
alter table game.bills drop constraint bills_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.bills add constraint bills_kind_check check (kind in (
  'ordinary', 'taxes', 'gold_transfer', 'ministry_allocation', 'currency_issuance', 'central_bank_allocation'
));

create or replace function game.bill_terms(p_country_code text, p_kind text, p_terms jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_terms jsonb := coalesce(p_terms, '{}'::jsonb);
  v_key text;
  v_value numeric;
  v_gold numeric;
  v_credit numeric;
  v_out jsonb := '{}'::jsonb;
  v_ranges constant jsonb := '{"vat": 0.25, "tariff": 0.50, "work_tax": 0.30, "export_tax": 1}'::jsonb;
begin
  if jsonb_typeof(v_terms) <> 'object' then
    raise exception 'bill_terms_invalid' using errcode = '22023';
  end if;
  case p_kind
    when 'ordinary' then
      return '{}'::jsonb;
    when 'taxes' then
      for v_key in select jsonb_object_keys(v_terms) loop
        if jsonb_typeof(v_terms -> v_key) <> 'number' then
          raise exception 'bill_terms_invalid' using errcode = '22023';
        end if;
        v_value := (v_terms ->> v_key)::numeric;
        if v_key = 'minimum_wage' then
          if v_value < 0 or v_value <> trunc(v_value) then
            raise exception 'bill_terms_invalid' using errcode = '22023';
          end if;
        elsif not v_ranges ? v_key or v_value < 0 or v_value > (v_ranges ->> v_key)::numeric
              or v_value <> round(v_value, 4) then
          raise exception 'bill_terms_invalid' using errcode = '22023';
        end if;
        v_out := v_out || jsonb_build_object(v_key, v_value);
      end loop;
      if v_out = '{}'::jsonb then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      return v_out;
    when 'gold_transfer' then
      if jsonb_typeof(v_terms -> 'amount') <> 'number' or jsonb_typeof(v_terms -> 'country_code') <> 'string' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_value := (v_terms ->> 'amount')::numeric;
      if v_value <= 0 or v_value <> trunc(v_value) or v_value > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      if v_terms ->> 'country_code' = p_country_code
         or not exists (select 1 from game.countries where code = v_terms ->> 'country_code') then
        raise exception 'country_invalid' using errcode = '22023';
      end if;
      return jsonb_build_object('country_code', v_terms ->> 'country_code', 'amount', v_value::bigint);
    when 'ministry_allocation', 'central_bank_allocation' then
      if (p_kind = 'ministry_allocation'
          and coalesce(v_terms ->> 'ministry', '') not in ('economy', 'defense', 'foreign_affairs', 'health', 'development'))
         or coalesce(jsonb_typeof(v_terms -> 'gold'), 'number') <> 'number'
         or coalesce(jsonb_typeof(v_terms -> 'credit'), 'number') <> 'number' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_gold := coalesce((v_terms ->> 'gold')::numeric, 0);
      v_credit := coalesce((v_terms ->> 'credit')::numeric, 0);
      if v_gold < 0 or v_credit < 0 or v_gold + v_credit = 0 or v_gold <> trunc(v_gold) or v_credit <> trunc(v_credit)
         or v_gold > 9e15 or v_credit > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_out := jsonb_build_object('gold', v_gold::bigint, 'credit', v_credit::bigint);
      if p_kind = 'ministry_allocation' then
        v_out := v_out || jsonb_build_object('ministry', v_terms ->> 'ministry');
      end if;
      return v_out;
    when 'currency_issuance' then
      if jsonb_typeof(v_terms -> 'amount') <> 'number' then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      v_value := (v_terms ->> 'amount')::numeric;
      if v_value <= 0 or v_value <> trunc(v_value) or v_value > 9e15 then
        raise exception 'bill_terms_invalid' using errcode = '22023';
      end if;
      return jsonb_build_object('amount', v_value::bigint);
    else
      raise exception 'bill_kind_invalid' using errcode = '22023';
  end case;
end;
$$;

create or replace function game.bill_spending(p_country_code text, p_kind text, p_terms jsonb)
returns table (currency_code text, amount bigint)
language sql
immutable
set search_path = ''
as $$
  select s.currency_code, s.amount
  from (values
    ('GOLD', case when p_kind = 'gold_transfer' then (p_terms ->> 'amount')::bigint
                  when p_kind in ('ministry_allocation', 'central_bank_allocation') then (p_terms ->> 'gold')::bigint end),
    (p_country_code, case when p_kind in ('ministry_allocation', 'central_bank_allocation')
                          then (p_terms ->> 'credit')::bigint end)
  ) as s (currency_code, amount)
  where s.amount > 0;
$$;

create or replace function game.execute_bill(p_bill game.bills)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_reservation record;
begin
  case p_bill.kind
    when 'ordinary' then
      null;
    when 'taxes' then
      update game.country_policies
      set vat = coalesce((p_bill.terms ->> 'vat')::numeric, vat),
          tariff = coalesce((p_bill.terms ->> 'tariff')::numeric, tariff),
          work_tax = coalesce((p_bill.terms ->> 'work_tax')::numeric, work_tax),
          export_tax = coalesce((p_bill.terms ->> 'export_tax')::numeric, export_tax),
          minimum_wage = coalesce((p_bill.terms ->> 'minimum_wage')::bigint, minimum_wage)
      where country_code = p_bill.country_code;
    when 'gold_transfer' then
      if not (select is_active from game.countries where code = p_bill.terms ->> 'country_code') then
        raise exception 'country_inactive' using errcode = '22023';
      end if;
      perform game.capture_hold(
        r.hold_id,
        array[row(null, game.treasury_account(p_bill.terms ->> 'country_code', 'GOLD'),
                  (p_bill.terms ->> 'amount')::bigint, 'gold_transfer', p_bill.title)::game.ledger_leg],
        'bill_execute:' || p_bill.id::text, p_bill.proposed_by
      )
      from game.bill_reservations as r where r.bill_id = p_bill.id;
    when 'ministry_allocation', 'central_bank_allocation' then
      for v_reservation in
        select r.hold_id, h.currency_code, h.amount
        from game.bill_reservations as r join game.ledger_holds as h on h.id = r.hold_id
        where r.bill_id = p_bill.id
        order by r.hold_id
      loop
        perform game.capture_hold(
          v_reservation.hold_id,
          array[row(null,
                    case when p_bill.kind = 'central_bank_allocation'
                         then game.central_bank_account(p_bill.country_code, v_reservation.currency_code)
                         else game.ministry_account(p_bill.country_code, p_bill.terms ->> 'ministry', v_reservation.currency_code) end,
                    v_reservation.amount, p_bill.kind, p_bill.title)::game.ledger_leg],
          'bill_execute:' || p_bill.id::text || ':' || v_reservation.currency_code, p_bill.proposed_by
        );
      end loop;
    when 'currency_issuance' then
      perform game.post(
        'currency_issuance', 'bill_execute:' || p_bill.id::text, p_bill.proposed_by,
        array[row(game.system_account('issuer', p_bill.country_code), game.treasury_account(p_bill.country_code, p_bill.country_code),
                  (p_bill.terms ->> 'amount')::bigint, 'currency_issuance', p_bill.title)::game.ledger_leg]
      );
  end case;
end;
$$;

-- The governor -----------------------------------------------------------------------------------------------------

-- The Central Bank acts only through its governor; without one it is paralyzed.
create function game.require_governor(p_citizen game.citizens)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not game.holds_office(p_citizen.user_id, p_citizen.country_code, array['central_bank_governor']) then
    raise exception 'not_governor' using errcode = '42501';
  end if;
end;
$$;

-- FX offers ------------------------------------------------------------------------------------------------------------

create table game.fx_offers (
  id bigint generated always as identity primary key,
  currency_code text not null references game.currencies (code) check (currency_code <> 'GOLD'),
  side text not null check (side in ('sell_gold', 'buy_gold')),
  user_id uuid references game.citizens (user_id) on delete cascade,
  central_bank_country_code text references game.countries (code),
  gold_amount bigint not null check (gold_amount >= 0),
  initial_gold_amount bigint not null check (initial_gold_amount > 0),
  price bigint not null check (price > 0),
  hold_id bigint not null unique references game.ledger_holds (id),
  status text not null default 'open' check (status in ('open', 'partial', 'filled', 'cancelled')),
  creation_key text unique check (char_length(creation_key) <= 200),
  created_at timestamptz not null,
  closed_at timestamptz,
  constraint fx_offers_one_owner check ((user_id is null) <> (central_bank_country_code is null)),
  constraint fx_offers_closed check ((status in ('filled', 'cancelled')) = (closed_at is not null))
);
alter table game.fx_offers enable row level security;
comment on table game.fx_offers is
  'Offers in a <currency>/GOLD pair; gold_amount and price (currency hundredths per GOLD) define both sides.';
create index fx_offers_book_idx on game.fx_offers (currency_code, side, price, id) where closed_at is null;
create index fx_offers_user_idx on game.fx_offers (user_id) where user_id is not null;
create index fx_offers_bank_idx on game.fx_offers (central_bank_country_code) where central_bank_country_code is not null;

create table game.fx_trades (
  id bigint generated always as identity primary key,
  offer_id bigint not null references game.fx_offers (id),
  taker_user_id uuid references game.citizens (user_id) on delete set null,
  taker_central_bank_country_code text references game.countries (code),
  gold_amount bigint not null check (gold_amount > 0),
  currency_amount bigint not null check (currency_amount > 0),
  price bigint not null,
  idempotency_key text unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null
);
alter table game.fx_trades enable row level security;
comment on table game.fx_trades is 'Every exchange of GOLD and a national currency at an offer''s price.';
create index fx_trades_offer_idx on game.fx_trades (offer_id);
create index fx_trades_recent_idx on game.fx_trades (created_at);
create index fx_trades_taker_idx on game.fx_trades (taker_user_id) where taker_user_id is not null;

-- The account that pays or receives a currency for a citizen or a Central Bank.
create function game.fx_owner_account(p_user_id uuid, p_bank_country text, p_currency text)
returns bigint
language sql
set search_path = ''
as $$
  select case when p_user_id is not null then game.citizen_account(p_user_id, p_currency)
              else game.central_bank_account(p_bank_country, p_currency) end;
$$;

create function game.lock_fx_book(p_currency text)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('fx_book:' || p_currency, 0));
$$;

-- Posts an FX offer. sell_gold locks the GOLD; buy_gold locks the currency it would pay (rounded up). With
-- p_central_bank the governor posts it with the Central Bank's funds.
create function public.fx_post_offer(
  p_currency text,
  p_side text,
  p_gold_amount bigint,
  p_price bigint,
  p_key uuid,
  p_central_bank boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'fx_offer:' || auth.uid()::text || ':' || p_key::text;
  v_user uuid := case when coalesce(p_central_bank, false) then null else v_citizen.user_id end;
  v_bank text := case when coalesce(p_central_bank, false) then v_citizen.country_code end;
  v_locked_currency text;
  v_locked bigint;
  v_hold bigint;
  v_id bigint;
begin
  perform game.lock_fx_book(coalesce(p_currency, ''));
  select id into v_id from game.fx_offers where creation_key = v_key;
  if found then
    return v_id;
  end if;
  if v_bank is not null then
    perform game.require_governor(v_citizen);
  end if;
  if p_currency is null or p_currency = 'GOLD' or not exists (select 1 from game.currencies where code = p_currency) then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;
  if p_side is null or p_side not in ('sell_gold', 'buy_gold') then
    raise exception 'side_invalid' using errcode = '22023';
  end if;
  if p_gold_amount is null or p_gold_amount <= 0 or p_gold_amount > 1e12 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_price is null or p_price <= 0 or p_price > 1e9 or p_gold_amount * p_price / 100 = 0 then
    raise exception 'price_invalid' using errcode = '22023';
  end if;
  if (select count(*) from game.fx_offers
      where closed_at is null and user_id is not distinct from v_user
        and central_bank_country_code is not distinct from v_bank) >= game.param('fx_max_open_offers') then
    raise exception 'too_many_offers' using errcode = '22023';
  end if;
  if p_side = 'sell_gold' then
    v_locked_currency := 'GOLD';
    v_locked := p_gold_amount;
  else
    v_locked_currency := p_currency;
    v_locked := ceil(p_gold_amount::numeric * p_price / 100)::bigint;
  end if;
  v_hold := game.hold(game.fx_owner_account(v_user, v_bank, v_locked_currency), v_locked, 'fx_offer', null,
                      v_key, v_citizen.user_id);
  insert into game.fx_offers (currency_code, side, user_id, central_bank_country_code, gold_amount, initial_gold_amount,
                              price, hold_id, creation_key, created_at)
  values (p_currency, p_side, v_user, v_bank, p_gold_amount, p_gold_amount, p_price, v_hold, v_key, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.fx_post_offer(text, text, bigint, bigint, uuid, boolean) is
  'Offers to sell or buy GOLD for a national currency at a price per GOLD; the funds are locked at once.';
grant execute on function public.fx_post_offer(text, text, bigint, bigint, uuid, boolean) to authenticated;

-- Takes part of an offer at its price. Taking a sell_gold offer pays currency and receives GOLD; taking a buy_gold
-- offer pays GOLD and receives currency. The currency side is floor(gold × price / 100). Returns the currency amount.
create function public.fx_take(p_offer_id bigint, p_gold_amount bigint, p_key uuid, p_central_bank boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'fx_take:' || auth.uid()::text || ':' || p_key::text;
  v_user uuid := case when coalesce(p_central_bank, false) then null else v_citizen.user_id end;
  v_bank text := case when coalesce(p_central_bank, false) then v_citizen.country_code end;
  v_offer game.fx_offers;
  v_pair text;
  v_currency_amount bigint;
  v_done bigint;
begin
  select currency_code into v_pair from game.fx_offers where id = p_offer_id;
  perform game.lock_fx_book(coalesce(v_pair, ''));
  select currency_amount into v_done from game.fx_trades where idempotency_key = v_key;
  if found then
    return v_done;
  end if;
  if v_bank is not null then
    perform game.require_governor(v_citizen);
  end if;
  select * into v_offer from game.fx_offers where id = p_offer_id for update;
  if not found or v_offer.closed_at is not null then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if v_offer.user_id is not distinct from v_user and v_offer.central_bank_country_code is not distinct from v_bank then
    raise exception 'own_offer' using errcode = '22023';
  end if;
  if p_gold_amount is null or p_gold_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_gold_amount > v_offer.gold_amount then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;
  v_currency_amount := p_gold_amount * v_offer.price / 100;
  if v_currency_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;

  if v_offer.side = 'sell_gold' then
    -- The taker pays the currency to the maker; the maker's locked GOLD goes to the taker.
    perform game.post('fx_trade', v_key || ':pay', v_citizen.user_id, array[row(
      game.fx_owner_account(v_user, v_bank, v_offer.currency_code),
      game.fx_owner_account(v_offer.user_id, v_offer.central_bank_country_code, v_offer.currency_code),
      v_currency_amount, 'fx_trade', null)::game.ledger_leg]);
    perform game.capture_hold(v_offer.hold_id, array[row(null, game.fx_owner_account(v_user, v_bank, 'GOLD'),
                              p_gold_amount, 'fx_trade', null)::game.ledger_leg], v_key || ':capture', v_citizen.user_id);
  else
    -- The taker pays GOLD to the maker; the maker's locked currency goes to the taker.
    perform game.post('fx_trade', v_key || ':pay', v_citizen.user_id, array[row(
      game.fx_owner_account(v_user, v_bank, 'GOLD'),
      game.fx_owner_account(v_offer.user_id, v_offer.central_bank_country_code, 'GOLD'),
      p_gold_amount, 'fx_trade', null)::game.ledger_leg]);
    perform game.capture_hold(v_offer.hold_id, array[row(null, game.fx_owner_account(v_user, v_bank, v_offer.currency_code),
                              v_currency_amount, 'fx_trade', null)::game.ledger_leg], v_key || ':capture', v_citizen.user_id);
  end if;

  update game.fx_offers
  set gold_amount = gold_amount - p_gold_amount,
      status = case when gold_amount - p_gold_amount = 0 then 'filled' else 'partial' end,
      closed_at = case when gold_amount - p_gold_amount = 0 then game.now() end
  where id = v_offer.id;
  -- A filled buy_gold offer returns what rounding left in its hold.
  if v_offer.gold_amount = p_gold_amount
     and (select status from game.ledger_holds where id = v_offer.hold_id) = 'open' then
    perform game.release_hold(v_offer.hold_id, v_key || ':rest');
  end if;
  insert into game.fx_trades (offer_id, taker_user_id, taker_central_bank_country_code, gold_amount, currency_amount, price,
                              idempotency_key, created_at)
  values (v_offer.id, v_citizen.user_id, v_bank, p_gold_amount, v_currency_amount, v_offer.price, v_key, game.now());
  return v_currency_amount;
end;
$$;
comment on function public.fx_take(bigint, bigint, uuid, boolean) is
  'Takes part or all of an FX offer at its price; returns the amount of national currency exchanged.';
grant execute on function public.fx_take(bigint, bigint, uuid, boolean) to authenticated;

create function public.fx_cancel(p_offer_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_offer game.fx_offers;
begin
  select * into v_offer from game.fx_offers where id = p_offer_id for update;
  if not found or v_offer.closed_at is not null then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if v_offer.user_id is not null then
    if v_offer.user_id <> v_citizen.user_id then
      raise exception 'offer_not_found' using errcode = 'P0002';
    end if;
  else
    if v_offer.central_bank_country_code <> v_citizen.country_code then
      raise exception 'offer_not_found' using errcode = 'P0002';
    end if;
    perform game.require_governor(v_citizen);
  end if;
  perform game.release_hold(v_offer.hold_id, 'fx_cancel:' || v_offer.id::text);
  update game.fx_offers set status = 'cancelled', closed_at = game.now() where id = v_offer.id;
end;
$$;
comment on function public.fx_cancel(bigint) is 'Withdraws an FX offer and returns what it still locked.';
grant execute on function public.fx_cancel(bigint) to authenticated;

-- The Central Bank's transfers ---------------------------------------------------------------------------------------

create function public.central_bank_to_treasury(p_currency text, p_amount bigint, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  perform game.require_governor(v_citizen);
  if p_currency is null or not exists (select 1 from game.currencies where code = p_currency) then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  return game.post(
    'central_bank_transfer', 'cb_treasury:' || v_citizen.user_id::text || ':' || coalesce(p_key::text, gen_random_uuid()::text),
    v_citizen.user_id,
    array[row(game.central_bank_account(v_citizen.country_code, p_currency),
              game.treasury_account(v_citizen.country_code, p_currency), p_amount, 'central_bank_transfer', null)::game.ledger_leg]
  );
end;
$$;
comment on function public.central_bank_to_treasury(text, bigint, uuid) is
  'The governor sends GOLD or any currency the Central Bank holds to the Treasury, with no minimum.';
grant execute on function public.central_bank_to_treasury(text, bigint, uuid) to authenticated;

create table game.cb_authorizations (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  company_id bigint not null references game.companies (id),
  currency_code text not null references game.currencies (code),
  amount bigint not null check (amount > 0),
  authorized_by uuid not null references game.citizens (user_id) on delete cascade,
  created_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'executed', 'cancelled')),
  executed_by uuid references game.citizens (user_id) on delete set null,
  transaction_id bigint references game.ledger_transactions (id),
  closed_at timestamptz,
  constraint cb_authorizations_closed check ((status = 'open') = (closed_at is null))
);
alter table game.cb_authorizations enable row level security;
comment on table game.cb_authorizations is
  'Single-use authorizations of the Economy minister for one Central Bank transfer to one company in the country.';
create index cb_authorizations_country_idx on game.cb_authorizations (country_code, created_at);
create index cb_authorizations_company_idx on game.cb_authorizations (company_id);
create index cb_authorizations_authorized_by_idx on game.cb_authorizations (authorized_by);
create index cb_authorizations_executed_by_idx on game.cb_authorizations (executed_by) where executed_by is not null;
create index cb_authorizations_transaction_idx on game.cb_authorizations (transaction_id) where transaction_id is not null;

create function public.authorize_cb_transfer(p_company_name text, p_currency text, p_amount bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_company bigint;
  v_id bigint;
begin
  if not game.holds_office(v_citizen.user_id, v_citizen.country_code, array['minister_economy']) then
    raise exception 'not_minister' using errcode = '42501';
  end if;
  select id into v_company from game.companies
  where lower(name) = lower(btrim(coalesce(p_company_name, ''))) and country_code = v_citizen.country_code;
  if v_company is null then
    raise exception 'recipient_invalid' using errcode = '22023';
  end if;
  if p_currency is null or not exists (select 1 from game.currencies where code = p_currency) then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  insert into game.cb_authorizations (country_code, company_id, currency_code, amount, authorized_by, created_at)
  values (v_citizen.country_code, v_company, p_currency, p_amount, v_citizen.user_id, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.authorize_cb_transfer(text, text, bigint) is
  'The Economy minister authorizes one Central Bank transfer of an amount and currency to a company in the country, by name.';
grant execute on function public.authorize_cb_transfer(text, text, bigint) to authenticated;

create function public.cancel_cb_authorization(p_authorization_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_a game.cb_authorizations;
begin
  if not game.holds_office(v_citizen.user_id, v_citizen.country_code, array['minister_economy']) then
    raise exception 'not_minister' using errcode = '42501';
  end if;
  select * into v_a from game.cb_authorizations where id = p_authorization_id for update;
  if not found or v_a.country_code <> v_citizen.country_code then
    raise exception 'authorization_not_found' using errcode = 'P0002';
  end if;
  if v_a.status <> 'open' then
    raise exception 'authorization_closed' using errcode = '22023';
  end if;
  update game.cb_authorizations set status = 'cancelled', closed_at = game.now() where id = v_a.id;
end;
$$;
comment on function public.cancel_cb_authorization(bigint) is 'The Economy minister withdraws an unused authorization.';
grant execute on function public.cancel_cb_authorization(bigint) to authenticated;

create function public.execute_cb_transfer(p_authorization_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_a game.cb_authorizations;
  v_tx bigint;
begin
  perform game.require_governor(v_citizen);
  select * into v_a from game.cb_authorizations where id = p_authorization_id for update;
  if not found or v_a.country_code <> v_citizen.country_code then
    raise exception 'authorization_not_found' using errcode = 'P0002';
  end if;
  if v_a.status <> 'open' then
    raise exception 'authorization_closed' using errcode = '22023';
  end if;
  v_tx := game.post(
    'central_bank_transfer', 'cb_authorization:' || v_a.id::text, v_citizen.user_id,
    array[row(game.central_bank_account(v_a.country_code, v_a.currency_code), game.company_account(v_a.company_id, v_a.currency_code),
              v_a.amount, 'central_bank_transfer', 'authorization ' || v_a.id::text)::game.ledger_leg]
  );
  update game.cb_authorizations
  set status = 'executed', executed_by = v_citizen.user_id, transaction_id = v_tx, closed_at = game.now()
  where id = v_a.id;
  return v_tx;
end;
$$;
comment on function public.execute_cb_transfer(bigint) is
  'The governor executes an authorization once: the Central Bank pays the company the authorized amount.';
grant execute on function public.execute_cb_transfer(bigint) to authenticated;

-- Reads ------------------------------------------------------------------------------------------------------------

create function public.fx_book(p_currency text)
returns table (
  offer_id bigint, side text, owner_name text, is_central_bank boolean, gold_amount bigint, price bigint, mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.side, coalesce(c.name, o.central_bank_country_code), o.central_bank_country_code is not null,
         o.gold_amount, o.price, o.user_id is not distinct from auth.uid()
  from game.fx_offers as o
  left join game.citizens as c on c.user_id = o.user_id
  where o.currency_code = p_currency and o.closed_at is null
  order by o.side, case when o.side = 'sell_gold' then o.price else -o.price end, o.id
  limit 100;
$$;
comment on function public.fx_book(text) is
  'Open offers of a <currency>/GOLD pair: GOLD for sale cheapest first, GOLD wanted dearest first.';
grant execute on function public.fx_book(text) to anon, authenticated;

create function public.fx_summary()
returns table (currency_code text, best_sell bigint, best_buy bigint, last_price bigint, volume_24h bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select cur.code,
         (select min(price) from game.fx_offers where currency_code = cur.code and side = 'sell_gold' and closed_at is null),
         (select max(price) from game.fx_offers where currency_code = cur.code and side = 'buy_gold' and closed_at is null),
         (select t.price from game.fx_trades as t join game.fx_offers as o on o.id = t.offer_id
          where o.currency_code = cur.code order by t.id desc limit 1),
         coalesce((select sum(t.gold_amount)::bigint from game.fx_trades as t join game.fx_offers as o on o.id = t.offer_id
                   where o.currency_code = cur.code and t.created_at > game.now() - interval '24 hours'), 0)
  from game.currencies as cur
  join game.countries as co on co.code = cur.country_code and co.is_active
  order by cur.code;
$$;
comment on function public.fx_summary() is 'For each currency in play: best prices of both sides, the last trade and 24-hour volume.';
grant execute on function public.fx_summary() to anon, authenticated;

create function public.list_my_fx_offers(p_central_bank boolean default false)
returns table (
  offer_id bigint, currency_code text, side text, gold_amount bigint, initial_gold_amount bigint, price bigint,
  status text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.currency_code, o.side, o.gold_amount, o.initial_gold_amount, o.price, o.status, o.created_at
  from game.fx_offers as o
  join game.citizens as c on c.user_id = auth.uid()
  where o.closed_at is null
    and case when coalesce(p_central_bank, false)
             then o.central_bank_country_code = c.country_code
                  and game.holds_office(c.user_id, c.country_code, array['central_bank_governor'])
             else o.user_id = c.user_id end
  order by o.created_at desc;
$$;
comment on function public.list_my_fx_offers(boolean) is 'The player''s open FX offers, or the Central Bank''s for its governor.';
grant execute on function public.list_my_fx_offers(boolean) to authenticated;

create function public.list_cb_authorizations(p_country_code text)
returns table (
  authorization_id bigint, company_id bigint, company_name text, currency_code text, amount bigint,
  authorized_by_name text, created_at timestamptz, status text, executed_by_name text, closed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.company_id, co.name, a.currency_code, a.amount, m.name, a.created_at, a.status, g.name, a.closed_at
  from game.cb_authorizations as a
  join game.companies as co on co.id = a.company_id
  join game.citizens as m on m.user_id = a.authorized_by
  left join game.citizens as g on g.user_id = a.executed_by
  where a.country_code = p_country_code
  order by a.status <> 'open', a.created_at desc
  limit 30;
$$;
comment on function public.list_cb_authorizations(text) is 'Authorizations for Central Bank transfers to companies: public.';
grant execute on function public.list_cb_authorizations(text) to anon, authenticated;

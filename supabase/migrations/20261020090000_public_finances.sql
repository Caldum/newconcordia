-- G5 · Treasury and ministry accounts, allocations by law, currency issuance by law, ministerial spending and the
-- public audit of institutional money (spec sections 3 and 4, ADR 0028).
--
-- game.accounts            new kinds: ministry (country and ministry) and central_bank (country, used by G6)
-- Bill kinds               ministry_allocation (GOLD and national currency from the Treasury to one ministry, each
--                          locked from presentation) and currency_issuance (national currency minted into the
--                          Treasury); mint reason currency_issuance (law)
-- public.ministry_pay      a minister pays from their ministry to a national or a company located in the country
-- public.ministry_buy      a minister buys goods of their competence on the national market into the ministry's
--                          inventory: Health medical kits, Defense weapons and food, Development raw materials
-- game.settle_trade        the trade settlement of R6, now for any paying account and receiving holder
-- public.get_public_finances, list_public_movements  balances and every movement of the Treasury and ministries,
--                          with who ordered it: public
-- public.get_ministry_stock  a ministry's inventory, for its minister and the president only
-- A vacant ministry cannot spend; funds and goods stay with the institution when its minister changes.
--
-- Errors (ADR 0005): not_minister, competence_invalid, recipient_invalid, concept_invalid, amount_invalid,
-- currency_invalid, insufficient_funds, offer_not_found, quantity_unavailable, market_invalid, bill_terms_invalid.
--
-- Rollback: drop the public functions created here, game.settle_trade, game.ministry_account,
-- game.central_bank_account, game.holder_for_ministry, game.bill_spending, game.require_minister and
-- game.account_label; restore game.execute_trade from 20261014110000, and game.bill_terms, game.execute_bill and
-- public.propose_bill from 20261019090000; restore the bills kind check, the accounts checks of 20261016090000 and
-- drop accounts.ministry and market_trades.buyer_ministry once unused; delete the mint reason added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.mint_reasons (kind, authority, description) values
  ('currency_issuance', 'law', 'National currency issued into the Treasury by a law of Congress.');

-- Institutional accounts ------------------------------------------------------------------------------------------

alter table game.accounts add column ministry text
  check (ministry in ('economy', 'defense', 'foreign_affairs', 'health', 'development'));
-- Both checks are replaced right below, in the same transaction, by wider ones that admit institutional accounts.
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_kind_check
  check (kind in ('citizen', 'treasury', 'issuer', 'sink', 'company', 'escrow', 'party', 'ministry', 'central_bank'));
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_owner_matches_kind;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_owner_matches_kind check (
  case kind
    when 'citizen' then user_id is not null and country_code is null and company_id is null and party_id is null and ministry is null
    when 'treasury' then user_id is null and country_code is not null and company_id is null and party_id is null and ministry is null
    when 'company' then user_id is null and country_code is null and company_id is not null and party_id is null and ministry is null
    when 'party' then user_id is null and country_code is null and company_id is null and party_id is not null and ministry is null
    when 'ministry' then user_id is null and country_code is not null and company_id is null and party_id is null and ministry is not null
    when 'central_bank' then user_id is null and country_code is not null and company_id is null and party_id is null and ministry is null
    else user_id is null and country_code is null and company_id is null and party_id is null and ministry is null
  end
);
-- squawk-ignore require-concurrent-index-creation
create unique index accounts_ministry_key on game.accounts (country_code, ministry, currency_code) where kind = 'ministry';
-- squawk-ignore require-concurrent-index-creation
create unique index accounts_central_bank_key on game.accounts (country_code, currency_code) where kind = 'central_bank';
comment on column game.accounts.kind is
  'citizen, treasury, ministry, central_bank, company, party, escrow (one per hold), issuer or sink.';

create function game.ministry_account(p_country_code text, p_ministry text, p_currency text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.accounts (currency_code, kind, country_code, ministry)
  values (p_currency, 'ministry', p_country_code, p_ministry)
  on conflict (country_code, ministry, currency_code) where kind = 'ministry' do nothing;
  select id into v_id from game.accounts
  where kind = 'ministry' and country_code = p_country_code and ministry = p_ministry and currency_code = p_currency;
  return v_id;
end;
$$;
comment on function game.ministry_account(text, text, text) is 'A ministry''s institutional account in a currency, opened on first use.';

create function game.central_bank_account(p_country_code text, p_currency text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.accounts (currency_code, kind, country_code)
  values (p_currency, 'central_bank', p_country_code)
  on conflict (country_code, currency_code) where kind = 'central_bank' do nothing;
  select id into v_id from game.accounts where kind = 'central_bank' and country_code = p_country_code and currency_code = p_currency;
  return v_id;
end;
$$;
comment on function game.central_bank_account(text, text) is 'The Central Bank''s account in a currency, opened on first use.';

create function game.holder_for_ministry(p_country_code text, p_ministry text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.holders (kind, country_code, ministry, created_at) values ('ministry', p_country_code, p_ministry, game.now())
  on conflict (country_code, ministry) where kind = 'ministry' do nothing;
  select id into v_id from game.holders where kind = 'ministry' and country_code = p_country_code and ministry = p_ministry;
  return v_id;
end;
$$;
comment on function game.holder_for_ministry(text, text) is 'A ministry''s inventory holder, created on first use.';

-- Bills: allocations to ministries and currency issuance ----------------------------------------------------------

-- Replaced right below, in the same transaction, by the kinds of G5.
-- squawk-ignore ban-drop-constraint
alter table game.bills drop constraint bills_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.bills add constraint bills_kind_check
  check (kind in ('ordinary', 'taxes', 'gold_transfer', 'ministry_allocation', 'currency_issuance'));

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
    when 'ministry_allocation' then
      if coalesce(v_terms ->> 'ministry', '') not in ('economy', 'defense', 'foreign_affairs', 'health', 'development')
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
      return jsonb_build_object('ministry', v_terms ->> 'ministry', 'gold', v_gold::bigint, 'credit', v_credit::bigint);
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

-- What a bill would spend from the Treasury, per currency: locked when it is presented.
create function game.bill_spending(p_country_code text, p_kind text, p_terms jsonb)
returns table (currency_code text, amount bigint)
language sql
immutable
set search_path = ''
as $$
  select s.currency_code, s.amount
  from (values
    ('GOLD', case p_kind when 'gold_transfer' then (p_terms ->> 'amount')::bigint
                         when 'ministry_allocation' then (p_terms ->> 'gold')::bigint end),
    (p_country_code, case p_kind when 'ministry_allocation' then (p_terms ->> 'credit')::bigint end)
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
    when 'ministry_allocation' then
      for v_reservation in
        select r.hold_id, h.currency_code, h.amount
        from game.bill_reservations as r join game.ledger_holds as h on h.id = r.hold_id
        where r.bill_id = p_bill.id
        order by r.hold_id
      loop
        perform game.capture_hold(
          v_reservation.hold_id,
          array[row(null, game.ministry_account(p_bill.country_code, p_bill.terms ->> 'ministry', v_reservation.currency_code),
                    v_reservation.amount, 'ministry_allocation', p_bill.title)::game.ledger_leg],
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

create or replace function public.propose_bill(p_kind text, p_title text, p_body text, p_terms jsonb, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_initiative record;
  v_terms jsonb;
  v_id bigint;
  v_spend record;
  v_hold bigint;
begin
  if p_key is not null then
    select id into v_id from game.bills where idempotency_key = p_key;
    if found then
      return v_id;
    end if;
  end if;
  select * into v_initiative from game.initiative(v_citizen.user_id);
  if v_initiative.office is null or v_initiative.allowed = 0 then
    raise exception 'no_initiative' using errcode = '42501';
  end if;
  if v_initiative.allowed is not null then
    -- Serializes the proposals of one mandate so the allowance cannot be exceeded under concurrency.
    perform 1 from game.mandates where id = v_initiative.mandate_id for update;
    if (select count(*) from game.bills where mandate_id = v_initiative.mandate_id) >= v_initiative.allowed then
      raise exception 'initiative_exhausted' using errcode = '22023';
    end if;
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 120 or char_length(coalesce(p_body, '')) > 4000 then
    raise exception 'bill_title_invalid' using errcode = '22023';
  end if;
  v_terms := game.bill_terms(v_citizen.country_code, p_kind, p_terms);

  insert into game.bills (country_code, kind, title, body, terms, majority, proposed_by, proposer_office, mandate_id,
                          members, opened_at, closes_at, idempotency_key)
  values (v_citizen.country_code, p_kind, btrim(p_title), coalesce(btrim(p_body), ''), v_terms, 'simple',
          v_citizen.user_id, v_initiative.office, v_initiative.mandate_id,
          (select count(*)::integer from game.mandates
           where country_code = v_citizen.country_code and office = 'congress' and ended_at is null),
          game.now(), game.now() + make_interval(hours => game.param('bill_vote_hours')::integer), p_key)
  returning id into v_id;

  -- Every unit the bill would spend is locked now, per currency, from the Treasury.
  for v_spend in select * from game.bill_spending(v_citizen.country_code, p_kind, v_terms) loop
    v_hold := game.hold(game.treasury_account(v_citizen.country_code, v_spend.currency_code), v_spend.amount,
                        'bill', 'bill:' || v_id::text, 'bill_hold:' || v_id::text || ':' || v_spend.currency_code,
                        v_citizen.user_id);
    insert into game.bill_reservations (bill_id, hold_id) values (v_id, v_hold);
  end loop;
  return v_id;
end;
$$;

-- Market settlement for any payer ------------------------------------------------------------------------------

alter table game.market_trades add column buyer_ministry text
  check (buyer_ministry in ('economy', 'defense', 'foreign_affairs', 'health', 'development'));
comment on column game.market_trades.buyer_ministry is 'The ministry that bought (its minister is buyer_user_id).';

-- Settles units of an offer: the paying account covers price, VAT, tariff, fee and export tax; the goods go to the
-- receiving holder. Shared by citizens, their companies and ministries.
create function game.settle_trade(
  p_offer_id bigint,
  p_quantity integer,
  p_payer_account bigint,
  p_receiver_holder bigint,
  p_actor uuid,
  p_ministry text,
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
    row(p_payer_account, case when v_offer.seller_company_id is null
                              then game.citizen_account(v_offer.seller_user_id, v_currency)
                              else game.company_account(v_offer.seller_company_id, v_currency) end,
        v_gross - v_vat - v_fee - v_export, 'market_sale', null)::game.ledger_leg,
    row(p_payer_account, game.treasury_account(v_offer.market_country_code, v_currency), v_vat + v_tariff,
        'market_tax', null)::game.ledger_leg,
    row(p_payer_account, game.system_account('sink', v_currency), v_fee, 'market_fee', null)::game.ledger_leg,
    row(p_payer_account, game.treasury_account(v_offer.origin_country_code, v_currency), v_export, 'export_tax',
        null)::game.ledger_leg
  ]) as leg
  where leg.amount > 0;
  perform game.post('market_purchase', p_key, p_actor, v_legs);

  update game.market_offers
  set quantity = quantity - p_quantity,
      status = case when quantity - p_quantity = 0 then 'filled' else 'partial' end,
      closed_at = case when quantity - p_quantity = 0 then game.now() end
  where id = p_offer_id;
  perform game.put_goods(p_receiver_holder, v_offer.good_code, v_offer.origin_country_code, p_quantity,
                         'market_purchase', 'offer:' || v_offer.id::text);
  insert into game.market_trades (offer_id, buyer_user_id, buyer_ministry, quantity, price, gross, vat, tariff, fee,
                                  export_tax, idempotency_key, created_at)
  values (p_offer_id, p_actor, p_ministry, p_quantity, v_offer.price, v_gross, v_vat, v_tariff, v_fee, v_export, p_key,
          game.now());
  return v_gross + v_tariff;
end;
$$;
comment on function game.settle_trade(bigint, integer, bigint, bigint, uuid, text, text) is
  'Settles units of an offer at its price with VAT, tariff, fee and export tax. Returns what the payer paid.';

create or replace function game.execute_trade(
  p_offer_id bigint,
  p_quantity integer,
  p_buyer_user_id uuid,
  p_buyer_company_id bigint,
  p_key text
)
returns bigint
language sql
set search_path = ''
as $$
  select game.settle_trade(
    p_offer_id, p_quantity,
    game.citizen_account(p_buyer_user_id, (select market_country_code from game.market_offers where id = p_offer_id)),
    case when p_buyer_company_id is null then game.holder_for_citizen(p_buyer_user_id)
         else game.holder_for_company(p_buyer_company_id) end,
    p_buyer_user_id, null, p_key
  );
$$;

-- Ministerial spending ------------------------------------------------------------------------------------------

-- The ministry the citizen leads; a vacant ministry has nobody to act for it.
create function game.require_minister(p_citizen game.citizens)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_office text := (select office from game.offices where user_id = p_citizen.user_id and country_code = p_citizen.country_code);
begin
  if v_office is null or v_office not like 'minister_%' then
    raise exception 'not_minister' using errcode = '42501';
  end if;
  return substr(v_office, length('minister_') + 1);
end;
$$;

-- Pays from the minister's ministry to a national (by name) or a company located in the country. Public: the
-- ledger keeps amount, currency, destination, concept, who ordered it and when.
create function public.ministry_pay(
  p_currency text,
  p_amount bigint,
  p_concept text,
  p_key uuid,
  p_citizen_name text default null,
  p_company_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_ministry text := game.require_minister(v_citizen);
  v_to bigint;
  v_user uuid;
begin
  if p_currency is null or p_currency not in ('GOLD', v_citizen.country_code) then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if p_concept is null or char_length(btrim(p_concept)) not between 3 and 120 then
    raise exception 'concept_invalid' using errcode = '22023';
  end if;
  if (p_citizen_name is null) = (p_company_id is null) then
    raise exception 'recipient_invalid' using errcode = '22023';
  end if;
  if p_company_id is not null then
    if not exists (select 1 from game.companies where id = p_company_id and country_code = v_citizen.country_code) then
      raise exception 'recipient_invalid' using errcode = '22023';
    end if;
    v_to := game.company_account(p_company_id, p_currency);
  else
    select user_id into v_user from game.citizens
    where lower(name) = lower(btrim(p_citizen_name)) and country_code = v_citizen.country_code;
    if v_user is null then
      raise exception 'recipient_invalid' using errcode = '22023';
    end if;
    v_to := game.citizen_account(v_user, p_currency);
  end if;
  return game.post(
    'ministry_payment', 'ministry_pay:' || v_citizen.user_id::text || ':' || coalesce(p_key::text, gen_random_uuid()::text),
    v_citizen.user_id,
    array[row(game.ministry_account(v_citizen.country_code, v_ministry, p_currency), v_to, p_amount, 'ministry_payment',
              btrim(p_concept))::game.ledger_leg]
  );
end;
$$;
comment on function public.ministry_pay(text, bigint, text, uuid, text, bigint) is
  'A minister pays from their ministry to a national or a company in the country, with a public concept.';
grant execute on function public.ministry_pay(text, bigint, text, uuid, text, bigint) to authenticated;

-- Buys goods of the ministry's competence on the national market, paid by the ministry, into its inventory.
create function public.ministry_buy(p_offer_id bigint, p_quantity integer, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_ministry text := game.require_minister(v_citizen);
  v_key text := 'ministry_buy:' || auth.uid()::text || ':' || p_key::text;
  v_offer game.market_offers;
  v_good game.goods;
  v_allowed boolean;
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
  if v_offer.market_country_code <> v_citizen.country_code then
    raise exception 'market_invalid' using errcode = '22023';
  end if;
  select * into v_good from game.goods where code = v_offer.good_code;
  v_allowed := case v_ministry
    when 'health' then v_good.category = 'medical'
    when 'defense' then v_good.category in ('military', 'food')
    when 'development' then v_good.kind = 'raw'
    else false
  end;
  if not coalesce(v_allowed, false) then
    raise exception 'competence_invalid' using errcode = '22023';
  end if;
  if v_offer.quantity < p_quantity then
    raise exception 'quantity_unavailable' using errcode = '22023';
  end if;
  return game.settle_trade(p_offer_id, p_quantity,
                           game.ministry_account(v_citizen.country_code, v_ministry, v_citizen.country_code),
                           game.holder_for_ministry(v_citizen.country_code, v_ministry), v_citizen.user_id, v_ministry,
                           v_key);
end;
$$;
comment on function public.ministry_buy(bigint, integer, uuid) is
  'A minister buys goods of their competence on the national market for the ministry: Health kits, Defense weapons and food, Development raw materials.';
grant execute on function public.ministry_buy(bigint, integer, uuid) to authenticated;

-- Reads -----------------------------------------------------------------------------------------------------------

-- Free and locked balances of the Treasury, each ministry and the Central Bank, in GOLD and the national currency.
create function public.get_public_finances(p_country_code text)
returns table (institution text, currency_code text, balance bigint, held bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.institution, cur.code,
         coalesce(a.balance, 0),
         coalesce((select sum(e.balance)::bigint from game.ledger_holds as h
                   join game.accounts as e on e.id = h.escrow_account_id
                   where h.owner_account_id = a.id and h.status = 'open'), 0)
  from (values ('treasury', 1), ('economy', 2), ('defense', 3), ('foreign_affairs', 4), ('health', 5),
               ('development', 6), ('central_bank', 7)) as i (institution, position)
  cross join (values ('GOLD', 1), (p_country_code, 2)) as cur (code, position)
  left join game.accounts as a
    on a.country_code = p_country_code and a.currency_code = cur.code
   and ((i.institution = 'treasury' and a.kind = 'treasury')
     or (i.institution = 'central_bank' and a.kind = 'central_bank')
     or (a.kind = 'ministry' and a.ministry = i.institution))
  where exists (select 1 from game.countries where code = p_country_code)
  order by i.position, cur.position;
$$;
comment on function public.get_public_finances(text) is 'Public balances of a country''s Treasury, ministries and Central Bank.';
grant execute on function public.get_public_finances(text) to anon, authenticated;

-- Who or what an account is, for public statements.
create function game.account_label(p_account game.accounts)
returns text
language sql
stable
set search_path = ''
as $$
  select case p_account.kind
    when 'citizen' then (select name from game.citizens where user_id = p_account.user_id)
    when 'company' then (select name from game.companies where id = p_account.company_id)
    when 'party' then (select name from game.parties where id = p_account.party_id)
    when 'treasury' then p_account.country_code
    when 'ministry' then p_account.country_code || ':' || p_account.ministry
    when 'central_bank' then p_account.country_code
    else null
  end;
$$;

-- Every movement of the country's Treasury, ministries and Central Bank: amount, currency, destination or origin,
-- concept, who ordered it and when. Public.
create function public.list_public_movements(p_country_code text, p_before bigint default null)
returns table (
  posting_id bigint, created_at timestamptz, institution text, kind text, memo text, currency_code text, amount bigint,
  counterparty_kind text, counterparty_name text, ordered_by text
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.id, case a.kind when 'ministry' then a.ministry else a.kind end as institution
    from game.accounts as a
    where a.country_code = p_country_code and a.kind in ('treasury', 'ministry', 'central_bank')
  )
  select p.id, p.created_at, m.institution, p.kind, p.memo, p.currency_code,
         case when p.credit_account_id = m.id then p.amount else -p.amount end,
         other.kind, game.account_label(other), actor.name
  from game.ledger_postings as p
  join mine as m on m.id in (p.debit_account_id, p.credit_account_id)
  join game.accounts as other on other.id = case when p.credit_account_id = m.id then p.debit_account_id else p.credit_account_id end
  join game.ledger_transactions as t on t.id = p.transaction_id
  left join game.citizens as actor on actor.user_id = t.actor_user_id
  where p_before is null or p.id < p_before
  order by p.id desc
  limit 50;
$$;
comment on function public.list_public_movements(text, bigint) is
  'The public audit of a country''s institutional money: every movement with its concept and who ordered it.';
grant execute on function public.list_public_movements(text, bigint) to anon, authenticated;

-- A ministry's inventory: its minister and the president only (Health's stock is private by specification).
create function public.get_ministry_stock(p_ministry text)
returns table (good_code text, origin_country_code text, quantity numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  if not game.holds_office(v_citizen.user_id, v_citizen.country_code, array['president', 'minister_' || coalesce(p_ministry, '')]) then
    raise exception 'not_minister' using errcode = '42501';
  end if;
  return query
  select l.good_code, l.origin_country_code, l.quantity
  from game.inventory_lots as l
  join game.holders as h on h.id = l.holder_id
  where h.kind = 'ministry' and h.country_code = v_citizen.country_code and h.ministry = p_ministry and l.quantity > 0
  order by l.good_code, l.origin_country_code;
end;
$$;
comment on function public.get_ministry_stock(text) is 'A ministry''s goods, visible to its minister and the president.';
grant execute on function public.get_ministry_stock(text) to authenticated;

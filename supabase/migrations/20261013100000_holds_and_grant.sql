-- R2 · Holds (escrow), mint and burn records, and the sign-up grant (spec sections 0, 1 and 8, ADR 0016).
--
-- game.ledger_holds    money locked for a purpose (buy orders, bills, war authorizations) in an escrow
--                      account of its own, so it cannot be spent elsewhere; captured or released
-- game.hold, game.capture_hold, game.release_hold
-- game.mint_reasons    the only posting kinds an issuer may pay (system rewards now, laws in Stage 2)
-- game.supply_changes  every mint (issuer debit) and burn (sink credit), append-only
-- game.grant_welcome   5 GOLD, 100 of the country's currency and 10 rations (Q1 food), once
-- public.get_my_balances adds `held`; public.list_my_movements names companies and escrows
--
-- Errors (ADR 0005): amount_invalid, currency_invalid, insufficient_funds, hold_not_found, hold_closed,
-- hold_insufficient, hold_leg_invalid, mint_not_authorized.
--
-- Rollback: drop the trigger ledger_postings_supply and its function, game.supply_changes,
-- game.mint_reasons, the three hold functions and game.ledger_holds; delete escrow accounts once empty and
-- restore the accounts_kind_check of 20261009210000; restore game.grant_welcome,
-- public.get_my_balances and public.list_my_movements from 20261009200000; restore welcome_credit to 50
-- and delete welcome_food.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

update game.balance_params
set value = 100, description = 'National currency a new citizen receives (spec section 1).', updated_at = now()
where key = 'welcome_credit';
insert into game.balance_params (key, value, description) values
  ('welcome_food', 10, 'Q1 food (rations) a new citizen receives (spec section 1).');

-- Escrow accounts ---------------------------------------------------------------------------------

-- Replaced right below, in the same transaction, by a wider check that admits escrow accounts.
-- squawk-ignore ban-drop-constraint
alter table game.accounts drop constraint accounts_kind_check;
-- squawk-ignore constraint-missing-not-valid
alter table game.accounts add constraint accounts_kind_check
  check (kind in ('citizen', 'treasury', 'issuer', 'sink', 'company', 'escrow'));
comment on column game.accounts.kind is 'citizen, treasury, company, escrow (one per hold), issuer or sink.';

-- Holds -------------------------------------------------------------------------------------------

create table game.ledger_holds (
  id bigint generated always as identity primary key,
  owner_account_id bigint not null references game.accounts (id),
  escrow_account_id bigint not null unique references game.accounts (id),
  currency_code text not null references game.currencies (code),
  purpose text not null check (purpose ~ '^[a-z][a-z0-9_]{2,40}$'),
  reference text check (char_length(reference) <= 120),
  amount bigint not null check (amount > 0),
  captured bigint not null default 0 check (captured >= 0),
  released bigint not null default 0 check (released >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  idempotency_key text unique check (char_length(idempotency_key) <= 200),
  created_at timestamptz not null,
  closed_at timestamptz,
  constraint ledger_holds_accounted check (captured + released <= amount),
  constraint ledger_holds_closed check ((status = 'closed') = (closed_at is not null))
);
alter table game.ledger_holds enable row level security;
comment on table game.ledger_holds is 'Money locked for a purpose in its own escrow account until captured or released.';

create index ledger_holds_owner_open_idx on game.ledger_holds (owner_account_id) where status = 'open';

create function game.hold(
  p_owner_account_id bigint,
  p_amount bigint,
  p_purpose text,
  p_reference text,
  p_key text,
  p_actor uuid default null
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_hold_id bigint;
  v_currency text;
  v_escrow bigint;
begin
  if p_key is not null then
    select id into v_hold_id from game.ledger_holds where idempotency_key = p_key;
    if found then
      return v_hold_id;
    end if;
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  select currency_code into v_currency from game.accounts where id = p_owner_account_id and kind not in ('issuer', 'sink', 'escrow');
  if v_currency is null then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;

  insert into game.accounts (currency_code, kind) values (v_currency, 'escrow') returning id into v_escrow;
  insert into game.ledger_holds (owner_account_id, escrow_account_id, currency_code, purpose, reference, amount,
                                 idempotency_key, created_at)
  values (p_owner_account_id, v_escrow, v_currency, p_purpose, p_reference, p_amount, p_key, game.now())
  returning id into v_hold_id;

  perform game.post(
    'hold', p_key, p_actor,
    array[row(p_owner_account_id, v_escrow, p_amount, 'hold', null)::game.ledger_leg]
  );
  return v_hold_id;
end;
$$;
comment on function game.hold(bigint, bigint, text, text, text, uuid) is
  'Locks money of an account in a new escrow. Fails with insufficient_funds; a repeated key returns the same hold.';

-- Records a capture or release of `p_amount` on a hold already locked by game.open_hold; closes it when empty.
create function game.settle_hold(p_hold game.ledger_holds, p_amount bigint, p_captured boolean)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_left bigint := (select balance from game.accounts where id = p_hold.escrow_account_id);
begin
  update game.ledger_holds
  set captured = captured + case when p_captured then p_amount else 0 end,
      released = released + case when p_captured then 0 else p_amount end,
      status = case when v_left = 0 then 'closed' else 'open' end,
      closed_at = case when v_left = 0 then game.now() end
  where id = p_hold.id;
  return v_left;
end;
$$;

create function game.open_hold(p_hold_id bigint)
returns game.ledger_holds
language plpgsql
set search_path = ''
as $$
declare
  v_hold game.ledger_holds;
begin
  select * into v_hold from game.ledger_holds where id = p_hold_id for update;
  if not found then
    raise exception 'hold_not_found' using errcode = 'P0002';
  end if;
  if v_hold.status <> 'open' then
    raise exception 'hold_closed' using errcode = '22023';
  end if;
  return v_hold;
end;
$$;

create function game.capture_hold(p_hold_id bigint, p_legs game.ledger_leg[], p_key text, p_actor uuid default null)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_hold game.ledger_holds;
  v_legs game.ledger_leg[];
  v_total bigint;
begin
  if p_key is not null and exists (select 1 from game.ledger_transactions where idempotency_key = p_key) then
    return (select a.balance from game.ledger_holds as h join game.accounts as a on a.id = h.escrow_account_id
            where h.id = p_hold_id);
  end if;
  v_hold := game.open_hold(p_hold_id);
  -- A concurrent call with the same key may have finished while this one waited for the lock.
  if p_key is not null and exists (select 1 from game.ledger_transactions where idempotency_key = p_key) then
    return (select balance from game.accounts where id = v_hold.escrow_account_id);
  end if;
  if coalesce(cardinality(p_legs), 0) = 0
     or exists (select 1 from unnest(p_legs) as l where l.amount is null or l.amount <= 0) then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_legs) as l where l.debit_account_id is not null) then
    raise exception 'hold_leg_invalid' using errcode = '22023';
  end if;
  select sum(l.amount),
         array_agg(row(v_hold.escrow_account_id, l.credit_account_id, l.amount, l.kind, l.memo)::game.ledger_leg)
  into v_total, v_legs
  from unnest(p_legs) as l;
  if v_total > (select balance from game.accounts where id = v_hold.escrow_account_id) then
    raise exception 'hold_insufficient' using errcode = '22023';
  end if;

  perform game.post('hold_capture', p_key, p_actor, v_legs);
  return game.settle_hold(v_hold, v_total, true);
end;
$$;
comment on function game.capture_hold(bigint, game.ledger_leg[], text, uuid) is
  'Pays from a hold to the legs'' credit accounts (debit left null). Partial captures allowed; never beyond the hold.';

create function game.release_hold(p_hold_id bigint, p_key text, p_amount bigint default null, p_actor uuid default null)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_hold game.ledger_holds;
  v_amount bigint;
begin
  if p_key is not null and exists (select 1 from game.ledger_transactions where idempotency_key = p_key) then
    return (select a.balance from game.ledger_holds as h join game.accounts as a on a.id = h.escrow_account_id
            where h.id = p_hold_id);
  end if;
  v_hold := game.open_hold(p_hold_id);
  -- A concurrent call with the same key may have finished while this one waited for the lock.
  if p_key is not null and exists (select 1 from game.ledger_transactions where idempotency_key = p_key) then
    return (select balance from game.accounts where id = v_hold.escrow_account_id);
  end if;
  v_amount := coalesce(p_amount, (select balance from game.accounts where id = v_hold.escrow_account_id));
  if v_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if v_amount > (select balance from game.accounts where id = v_hold.escrow_account_id) then
    raise exception 'hold_insufficient' using errcode = '22023';
  end if;

  perform game.post(
    'hold_release', p_key, p_actor,
    array[row(v_hold.escrow_account_id, v_hold.owner_account_id, v_amount, 'hold_release', null)::game.ledger_leg]
  );
  return game.settle_hold(v_hold, v_amount, false);
end;
$$;
comment on function game.release_hold(bigint, text, bigint, uuid) is
  'Returns held money to its owner: an amount, or everything left. The hold closes when empty.';

-- Mint and burn ---------------------------------------------------------------------------------

create table game.mint_reasons (
  kind text primary key check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  authority text not null check (authority in ('system_reward', 'law')),
  description text not null
);
alter table game.mint_reasons enable row level security;
comment on table game.mint_reasons is 'Posting kinds an issuer may pay: money is created only by law or a system reward.';

insert into game.mint_reasons (kind, authority, description) values
  ('welcome_grant', 'system_reward', 'Sign-up grant, once per account.'),
  ('level_reward', 'system_reward', 'Reward for a new civil level, once per level.');

create table game.supply_changes (
  id bigint generated always as identity primary key,
  posting_id bigint not null unique references game.ledger_postings (id),
  currency_code text not null references game.currencies (code),
  direction text not null check (direction in ('mint', 'burn')),
  amount bigint not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null
);
alter table game.supply_changes enable row level security;
comment on table game.supply_changes is 'Every creation (mint) and destruction (burn) of money. Append-only.';

create index supply_changes_currency_idx on game.supply_changes (currency_code, created_at);

create trigger supply_changes_append_only
before update or delete on game.supply_changes
for each statement execute function game.reject_ledger_change();

create trigger supply_changes_no_truncate
before truncate on game.supply_changes
for each statement execute function game.reject_ledger_change();

create function game.record_supply_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_debit_kind text := (select kind from game.accounts where id = new.debit_account_id);
  v_credit_kind text := (select kind from game.accounts where id = new.credit_account_id);
begin
  if v_debit_kind = 'issuer' then
    if not exists (select 1 from game.mint_reasons where kind = new.kind) then
      raise exception 'mint_not_authorized' using errcode = '42501';
    end if;
    insert into game.supply_changes (posting_id, currency_code, direction, amount, reason, created_at)
    values (new.id, new.currency_code, 'mint', new.amount, new.kind, new.created_at);
  elsif v_credit_kind = 'sink' then
    insert into game.supply_changes (posting_id, currency_code, direction, amount, reason, created_at)
    values (new.id, new.currency_code, 'burn', new.amount, new.kind, new.created_at);
  end if;
  return null;
end;
$$;

create trigger ledger_postings_supply
after insert on game.ledger_postings
for each row execute function game.record_supply_change();

insert into game.supply_changes (posting_id, currency_code, direction, amount, reason, created_at)
select p.id, p.currency_code, case when d.kind = 'issuer' then 'mint' else 'burn' end, p.amount, p.kind, p.created_at
from game.ledger_postings as p
join game.accounts as d on d.id = p.debit_account_id
join game.accounts as c on c.id = p.credit_account_id
where d.kind = 'issuer' or c.kind = 'sink'
order by p.id;

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
  perform game.add_inventory(p_user_id, 'ration', game.param('welcome_food'));
end;
$$;
comment on function game.grant_welcome(uuid) is
  '5 GOLD, 100 of the country''s currency and 10 rations (Q1 food), once per account.';

-- API ---------------------------------------------------------------------------------------------

-- The return type gains `held`, which needs a new function. Only this web calls it.
-- squawk-ignore ban-drop-function
drop function public.get_my_balances();

create function public.get_my_balances()
returns table (currency_code text, country_code text, balance bigint, held bigint)
language sql
stable
security definer
set search_path = ''
as $$
  -- GOLD and the player's country currency always appear; other currencies once held.
  select cur.code, cur.country_code, coalesce(a.balance, 0),
         coalesce((select sum(e.balance)::bigint
                   from game.ledger_holds as h
                   join game.accounts as e on e.id = h.escrow_account_id
                   where h.owner_account_id = a.id and h.status = 'open'), 0)
  from game.citizens as c
  join game.currencies as cur on cur.code in ('GOLD', c.country_code)
    or exists (select 1 from game.accounts as owned
               where owned.kind = 'citizen' and owned.user_id = c.user_id and owned.currency_code = cur.code)
  left join game.accounts as a on a.kind = 'citizen' and a.user_id = c.user_id and a.currency_code = cur.code
  where c.user_id = auth.uid()
  order by cur.code = 'GOLD' desc, cur.code = c.country_code desc, cur.code;
$$;
comment on function public.get_my_balances() is
  'The signed-in player''s free balances and held money in hundredths: GOLD, their currency, others held.';
grant execute on function public.get_my_balances() to authenticated;

create or replace function public.list_my_movements(
  p_currency text default null,
  p_before bigint default null,
  p_limit integer default 50
)
returns table (
  posting_id bigint,
  created_at timestamptz,
  kind text,
  memo text,
  currency_code text,
  amount bigint,
  balance_after bigint,
  counterparty_kind text,
  counterparty_name text,
  counterparty_country_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.id from game.accounts as a where a.kind = 'citizen' and a.user_id = auth.uid()
  )
  select p.id, p.created_at, p.kind, p.memo, p.currency_code,
         case when p.credit_account_id in (select id from mine) then p.amount else -p.amount end,
         case when p.credit_account_id in (select id from mine) then p.credit_balance_after else p.debit_balance_after end,
         other.kind, coalesce(other_citizen.name, other_company.name), other.country_code
  from game.ledger_postings as p
  join game.accounts as other
    on other.id = case when p.credit_account_id in (select id from mine) then p.debit_account_id else p.credit_account_id end
  left join game.citizens as other_citizen on other_citizen.user_id = other.user_id
  left join game.companies as other_company on other_company.id = other.company_id
  where (p.debit_account_id in (select id from mine) or p.credit_account_id in (select id from mine))
    and (p_currency is null or p.currency_code = p_currency)
    and (p_before is null or p.id < p_before)
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

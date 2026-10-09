-- D09 · Ledger and currencies (ADR 0010).
--
-- game.currencies         GOLD and one Credit per country (coded with the country code)
-- game.accounts           one per owner and currency: citizens, treasuries, and per currency an issuer
--                         (negative: money created) and a sink (money that left the game)
-- game.ledger_transactions one per action, with its idempotency key
-- game.ledger_postings    append-only; each row debits one account and credits another for the same amount
-- game.post               the only writer of balances
-- game.grant_welcome      5 Gold and 50 Credit, once per account, after the email is confirmed
-- public.get_my_balances, public.list_my_movements, public.transfer_money
--
-- Errors are stable codes (ADR 0005): amount_invalid, currency_invalid, insufficient_funds,
-- recipient_not_found, recipient_is_sender, memo_too_long, rate_limited, idempotency_key_reused,
-- not_authenticated, no_citizen.
--
-- Rollback: drop the public functions, the two triggers on auth.users and game.citizens created here, the
-- game functions and type, then game.ledger_postings, game.ledger_transactions, game.accounts and
-- game.currencies, and delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('welcome_gold', 5, 'Gold a new citizen receives.'),
  ('welcome_credit', 50, 'Credit of their country a new citizen receives.'),
  ('transfer_max_per_hour', 20, 'Transfers to other players a citizen can send per hour.');

-- Currencies ------------------------------------------------------------------------------------------

create table game.currencies (
  code text primary key check (code ~ '^[A-Z]{3,4}$'),
  country_code text unique references game.countries (code),
  constraint currencies_gold_or_country check ((code = 'GOLD') = (country_code is null)),
  constraint currencies_credit_code check (country_code is null or code = country_code)
);
alter table game.currencies enable row level security;
comment on table game.currencies is 'GOLD, shared by the world, and the Credit of each country.';

insert into game.currencies (code, country_code)
select 'GOLD', null
union all
select code, code from game.countries;

-- Accounts --------------------------------------------------------------------------------------------

create table game.accounts (
  id bigint generated always as identity primary key,
  currency_code text not null references game.currencies (code),
  kind text not null check (kind in ('citizen', 'treasury', 'issuer', 'sink')),
  user_id uuid references game.citizens (user_id) on delete restrict,
  country_code text references game.countries (code),
  balance bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint accounts_owner_matches_kind check (
    case kind
      when 'citizen' then user_id is not null and country_code is null
      when 'treasury' then user_id is null and country_code is not null
      else user_id is null and country_code is null
    end
  ),
  constraint accounts_balance_not_negative check (balance >= 0 or kind = 'issuer'),
  -- Postings reference (id, currency) so both sides of a posting share its currency.
  constraint accounts_id_currency_key unique (id, currency_code)
);
alter table game.accounts enable row level security;
comment on table game.accounts is 'Balances in hundredths. Only game.post changes them.';
comment on column game.accounts.balance is 'Hundredths of the currency. Issuers are negative: everything they created.';

create unique index accounts_citizen_key on game.accounts (user_id, currency_code) where kind = 'citizen';
create unique index accounts_treasury_key on game.accounts (country_code, currency_code) where kind = 'treasury';
create unique index accounts_system_key on game.accounts (kind, currency_code) where kind in ('issuer', 'sink');

insert into game.accounts (currency_code, kind)
select c.code, k.kind
from game.currencies as c
cross join (values ('issuer'), ('sink')) as k (kind);

create function game.citizen_account(p_user_id uuid, p_currency text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.accounts (currency_code, kind, user_id)
  values (p_currency, 'citizen', p_user_id)
  on conflict (user_id, currency_code) where kind = 'citizen' do nothing;
  select id into v_id from game.accounts where kind = 'citizen' and user_id = p_user_id and currency_code = p_currency;
  return v_id;
end;
$$;
comment on function game.citizen_account(uuid, text) is 'The citizen''s account in a currency, opened on first use.';

create function game.treasury_account(p_country_code text, p_currency text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into game.accounts (currency_code, kind, country_code)
  values (p_currency, 'treasury', p_country_code)
  on conflict (country_code, currency_code) where kind = 'treasury' do nothing;
  select id into v_id from game.accounts where kind = 'treasury' and country_code = p_country_code and currency_code = p_currency;
  return v_id;
end;
$$;
comment on function game.treasury_account(text, text) is 'A national treasury''s account in a currency, opened on first use.';

create function game.system_account(p_kind text, p_currency text)
returns bigint
language sql
stable
set search_path = ''
as $$
  select id from game.accounts where kind = p_kind and currency_code = p_currency and kind in ('issuer', 'sink');
$$;
comment on function game.system_account(text, text) is 'The issuer or the sink of a currency.';

-- Postings --------------------------------------------------------------------------------------------

create table game.ledger_transactions (
  id bigint generated always as identity primary key,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  idempotency_key text unique check (char_length(idempotency_key) <= 200),
  actor_user_id uuid references auth.users (id) on delete set null,
  -- What the actor asked for, to refuse the same key with a different request.
  request jsonb,
  created_at timestamptz not null
);
alter table game.ledger_transactions enable row level security;
comment on table game.ledger_transactions is 'One per action; groups its postings.';

create index ledger_transactions_actor_idx on game.ledger_transactions (actor_user_id, kind, created_at);

create table game.ledger_postings (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references game.ledger_transactions (id),
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  memo text check (char_length(memo) <= 80),
  currency_code text not null references game.currencies (code),
  debit_account_id bigint not null,
  credit_account_id bigint not null,
  amount bigint not null check (amount > 0),
  debit_balance_after bigint not null,
  credit_balance_after bigint not null,
  created_at timestamptz not null,
  constraint ledger_postings_two_accounts check (debit_account_id <> credit_account_id),
  constraint ledger_postings_debit_fk foreign key (debit_account_id, currency_code)
    references game.accounts (id, currency_code),
  constraint ledger_postings_credit_fk foreign key (credit_account_id, currency_code)
    references game.accounts (id, currency_code)
);
alter table game.ledger_postings enable row level security;
comment on table game.ledger_postings is 'Append-only. Each row moves amount from the debit account to the credit account.';

create index ledger_postings_debit_idx on game.ledger_postings (debit_account_id, id);
create index ledger_postings_credit_idx on game.ledger_postings (credit_account_id, id);
create index ledger_postings_transaction_idx on game.ledger_postings (transaction_id);

create function game.reject_ledger_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'the ledger is append-only' using errcode = '42501';
end;
$$;

create trigger ledger_postings_append_only
before update or delete on game.ledger_postings
for each statement execute function game.reject_ledger_change();

create trigger ledger_transactions_append_only
before update or delete on game.ledger_transactions
for each statement execute function game.reject_ledger_change();

create trigger ledger_postings_no_truncate
before truncate on game.ledger_postings
for each statement execute function game.reject_ledger_change();

create trigger ledger_transactions_no_truncate
before truncate on game.ledger_transactions
for each statement execute function game.reject_ledger_change();

-- One leg of a transaction: amount moves from the debit account to the credit account.
create type game.ledger_leg as (
  debit_account_id bigint,
  credit_account_id bigint,
  amount bigint,
  kind text,
  memo text
);

-- Posts the legs of one action. With a key already used, returns that transaction and posts nothing.
create function game.post(p_kind text, p_key text, p_actor uuid, p_legs game.ledger_leg[], p_request jsonb default null)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_transaction_id bigint;
  v_now timestamptz := game.now();
  v_leg game.ledger_leg;
  v_currency text;
  v_credit_currency text;
  v_debit_after bigint;
  v_credit_after bigint;
begin
  if p_key is not null then
    select id into v_transaction_id from game.ledger_transactions where idempotency_key = p_key;
    if found then
      return v_transaction_id;
    end if;
  end if;
  if coalesce(cardinality(p_legs), 0) = 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;

  -- Lock every account involved in id order, so opposite transfers never deadlock.
  perform 1
  from game.accounts
  where id in (
    select l.debit_account_id from unnest(p_legs) as l
    union
    select l.credit_account_id from unnest(p_legs) as l
  )
  order by id
  for update;

  insert into game.ledger_transactions (kind, idempotency_key, actor_user_id, request, created_at)
  values (p_kind, p_key, p_actor, p_request, v_now)
  returning id into v_transaction_id;

  foreach v_leg in array p_legs loop
    if v_leg.amount is null or v_leg.amount <= 0 then
      raise exception 'amount_invalid' using errcode = '22023';
    end if;
    select currency_code into v_currency from game.accounts where id = v_leg.debit_account_id;
    select currency_code into v_credit_currency from game.accounts where id = v_leg.credit_account_id;
    if v_currency is null or v_currency is distinct from v_credit_currency then
      raise exception 'currency_invalid' using errcode = '22023';
    end if;

    begin
      update game.accounts set balance = balance - v_leg.amount
      where id = v_leg.debit_account_id
      returning balance into v_debit_after;
    exception when check_violation then
      raise exception 'insufficient_funds' using errcode = '22023';
    end;
    update game.accounts set balance = balance + v_leg.amount
    where id = v_leg.credit_account_id
    returning balance into v_credit_after;

    insert into game.ledger_postings (
      transaction_id, kind, memo, currency_code, debit_account_id, credit_account_id, amount,
      debit_balance_after, credit_balance_after, created_at
    ) values (
      v_transaction_id, coalesce(v_leg.kind, p_kind), v_leg.memo, v_currency, v_leg.debit_account_id,
      v_leg.credit_account_id, v_leg.amount, v_debit_after, v_credit_after, v_now
    );
  end loop;

  return v_transaction_id;
end;
$$;
comment on function game.post(text, text, uuid, game.ledger_leg[], jsonb) is
  'Posts the legs of one action atomically. Fails with insufficient_funds; a repeated key posts nothing.';

create function game.transfer(
  p_debit_account_id bigint,
  p_credit_account_id bigint,
  p_amount bigint,
  p_kind text,
  p_memo text,
  p_key text default null
)
returns bigint
language sql
set search_path = ''
as $$
  select game.post(
    p_kind, p_key, null,
    array[row(p_debit_account_id, p_credit_account_id, p_amount, p_kind, p_memo)::game.ledger_leg]
  );
$$;
comment on function game.transfer(bigint, bigint, bigint, text, text, text) is 'One posting between two accounts.';

-- Welcome grant ---------------------------------------------------------------------------------------

create function game.grant_welcome(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_country text;
begin
  select country_code into v_country from game.citizens where user_id = p_user_id;
  if v_country is null then
    return;
  end if;
  perform game.post(
    'welcome_grant',
    'welcome:' || p_user_id::text,
    p_user_id,
    array[
      row(game.system_account('issuer', 'GOLD'), game.citizen_account(p_user_id, 'GOLD'),
          (game.param('welcome_gold') * 100)::bigint, 'welcome_grant', null)::game.ledger_leg,
      row(game.system_account('issuer', v_country), game.citizen_account(p_user_id, v_country),
          (game.param('welcome_credit') * 100)::bigint, 'welcome_grant', null)::game.ledger_leg
    ]
  );
end;
$$;
comment on function game.grant_welcome(uuid) is '5 Gold and 50 Credit of the citizen''s country, once per account.';

-- A confirmed account gets the grant when its citizen is created (Google, or tests) ...
create function game.grant_welcome_to_new_citizen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id = new.user_id and email_confirmed_at is not null) then
    perform game.grant_welcome(new.user_id);
  end if;
  return new;
end;
$$;

create trigger citizens_grant_welcome
after insert on game.citizens
for each row execute function game.grant_welcome_to_new_citizen();

-- ... and an email sign-up when it confirms its email.
create function game.grant_welcome_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform game.grant_welcome(new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed_grant_welcome
after update of email_confirmed_at on auth.users
for each row execute function game.grant_welcome_on_confirmation();

-- Confirmed citizens created before this migration (local and test data only) get theirs now.
select game.grant_welcome(c.user_id)
from game.citizens as c
join auth.users as u on u.id = c.user_id
where u.email_confirmed_at is not null;

-- API -------------------------------------------------------------------------------------------------

create function public.get_my_balances()
returns table (currency_code text, country_code text, balance bigint)
language sql
stable
security definer
set search_path = ''
as $$
  -- Gold and the Credit of the player's country always appear; other Credits once held.
  select cur.code, cur.country_code, coalesce(a.balance, 0)
  from game.citizens as c
  join game.currencies as cur on cur.code in ('GOLD', c.country_code)
    or exists (select 1 from game.accounts as held
               where held.kind = 'citizen' and held.user_id = c.user_id and held.currency_code = cur.code)
  left join game.accounts as a on a.kind = 'citizen' and a.user_id = c.user_id and a.currency_code = cur.code
  where c.user_id = auth.uid()
  order by cur.code = 'GOLD' desc, cur.code = c.country_code desc, cur.code;
$$;
comment on function public.get_my_balances() is 'The signed-in player''s balances in hundredths: Gold, their Credit, others held.';
grant execute on function public.get_my_balances() to authenticated;

create function public.list_my_movements(
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
         other.kind, other_citizen.name, other.country_code
  from game.ledger_postings as p
  join game.accounts as other
    on other.id = case when p.credit_account_id in (select id from mine) then p.debit_account_id else p.credit_account_id end
  left join game.citizens as other_citizen on other_citizen.user_id = other.user_id
  where (p.debit_account_id in (select id from mine) or p.credit_account_id in (select id from mine))
    and (p_currency is null or p.currency_code = p_currency)
    and (p_before is null or p.id < p_before)
  order by p.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;
comment on function public.list_my_movements(text, bigint, integer) is
  'The signed-in player''s postings, newest first, with the counterparty and the balance after each.';
grant execute on function public.list_my_movements(text, bigint, integer) to authenticated;

create function public.transfer_money(
  p_to_name text,
  p_currency text,
  p_amount bigint,
  p_memo text,
  p_key uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipient uuid;
  v_memo text := nullif(btrim(p_memo), '');
  v_key text := 'transfer:' || v_user_id::text || ':' || p_key::text;
  v_request jsonb;
  v_existing jsonb;
  v_from bigint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from game.citizens where user_id = v_user_id) then
    raise exception 'no_citizen' using errcode = 'P0002';
  end if;
  if p_key is null then
    raise exception 'idempotency_key_reused' using errcode = '22023';
  end if;
  v_request := jsonb_build_object('to', btrim(p_to_name), 'currency', p_currency, 'amount', p_amount, 'memo', v_memo);

  -- The same request again returns its outcome; the same key with another request is refused.
  select request into v_existing from game.ledger_transactions where idempotency_key = v_key;
  if found then
    if v_existing is distinct from v_request then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return (select balance from game.accounts where kind = 'citizen' and user_id = v_user_id and currency_code = p_currency);
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.currencies where code = p_currency) then
    raise exception 'currency_invalid' using errcode = '22023';
  end if;
  if char_length(v_memo) > 80 then
    raise exception 'memo_too_long' using errcode = '22023';
  end if;

  select c.user_id into v_recipient
  from game.citizens as c
  join auth.users as u on u.id = c.user_id
  where (c.name collate game.citizen_name) = btrim(p_to_name)
    and u.email_confirmed_at is not null;
  if v_recipient is null then
    raise exception 'recipient_not_found' using errcode = 'P0002';
  end if;
  if v_recipient = v_user_id then
    raise exception 'recipient_is_sender' using errcode = '22023';
  end if;

  if (select count(*) from game.ledger_transactions
      where actor_user_id = v_user_id and kind = 'transfer' and created_at > game.now() - interval '1 hour')
     >= game.param('transfer_max_per_hour') then
    raise exception 'rate_limited' using errcode = '22023';
  end if;

  v_from := (select id from game.accounts where kind = 'citizen' and user_id = v_user_id and currency_code = p_currency);
  if v_from is null then
    raise exception 'insufficient_funds' using errcode = '22023';
  end if;

  perform game.post(
    'transfer', v_key, v_user_id,
    array[row(v_from, game.citizen_account(v_recipient, p_currency), p_amount, 'transfer', v_memo)::game.ledger_leg],
    v_request
  );
  return (select balance from game.accounts where id = v_from);
end;
$$;
comment on function public.transfer_money(text, text, bigint, text, uuid) is
  'Sends hundredths of a currency to another citizen by name. Idempotent per key; limited per hour.';
grant execute on function public.transfer_money(text, text, bigint, text, uuid) to authenticated;

-- L3 · Financial reversal by compensating entries (spec section 12.6, ADR 0039): an admin reverses a ledger
-- transaction with a new one whose legs are the original's, crossed; never by editing the ledger. Audited, once.
--
-- game.ledger_compensations   each compensated transaction, its compensation, the reason and the admin
-- game.record_supply_change   now also records reversals: an issuer credited is a burn, a sink debited is a mint
-- public.admin_transaction_legs, admin_compensate, admin_list_compensations
-- Only money is reversed; goods, offices or other state the original changed are fixed by their own procedures.
-- Transactions that touch an escrow (holds) are refused: release or capture the hold instead.
--
-- Errors (ADR 0005): not_admin, transaction_not_found, already_compensated, not_compensable, reason_invalid,
-- insufficient_funds.
--
-- Rollback: drop the public functions created here and game.ledger_compensations; restore
-- game.record_supply_change from 20261013100000.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function game.record_supply_change()
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
  elsif v_credit_kind = 'sink' or v_credit_kind = 'issuer' then
    insert into game.supply_changes (posting_id, currency_code, direction, amount, reason, created_at)
    values (new.id, new.currency_code, 'burn', new.amount, new.kind, new.created_at);
  elsif v_debit_kind = 'sink' then
    insert into game.supply_changes (posting_id, currency_code, direction, amount, reason, created_at)
    values (new.id, new.currency_code, 'mint', new.amount, new.kind, new.created_at);
  end if;
  return null;
end;
$$;

create table game.ledger_compensations (
  original_transaction_id bigint primary key references game.ledger_transactions (id),
  compensation_transaction_id bigint not null unique references game.ledger_transactions (id),
  reason text not null check (char_length(reason) between 3 and 300),
  admin_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null
);
alter table game.ledger_compensations enable row level security;
comment on table game.ledger_compensations is 'Transactions reversed by a compensating transaction, with the reason and the admin.';
create index ledger_compensations_admin_idx on game.ledger_compensations (admin_user_id) where admin_user_id is not null;

-- Who or what an account is, for admins (labels without addresses).
create function game.admin_account_label(p_account_id bigint)
returns text
language sql
stable
set search_path = ''
as $$
  select a.kind || ':' || coalesce(game.account_label(a), a.currency_code)
  from game.accounts as a where a.id = p_account_id;
$$;

create function public.admin_transaction_legs(p_transaction_id bigint)
returns table (
  kind text, created_at timestamptz, posting_kind text, currency_code text, amount bigint, debit text, credit text,
  memo text, compensated_by bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select t.kind, t.created_at, p.kind, p.currency_code, p.amount, game.admin_account_label(p.debit_account_id),
         game.admin_account_label(p.credit_account_id), p.memo,
         (select c.compensation_transaction_id from game.ledger_compensations as c where c.original_transaction_id = t.id)
  from game.ledger_transactions as t
  join game.ledger_postings as p on p.transaction_id = t.id
  where t.id = p_transaction_id
  order by p.id;
end;
$$;
comment on function public.admin_transaction_legs(bigint) is 'For admins: the legs of a ledger transaction before compensating it.';
grant execute on function public.admin_transaction_legs(bigint) to authenticated;

create function public.admin_compensate(p_transaction_id bigint, p_reason text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_tx game.ledger_transactions;
  v_legs game.ledger_leg[];
  v_compensation bigint;
begin
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 300 then
    raise exception 'reason_invalid' using errcode = '22023';
  end if;
  select * into v_tx from game.ledger_transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'transaction_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from game.ledger_compensations where original_transaction_id = v_tx.id) then
    raise exception 'already_compensated' using errcode = '22023';
  end if;
  if v_tx.kind = 'compensation'
     or exists (select 1 from game.ledger_postings as p
                join game.accounts as a on a.id in (p.debit_account_id, p.credit_account_id)
                where p.transaction_id = v_tx.id and a.kind = 'escrow') then
    raise exception 'not_compensable' using errcode = '22023';
  end if;
  select array_agg(row(p.credit_account_id, p.debit_account_id, p.amount, 'compensation',
                       left('tx ' || v_tx.id::text || ': ' || btrim(p_reason), 200))::game.ledger_leg order by p.id)
  into v_legs
  from game.ledger_postings as p
  where p.transaction_id = v_tx.id;
  v_compensation := game.post('compensation', 'compensation:' || v_tx.id::text, v_admin, v_legs,
                              jsonb_build_object('original', v_tx.id, 'reason', btrim(p_reason)));
  insert into game.ledger_compensations (original_transaction_id, compensation_transaction_id, reason, admin_user_id, created_at)
  values (v_tx.id, v_compensation, btrim(p_reason), v_admin, game.now());
  perform game.log_admin_action(v_admin, 'compensate_transaction', v_tx.id::text,
                                jsonb_build_object('kind', v_tx.kind),
                                jsonb_build_object('compensation', v_compensation, 'reason', btrim(p_reason)));
  return v_compensation;
end;
$$;
comment on function public.admin_compensate(bigint, text) is
  'For admins: reverses a ledger transaction with a compensating one, once, audited. Money only.';
grant execute on function public.admin_compensate(bigint, text) to authenticated;

create function public.admin_list_compensations()
returns table (
  original_transaction_id bigint, original_kind text, compensation_transaction_id bigint, reason text, admin_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select c.original_transaction_id, t.kind, c.compensation_transaction_id, c.reason,
         coalesce((select name from game.citizens where user_id = c.admin_user_id), 'admin'), c.created_at
  from game.ledger_compensations as c
  join game.ledger_transactions as t on t.id = c.original_transaction_id
  order by c.created_at desc
  limit 50;
end;
$$;
comment on function public.admin_list_compensations() is 'For admins: the latest compensating transactions.';
grant execute on function public.admin_list_compensations() to authenticated;

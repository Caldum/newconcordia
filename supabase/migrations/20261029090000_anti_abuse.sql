-- L1 · Rate limits on every action, anti-abuse signals and alerts, multi-account detection (spec sections 9, 12.6,
-- 12.7 and 13, ADR 0037).
--
-- public.check_request     PostgREST's pre-request hook: every write request of a signed-in player counts in a
--                          one-minute window; past rate_limit_writes_per_minute it is refused with HTTP 429
--                          (`rate_limited`). Reads (read-only transactions) and visitors are not counted.
-- game.request_counters    the per-player, per-minute counters (old windows are removed by the hourly job)
-- game.abuse_signals       what the hourly scan detects, for admins to review; never changes a confirmed rule:
--                          shared_ip (two accounts signed in from the same address in 7 days), self_trading (a trade
--                          between accounts sharing an address), large_transfer (a transfer between citizens at or
--                          above abuse_large_transfer), hold_inconsistent (an escrow whose balance does not match its
--                          hold), ledger_imbalance (a currency whose balances do not sum to zero)
-- public.admin_list_abuse_signals, admin_review_abuse_signal (audited)
-- Addresses never leave the database: signals name accounts only.
--
-- Rollback: alter role authenticator reset pgrst.db_pre_request; notify pgrst; drop public.check_request,
-- public.admin_list_abuse_signals, public.admin_review_abuse_signal, game.scan_abuse, game.abuse_signals and
-- game.request_counters; restore game.hourly_world from 20261028090000; delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('rate_limit_writes_per_minute', 60, 'Write requests a player may make per minute before HTTP 429.'),
  ('abuse_large_transfer', 100000, 'Hundredths from which a transfer between citizens is signalled for review.'),
  ('abuse_shared_ip_days', 7, 'Days of sessions the shared-address scan looks at.');

-- Rate limits --------------------------------------------------------------------------------------------------

create table game.request_counters (
  user_id uuid not null,
  window_start timestamptz not null,
  requests integer not null default 1,
  primary key (user_id, window_start)
);
alter table game.request_counters enable row level security;
comment on table game.request_counters is 'Write requests per player and minute, for the rate limit.';
create index request_counters_window_idx on game.request_counters (window_start);

create function public.check_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null or current_setting('transaction_read_only', true) = 'on' then
    return;
  end if;
  insert into game.request_counters (user_id, window_start) values (v_user, date_trunc('minute', game.now()))
  on conflict (user_id, window_start) do update set requests = game.request_counters.requests + 1
  returning requests into v_count;
  if v_count > game.param('rate_limit_writes_per_minute') then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
end;
$$;
comment on function public.check_request() is
  'PostgREST pre-request hook: counts each player''s write requests per minute and refuses the excess (429).';
grant execute on function public.check_request() to anon, authenticated;

-- PostgREST calls it before every request (Supabase: the authenticator role's setting).
alter role authenticator set pgrst.db_pre_request to 'public.check_request';
notify pgrst, 'reload config';

-- Signals --------------------------------------------------------------------------------------------------------

create table game.abuse_signals (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('shared_ip', 'self_trading', 'large_transfer', 'hold_inconsistent', 'ledger_imbalance')),
  reference text not null check (char_length(reference) <= 200),
  user_id uuid references game.citizens (user_id) on delete set null,
  other_user_id uuid references game.citizens (user_id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  review_note text check (char_length(review_note) <= 500),
  unique (kind, reference)
);
alter table game.abuse_signals enable row level security;
comment on table game.abuse_signals is 'Anti-abuse signals for admins to review; they never change a rule by themselves.';
create index abuse_signals_open_idx on game.abuse_signals (created_at) where reviewed_at is null;
create index abuse_signals_user_idx on game.abuse_signals (user_id) where user_id is not null;
create index abuse_signals_other_idx on game.abuse_signals (other_user_id) where other_user_id is not null;
create index abuse_signals_reviewed_by_idx on game.abuse_signals (reviewed_by) where reviewed_by is not null;

-- Pairs of accounts that signed in from the same address in the window.
create function game.shared_address_pairs(p_days integer)
returns table (user_a uuid, user_b uuid)
language sql
stable
set search_path = ''
as $$
  select distinct least(a.user_id, b.user_id), greatest(a.user_id, b.user_id)
  from auth.sessions as a
  join auth.sessions as b on b.ip = a.ip and b.user_id <> a.user_id
  where a.ip is not null
    and coalesce(a.updated_at, a.created_at) > game.now() - make_interval(days => p_days)
    and coalesce(b.updated_at, b.created_at) > game.now() - make_interval(days => p_days)
    and exists (select 1 from game.citizens where user_id = a.user_id)
    and exists (select 1 from game.citizens where user_id = b.user_id);
$$;

-- Runs every hour: records new signals once (kind and reference are unique). Returns how many are new.
create function game.scan_abuse()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_before integer := (select count(*) from game.abuse_signals);
begin
  insert into game.abuse_signals (kind, reference, user_id, other_user_id, created_at)
  select 'shared_ip', p.user_a::text || ':' || p.user_b::text, p.user_a, p.user_b, game.now()
  from game.shared_address_pairs(game.param('abuse_shared_ip_days')::integer) as p
  on conflict (kind, reference) do nothing;

  insert into game.abuse_signals (kind, reference, user_id, other_user_id, detail, created_at)
  select 'self_trading', 'trade:' || t.id::text, t.buyer_user_id, o.seller_user_id,
         jsonb_build_object('trade_id', t.id, 'gross', t.gross), game.now()
  from game.market_trades as t
  join game.market_offers as o on o.id = t.offer_id
  where t.created_at > game.now() - interval '2 hours'
    and exists (select 1 from game.shared_address_pairs(game.param('abuse_shared_ip_days')::integer) as p
                where (p.user_a, p.user_b) = (least(t.buyer_user_id, o.seller_user_id), greatest(t.buyer_user_id, o.seller_user_id)))
  on conflict (kind, reference) do nothing;

  insert into game.abuse_signals (kind, reference, user_id, other_user_id, detail, created_at)
  select 'large_transfer', 'posting:' || p.id::text, d.user_id, c.user_id,
         jsonb_build_object('currency', p.currency_code, 'amount', p.amount), game.now()
  from game.ledger_postings as p
  join game.accounts as d on d.id = p.debit_account_id and d.kind = 'citizen'
  join game.accounts as c on c.id = p.credit_account_id and c.kind = 'citizen'
  where p.created_at > game.now() - interval '2 hours' and p.amount >= game.param('abuse_large_transfer')
  on conflict (kind, reference) do nothing;

  insert into game.abuse_signals (kind, reference, detail, created_at)
  select 'hold_inconsistent', 'hold:' || h.id::text,
         jsonb_build_object('hold_id', h.id, 'expected', h.amount - h.captured - h.released, 'escrow', a.balance), game.now()
  from game.ledger_holds as h
  join game.accounts as a on a.id = h.escrow_account_id
  where a.balance <> h.amount - h.captured - h.released
  on conflict (kind, reference) do nothing;

  insert into game.abuse_signals (kind, reference, detail, created_at)
  select 'ledger_imbalance', s.currency_code || ':' || game.game_day()::text,
         jsonb_build_object('currency', s.currency_code, 'sum', s.total), game.now()
  from (select currency_code, sum(balance) as total from game.accounts group by currency_code having sum(balance) <> 0) as s
  on conflict (kind, reference) do nothing;

  return (select count(*) from game.abuse_signals) - v_before;
end;
$$;

create or replace function game.hourly_world()
returns jsonb
language sql
set search_path = ''
as $$
  with cleanup as (
    delete from game.request_counters where window_start < game.now() - interval '1 hour' returning 1
  )
  select jsonb_build_object(
    'war_authorizations_expired', game.expire_war_authorizations(),
    'battles_finished', game.settle_battles(),
    'independence_wars_closed', (select count(*)::integer from game.independence_wars as w
                                 where w.status = 'active' and w.ends_at <= game.now()
                                   and game.close_independence_war(w.id) <> 'active'),
    'abuse_signals', game.scan_abuse(),
    'request_counters_removed', (select count(*) from cleanup)
  );
$$;

-- Admin ------------------------------------------------------------------------------------------------------------

create function public.admin_list_abuse_signals(p_open_only boolean default true)
returns table (
  signal_id bigint, kind text, user_name text, other_name text, detail jsonb, created_at timestamptz,
  reviewed_at timestamptz, review_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select s.id, s.kind, u.name, o.name, s.detail, s.created_at, s.reviewed_at, s.review_note
  from game.abuse_signals as s
  left join game.citizens as u on u.user_id = s.user_id
  left join game.citizens as o on o.user_id = s.other_user_id
  where not coalesce(p_open_only, true) or s.reviewed_at is null
  order by s.created_at desc, s.id desc
  limit 200;
end;
$$;
comment on function public.admin_list_abuse_signals(boolean) is 'Anti-abuse signals for admins; addresses are never shown.';
grant execute on function public.admin_list_abuse_signals(boolean) to authenticated;

create function public.admin_review_abuse_signal(p_signal_id bigint, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_signal game.abuse_signals;
begin
  select * into v_signal from game.abuse_signals where id = p_signal_id for update;
  if not found then
    raise exception 'signal_not_found' using errcode = 'P0002';
  end if;
  if v_signal.reviewed_at is not null then
    raise exception 'signal_reviewed' using errcode = '22023';
  end if;
  update game.abuse_signals
  set reviewed_at = game.now(), reviewed_by = v_admin, review_note = left(btrim(coalesce(p_note, '')), 500)
  where id = p_signal_id;
  perform game.log_admin_action(v_admin, 'review_abuse_signal', v_signal.kind || ':' || v_signal.reference,
                                null, jsonb_build_object('note', left(btrim(coalesce(p_note, '')), 500)));
end;
$$;
comment on function public.admin_review_abuse_signal(bigint, text) is 'An admin marks a signal reviewed, with a note; audited.';
grant execute on function public.admin_review_abuse_signal(bigint, text) to authenticated;

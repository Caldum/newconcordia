-- P3 · Referral rewards (owner's decision, 2026-11-03; ADR 0043, which replaces point 5 of ADR 0041).
--
-- A citizen earns 10% of the GOLD their referrals get in their first 30 days, and has 30 more days to claim it before
-- it expires. Counted GOLD: what the system pays them (levels, elections, resistance, missions) plus what they buy on
-- the GOLD market, net of what they sell there in the same window, so buying and selling in a loop earns nothing. Due
-- amounts are recomputed from the ledger at every read; a claim pays the difference with what was claimed before, as a
-- system mint (`referral_bonus`).
--
-- game.referral_reward_kinds   ledger kinds that count, and how (earned or bought)
-- game.referral_claims         every claim, per referral
-- game.referral_gold, game.referral_due
-- public.list_my_referral_rewards, claim_referral_rewards
--
-- Errors (ADR 0005): nothing_to_claim.
--
-- Rollback: drop the public functions created here, game.referral_due, game.referral_gold, game.referral_claims,
-- game.referral_reward_kinds; delete the mint reason and the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('referral_reward_percent', 10, 'Percent of the GOLD a referral gets that their referrer earns.'),
  ('referral_earning_days', 30, 'Days after a referral joins in which their GOLD counts.'),
  ('referral_claim_days', 30, 'Days after the earning window to claim before it expires.');

insert into game.mint_reasons (kind, authority, description) values
  ('referral_bonus', 'system_reward', 'Share of the GOLD a referral got in their first days (ADR 0043).');

create table game.referral_reward_kinds (
  kind text primary key check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  counts_as text not null check (counts_as in ('earned', 'bought')),
  description text not null
);
alter table game.referral_reward_kinds enable row level security;
comment on table game.referral_reward_kinds is
  'Ledger kinds of GOLD that count for referral rewards: system pay (earned) or market purchases, net (bought).';

insert into game.referral_reward_kinds (kind, counts_as, description) values
  ('level_reward', 'earned', 'GOLD for a new civil level.'),
  ('election_reward', 'earned', 'GOLD for an election.'),
  ('resistance_reward', 'earned', 'GOLD for a successful resistance.'),
  ('daily_missions', 'earned', 'The four daily missions.'),
  ('mission_streak', 'earned', 'Seven days of missions in a row.'),
  ('fx_trade', 'bought', 'GOLD bought on the market, minus GOLD sold there.');

create table game.referral_claims (
  id bigint generated always as identity primary key,
  referrer_user_id uuid not null references game.citizens (user_id) on delete cascade,
  referral_user_id uuid not null references game.citizens (user_id) on delete cascade,
  amount bigint not null check (amount > 0),
  transaction_id bigint not null references game.ledger_transactions (id),
  claimed_at timestamptz not null
);
alter table game.referral_claims enable row level security;
comment on table game.referral_claims is 'GOLD a referrer claimed for each referral.';
create index referral_claims_pair_idx on game.referral_claims (referrer_user_id, referral_user_id);
create index referral_claims_referral_idx on game.referral_claims (referral_user_id);
create index referral_claims_transaction_idx on game.referral_claims (transaction_id);

-- Closed holds too: the sales of a referral are read through every hold they ever had. The table is small while the
-- game is in development; production gets this index before players arrive.
-- squawk-ignore require-concurrent-index-creation
create index ledger_holds_owner_idx on game.ledger_holds (owner_account_id);

-- The GOLD a referral got in their earning window: paid by the system, and bought on the market net of sales.
create function game.referral_gold(p_referral uuid)
returns table (earned bigint, bought bigint)
language sql
stable
set search_path = ''
as $$
  with me as (
    select c.joined_at as starts,
           c.joined_at + make_interval(days => game.param('referral_earning_days')::integer) as ends,
           (select a.id from game.accounts as a
            where a.kind = 'citizen' and a.user_id = c.user_id and a.currency_code = 'GOLD') as account
    from game.citizens as c
    where c.user_id = p_referral
  ),
  -- GOLD the referral sells through their own offer leaves from the escrow of its hold.
  escrows as (
    select h.escrow_account_id as account
    from me
    join game.ledger_holds as h on h.owner_account_id = me.account
  ),
  moves as (
    select k.counts_as,
           case when p.credit_account_id = me.account then p.amount else -p.amount end as amount,
           p.debit_account_id
    from me
    join game.ledger_postings as p
      on me.account in (p.credit_account_id, p.debit_account_id)
      or p.debit_account_id in (select e.account from escrows as e)
    join game.referral_reward_kinds as k on k.kind = p.kind
    where p.currency_code = 'GOLD' and p.created_at >= me.starts and p.created_at < me.ends
  )
  select coalesce(sum(m.amount) filter (
           where m.counts_as = 'earned' and m.amount > 0
             and m.debit_account_id = game.system_account('issuer', 'GOLD')), 0)::bigint,
         greatest(coalesce(sum(m.amount) filter (where m.counts_as = 'bought'), 0), 0)::bigint
  from moves as m;
$$;
comment on function game.referral_gold(uuid) is
  'GOLD a referral got in their first days: system pay, and market purchases net of sales.';

-- What a referrer has earned for one referral, claimed, and may claim now.
create function game.referral_due(p_referrer uuid, p_referral uuid)
returns table (earned bigint, bought bigint, due bigint, claimed bigint, claimable bigint, earning_until timestamptz,
               claim_until timestamptz)
language sql
stable
set search_path = ''
as $$
  with w as (
    select c.joined_at + make_interval(days => game.param('referral_earning_days')::integer) as earning_until
    from game.citizens as c
    where c.user_id = p_referral and c.referred_by_user_id = p_referrer
  ),
  g as (select * from game.referral_gold(p_referral)),
  t as (
    select (g.earned + g.bought) * game.param('referral_reward_percent')::bigint / 100 as due,
           coalesce((select sum(rc.amount) from game.referral_claims as rc
                     where rc.referrer_user_id = p_referrer and rc.referral_user_id = p_referral), 0)::bigint as claimed
    from g
  )
  select g.earned, g.bought, t.due, t.claimed,
         case when game.now() <= w.earning_until + make_interval(days => game.param('referral_claim_days')::integer)
              then greatest(t.due - t.claimed, 0) else 0 end,
         w.earning_until,
         w.earning_until + make_interval(days => game.param('referral_claim_days')::integer)
  from w, g, t;
$$;
comment on function game.referral_due(uuid, uuid) is
  'A referrer''s share of one referral''s GOLD: due, already claimed and claimable until it expires.';

create function public.list_my_referral_rewards()
returns table (name text, avatar_path text, country_code text, joined_at timestamptz, earning_until timestamptz,
               claim_until timestamptz, gold_earned bigint, gold_bought bigint, due bigint, claimed bigint,
               claimable bigint, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.avatar_path, c.country_code, c.joined_at, d.earning_until, d.claim_until, d.earned, d.bought, d.due,
         d.claimed, d.claimable,
         case when game.now() < d.earning_until then 'earning'
              when game.now() <= d.claim_until and d.claimable > 0 then 'claimable'
              when game.now() <= d.claim_until then 'done'
              else 'expired' end
  from game.citizens as c
  cross join lateral game.referral_due(auth.uid(), c.user_id) as d
  where c.referred_by_user_id = auth.uid()
  order by c.joined_at desc
  limit 100;
$$;
comment on function public.list_my_referral_rewards() is
  'The player''s referrals with the GOLD they got, the share due, claimed and claimable, and until when.';
grant execute on function public.list_my_referral_rewards() to authenticated;

-- Claims every share that is claimable now; returns the GOLD paid (hundredths).
create function public.claim_referral_rewards()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_row record;
  v_tx bigint;
  v_total bigint := 0;
begin
  perform 1 from game.player_stats where user_id = v_citizen.user_id for update;
  for v_row in
    select c.user_id, d.claimable, d.claimed
    from game.citizens as c
    cross join lateral game.referral_due(v_citizen.user_id, c.user_id) as d
    where c.referred_by_user_id = v_citizen.user_id and d.claimable > 0
    order by c.joined_at
  loop
    -- The key carries the total claimed after this payment, so a retry pays nothing twice.
    v_tx := game.post(
      'referral_bonus',
      'referral_bonus:' || v_citizen.user_id::text || ':' || v_row.user_id::text || ':'
        || (v_row.claimed + v_row.claimable)::text,
      v_citizen.user_id,
      array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(v_citizen.user_id, 'GOLD'),
                v_row.claimable, 'referral_bonus', null)::game.ledger_leg]
    );
    insert into game.referral_claims (referrer_user_id, referral_user_id, amount, transaction_id, claimed_at)
    values (v_citizen.user_id, v_row.user_id, v_row.claimable, v_tx, game.now());
    v_total := v_total + v_row.claimable;
  end loop;
  if v_total = 0 then
    raise exception 'nothing_to_claim' using errcode = '22023';
  end if;
  return v_total;
end;
$$;
comment on function public.claim_referral_rewards() is
  'Pays the referrer every share of their referrals'' GOLD that is claimable now (a system mint).';
grant execute on function public.claim_referral_rewards() to authenticated;

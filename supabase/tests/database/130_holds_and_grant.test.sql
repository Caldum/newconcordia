-- R2: holds (escrow), mint and burn records, and the sign-up grant. Acceptance (roadmap R2): locked money
-- cannot be spent elsewhere; the grant is paid once.
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
          now(), now(), now())
  returning id;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.balance(p_account bigint)
returns bigint
language sql
as $$
  select balance from game.accounts where id = p_account;
$$;

set local game.fixed_now = '2026-10-13 12:00:00+00';

-- Sign-up grant: 5 GOLD, 100 of the country's currency and 10 Q1 food (rations), once.
select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select game.citizen_account(:'camila', 'GOLD') as camila_gold \gset
select game.citizen_account(:'camila', 'ARG') as camila_arg \gset
select game.citizen_account(:'marcos', 'ARG') as marcos_arg \gset

select is(pg_temp.balance(:'camila_gold'), 500::bigint, 'the grant pays 5 GOLD');
select is(pg_temp.balance(:'camila_arg'), 10000::bigint, 'and 100 of the country''s currency');
select is(
  (select quantity from game.inventories where user_id = :'camila' and good_code = 'ration'),
  10::numeric,
  'and 10 Q1 food'
);
select game.grant_welcome(:'camila');
select results_eq(
  format($$ select (select balance from game.accounts where id = %s),
                   (select balance from game.accounts where id = %s),
                   (select quantity from game.inventories where user_id = %L and good_code = 'ration') $$,
         :'camila_gold', :'camila_arg', :'camila'),
  $$ values (500::bigint, 10000::bigint, 10::numeric) $$,
  'acceptance: the grant is paid once, food included'
);
select is(
  (select count(*) from game.supply_changes as s
   join game.ledger_postings as p on p.id = s.posting_id
   join game.ledger_transactions as t on t.id = p.transaction_id
   where t.idempotency_key = 'welcome:' || :'camila' and s.direction = 'mint')::int,
  2,
  'the grant is recorded as two mints, GOLD and the country''s currency'
);

-- Holds.
select game.hold(:'camila_arg', 3000, 'buy_order', 'test:1', 'hold:t1') as hold1 \gset
select is(pg_temp.balance(:'camila_arg'), 7000::bigint, 'holding moves the money out of the balance');
select results_eq(
  format($$ select amount, captured, released, status, purpose, reference from game.ledger_holds where id = %s $$, :'hold1'),
  $$ values (3000::bigint, 0::bigint, 0::bigint, 'open', 'buy_order', 'test:1') $$,
  'the hold records its purpose, reference and amount'
);
select is(
  (select pg_temp.balance(escrow_account_id) from game.ledger_holds where id = :'hold1'),
  3000::bigint,
  'the money waits in the hold''s own escrow account'
);
select is(game.hold(:'camila_arg', 3000, 'buy_order', 'test:1', 'hold:t1'), :'hold1'::bigint, 'the same key returns the same hold');
select is(pg_temp.balance(:'camila_arg'), 7000::bigint, 'and holds nothing more');
select throws_ok(
  format($$ select game.transfer(%s, %s, 7001, 'transfer', null) $$, :'camila_arg', :'marcos_arg'),
  '22023', 'insufficient_funds',
  'acceptance: held money cannot be spent elsewhere'
);
select lives_ok(
  format($$ select game.transfer(%s, %s, 7000, 'transfer', null, 'r2:spend-free') $$, :'camila_arg', :'marcos_arg'),
  'the free money can still be spent'
);
select throws_ok(
  format($$ select game.hold(%s, 1, 'buy_order', 'test:2', 'hold:t2') $$, :'camila_arg'),
  '22023', 'insufficient_funds', 'nothing is held beyond the free balance'
);
select throws_ok(
  format($$ select game.hold(%s, 0, 'buy_order', 'test:3', 'hold:t3') $$, :'camila_arg'),
  '22023', 'amount_invalid', 'a hold needs a positive amount'
);

-- Capture: pays from the hold, partially if needed, never beyond it.
select is(
  game.capture_hold(:'hold1', array[row(null, :'marcos_arg', 1000, 'market_trade', null)::game.ledger_leg], 'cap:t1'),
  2000::bigint,
  'a partial capture leaves the rest held'
);
select is(pg_temp.balance(:'marcos_arg'), 18000::bigint, 'the capture pays the recipient');
select is(
  game.capture_hold(:'hold1', array[row(null, :'marcos_arg', 1000, 'market_trade', null)::game.ledger_leg], 'cap:t1'),
  2000::bigint,
  'a repeated capture key pays nothing again'
);
select throws_ok(
  format($$ select game.capture_hold(%s, array[row(null, %s, 2001, 'market_trade', null)::game.ledger_leg], 'cap:t2') $$,
         :'hold1', :'marcos_arg'),
  '22023', 'hold_insufficient', 'no capture beyond what is held'
);
select throws_ok(
  format($$ select game.capture_hold(%s, array[row(%s, %s, 10, 'market_trade', null)::game.ledger_leg], 'cap:t3') $$,
         :'hold1', :'marcos_arg', :'camila_arg'),
  '22023', 'hold_leg_invalid', 'a capture always pays from the hold itself'
);

-- Release: back to the owner; the hold closes when empty.
select is(game.release_hold(:'hold1', 'rel:t1', 500), 1500::bigint, 'a partial release');
select is(pg_temp.balance(:'camila_arg'), 500::bigint, 'returns the money to the owner');
select is(game.release_hold(:'hold1', 'rel:t2'), 0::bigint, 'releasing without an amount returns everything left');
select results_eq(
  format($$ select captured, released, status, closed_at is not null from game.ledger_holds where id = %s $$, :'hold1'),
  $$ values (1000::bigint, 2000::bigint, 'closed', true) $$,
  'an empty hold is closed, with what was captured and released'
);
select is(
  (select amount = captured + released from game.ledger_holds where id = :'hold1'),
  true,
  'every held cent is either captured or released'
);
select throws_ok(
  format($$ select game.release_hold(%s, 'rel:t3') $$, :'hold1'),
  '22023', 'hold_closed', 'a closed hold accepts nothing'
);

-- Burning through a hold: a capture to the sink is recorded as a burn.
select game.hold(:'camila_gold', 200, 'war_authorization', 'law:1', 'hold:t4') as hold2 \gset
select game.capture_hold(:'hold2', array[row(null, game.system_account('sink', 'GOLD'), 200, 'war_launch', null)::game.ledger_leg], 'cap:t4');
select results_eq(
  $$ select s.direction, s.currency_code, s.amount, s.reason from game.supply_changes as s
     join game.ledger_postings as p on p.id = s.posting_id
     join game.ledger_transactions as t on t.id = p.transaction_id
     where t.idempotency_key = 'cap:t4' $$,
  $$ values ('burn', 'GOLD', 200::bigint, 'war_launch') $$,
  'money sent to the sink is recorded as burned'
);

-- Minting needs an authorized reason.
select throws_ok(
  format($$ select game.transfer(game.system_account('issuer', 'GOLD'), %s, 100, 'admin_grant', null) $$, :'camila_gold'),
  '42501', 'mint_not_authorized', 'no money is created without an authorized reason'
);
select lives_ok(
  format($$ select game.add_civil_xp(%L, 100) $$, :'camila'),
  'a level reward is an authorized mint'
);
select is(
  (select count(*) from game.mint_reasons where kind in ('welcome_grant', 'level_reward'))::int,
  2,
  'the system rewards are the authorized reasons so far'
);
select is_empty(
  $$ select currency_code from game.accounts group by currency_code having sum(balance) <> 0 $$,
  'every currency still adds up to zero, escrows included'
);
select is(
  (select coalesce(sum(case direction when 'mint' then amount else -amount end), 0)
   from game.supply_changes where currency_code = 'GOLD'),
  (select sum(balance) from game.accounts where currency_code = 'GOLD' and kind not in ('issuer', 'sink')),
  'GOLD minted minus burned is the GOLD in circulation'
);
select throws_ok(
  $$ delete from game.supply_changes $$,
  '42501', 'the ledger is append-only', 'supply records cannot be changed'
);

-- What the player sees.
select game.hold(:'camila_arg', 300, 'buy_order', 'test:5', 'hold:t5') as hold3 \gset
insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
select 'Molinos del Sur', :'marcos', 'ARG', region_code, 'ration', game.now()
from game.citizens where user_id = :'marcos'
returning id as company \gset
select game.transfer(:'marcos_arg', game.company_account(:'company', 'ARG'), 1, 'company_funding', null);
select game.transfer(game.company_account(:'company', 'ARG'), :'camila_arg', 1, 'wage', null);

select pg_temp.act_as(:'camila');
select results_eq(
  $$ select currency_code, balance, held from public.get_my_balances() where currency_code = 'ARG' $$,
  $$ values ('ARG', 1701::bigint, 300::bigint) $$,
  'the balance shows what is free and what is held'
);
select results_eq(
  $$ select kind, amount, counterparty_kind from public.list_my_movements('ARG') where kind = 'hold' order by posting_id desc limit 1 $$,
  $$ values ('hold', -300::bigint, 'escrow') $$,
  'a hold appears in the statement as money moved to escrow'
);
select results_eq(
  $$ select kind, amount, counterparty_kind, counterparty_name from public.list_my_movements('ARG') where kind = 'wage' $$,
  $$ values ('wage', 1::bigint, 'company', 'Molinos del Sur') $$,
  'company counterparties are named in the statement'
);
reset role;

select * from finish();
rollback;

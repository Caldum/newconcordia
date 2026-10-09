-- D09: ledger and currencies. Acceptance (GDD): after 1,000 random transfers, the total money does not
-- change and no balance is negative.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

create function pg_temp.new_player(p_email text, p_name text, p_country text, p_confirmed boolean default true)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'),
          case when p_confirmed then now() end, now(), now())
  returning id;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.balance(p_user_id uuid, p_currency text)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where user_id = p_user_id and currency_code = p_currency), 0);
$$;

set local game.fixed_now = '2026-10-09 12:00:00+00';

-- Currencies.
select is((select country_code from game.currencies where code = 'GOLD'), null, 'Gold belongs to no country');
select is((select country_code from game.currencies where code = 'ARG'), 'ARG', 'each country has its Credit');
select is(
  (select count(*) from game.currencies)::int,
  (select count(*) from game.countries)::int + 1,
  'Gold plus one Credit per country'
);

-- Welcome grant: 5 Gold and 50 Credit, once, after the email is confirmed.
select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset
select pg_temp.new_player('nadia@example.com', 'Nadia Pending', 'ARG', false) as nadia \gset

select is(pg_temp.balance(:'camila', 'GOLD'), 500::bigint, 'a new citizen receives 5 Gold');
select is(pg_temp.balance(:'camila', 'ARG'), 5000::bigint, 'and 50 Credit of their country');
select is(pg_temp.balance(:'ana', 'BRA'), 5000::bigint, 'in their own country''s Credit');
select is(pg_temp.balance(:'nadia', 'GOLD'), 0::bigint, 'an unconfirmed sign-up receives nothing yet');
update auth.users set email_confirmed_at = now() where id = :'nadia';
select is(pg_temp.balance(:'nadia', 'GOLD'), 500::bigint, 'confirming the email pays the welcome grant');
select game.grant_welcome(:'camila');
select is(pg_temp.balance(:'camila', 'GOLD'), 500::bigint, 'the welcome grant is paid once');

-- Created money is accounted for: every currency adds up to zero.
select is_empty(
  $$ select currency_code from game.accounts group by currency_code having sum(balance) <> 0 $$,
  'the balances of every currency add up to zero, issuers included'
);
select ok(
  (select balance from game.accounts where kind = 'issuer' and currency_code = 'GOLD') < 0,
  'the Gold issuer holds the negative of the Gold created'
);
select throws_ok(
  format($$ update game.accounts set balance = -1 where user_id = %L and currency_code = 'GOLD' $$, :'camila'),
  '23514',
  null,
  'no player balance can be negative'
);

-- Transfers between players.
select pg_temp.act_as(:'camila');
select is(
  public.transfer_money('Marcos Villalba', 'ARG', 1250, 'Por las raciones', 'a0000000-0000-4000-8000-000000000001'),
  3750::bigint,
  'a transfer returns the sender''s balance'
);
select is(
  public.transfer_money('Marcos Villalba', 'ARG', 1250, 'Por las raciones', 'a0000000-0000-4000-8000-000000000001'),
  3750::bigint,
  'repeating the same request does not pay twice'
);
select throws_ok(
  $$ select public.transfer_money('Marcos Villalba', 'ARG', 999, null, 'a0000000-0000-4000-8000-000000000001') $$,
  '22023',
  'idempotency_key_reused',
  'a key cannot be reused for a different transfer'
);
select is(public.transfer_money('marcos villalba', 'GOLD', 100, null, gen_random_uuid()), 400::bigint, 'Gold moves too, and names ignore case');
select throws_ok(
  $$ select public.transfer_money('Marcos Villalba', 'ARG', 3751, null, gen_random_uuid()) $$,
  '22023', 'insufficient_funds', 'nobody sends more than they have'
);
select throws_ok(
  $$ select public.transfer_money('Marcos Villalba', 'ARG', 0, null, gen_random_uuid()) $$,
  '22023', 'amount_invalid', 'amounts are positive'
);
select throws_ok(
  $$ select public.transfer_money('Nadie Existe', 'ARG', 100, null, gen_random_uuid()) $$,
  'P0002', 'recipient_not_found', 'the recipient must exist'
);
select throws_ok(
  $$ select public.transfer_money('Camila Ríos', 'ARG', 100, null, gen_random_uuid()) $$,
  '22023', 'recipient_is_sender', 'nobody transfers to themselves'
);
select throws_ok(
  $$ select public.transfer_money('Marcos Villalba', 'XXX', 100, null, gen_random_uuid()) $$,
  '22023', 'currency_invalid', 'only real currencies'
);
select throws_ok(
  $$ select public.transfer_money('Marcos Villalba', 'ARG', 100, repeat('x', 81), gen_random_uuid()) $$,
  '22023', 'memo_too_long', 'the concept is short'
);
reset role;
select is(pg_temp.balance(:'marcos', 'ARG'), 6250::bigint, 'the recipient got the Credit once');

-- Unconfirmed reservations cannot receive money.
select pg_temp.new_player('olga@example.com', 'Olga Reserva', 'ARG', false) as olga \gset
select pg_temp.act_as(:'camila');
select throws_ok(
  $$ select public.transfer_money('Olga Reserva', 'ARG', 100, null, gen_random_uuid()) $$,
  'P0002', 'recipient_not_found', 'an unconfirmed reservation is not a recipient'
);

-- The statement: each posting with its counterparty and the balance after it.
select results_eq(
  $$ select kind, memo, currency_code, amount, balance_after, counterparty_kind, counterparty_name
     from public.list_my_movements('ARG') $$,
  $$ values ('transfer', 'Por las raciones', 'ARG', -1250::bigint, 3750::bigint, 'citizen', 'Marcos Villalba'),
            ('welcome_grant', null, 'ARG', 5000::bigint, 5000::bigint, 'issuer', null) $$,
  'the statement shows each movement, newest first, with its counterparty'
);
select is(
  (select count(*) from public.list_my_movements())::int,
  4,
  'without a filter it lists every currency'
);
select is(
  (select count(*) from public.list_my_movements(null, (select max(posting_id) from public.list_my_movements()), 50))::int,
  3,
  'pages continue before a given movement'
);
select results_eq(
  $$ select currency_code, balance from public.get_my_balances() order by currency_code $$,
  $$ values ('ARG', 3750::bigint), ('GOLD', 400::bigint) $$,
  'balances of Gold and the local Credit'
);
reset role;
select pg_temp.act_as(:'ana');
select is_empty(
  $$ select * from public.list_my_movements() where kind = 'transfer' $$,
  'nobody sees transfers between other players'
);
select results_eq(
  $$ select currency_code, balance from public.get_my_balances() order by currency_code $$,
  $$ values ('BRA', 5000::bigint), ('GOLD', 500::bigint) $$,
  'each player reads only their own balances'
);
reset role;

-- Rate limit: 20 transfers per hour.
select pg_temp.act_as(:'marcos');
select public.transfer_money('Ana Souza', 'ARG', 1, null, gen_random_uuid()) from generate_series(1, 20);
select throws_ok(
  $$ select public.transfer_money('Ana Souza', 'ARG', 1, null, gen_random_uuid()) $$,
  '22023', 'rate_limited', 'at most 20 transfers per hour'
);
reset role;
set local game.fixed_now = '2026-10-09 13:00:01+00';
select pg_temp.act_as(:'marcos');
select lives_ok(
  $$ select public.transfer_money('Ana Souza', 'ARG', 1, null, gen_random_uuid()) $$,
  'an hour later transfers flow again'
);
reset role;

-- The ledger is append-only.
select throws_ok($$ update game.ledger_postings set amount = 1 $$, '42501', null, 'postings cannot be changed');
select throws_ok($$ delete from game.ledger_postings $$, '42501', null, 'postings cannot be deleted');

-- Internal posting is idempotent too.
select is(
  game.transfer(game.citizen_account(:'camila', 'GOLD'), game.citizen_account(:'ana', 'GOLD'), 10, 'test', null, 'test:once'),
  game.transfer(game.citizen_account(:'camila', 'GOLD'), game.citizen_account(:'ana', 'GOLD'), 10, 'test', null, 'test:once'),
  'posting twice with the same key is one transaction'
);

-- Acceptance: 1,000 random transfers keep the totals and never leave a balance below zero.
do $$
declare
  v_ids uuid[];
begin
  for i in 1..10 loop
    v_ids := v_ids || pg_temp.new_player(format('p%s@example.com', i), format('Jugador %s', i), 'ARG');
  end loop;
end;
$$;
select sum(balance) as before_total, count(*) as accounts
from game.accounts where kind = 'citizen' and currency_code = 'ARG' \gset

do $$
declare
  v_accounts bigint[] := array(select id from game.accounts where kind = 'citizen' and currency_code = 'ARG' order by id);
  v_from bigint;
  v_to bigint;
begin
  perform setseed(0.42);
  for i in 1..1000 loop
    v_from := v_accounts[1 + floor(random() * array_length(v_accounts, 1))::int];
    v_to := v_accounts[1 + floor(random() * array_length(v_accounts, 1))::int];
    continue when v_from = v_to;
    begin
      perform game.transfer(v_from, v_to, 1 + floor(random() * 4000)::bigint, 'test', null);
    exception when others then
      if sqlerrm <> 'insufficient_funds' then raise; end if;
    end;
  end loop;
end;
$$;

select ok(
  (select count(*) from game.ledger_postings where kind = 'test') > 500,
  'most of the random transfers went through'
);
select is(
  (select sum(balance) from game.accounts where kind = 'citizen' and currency_code = 'ARG'),
  :'before_total'::numeric,
  'acceptance: the total money did not change'
);
select is(
  (select count(*) from game.accounts where balance < 0 and kind <> 'issuer')::int,
  0,
  'acceptance: no balance is negative'
);
select is_empty(
  $$ select a.id from game.accounts as a
     where a.balance <> coalesce((select sum(p.amount) from game.ledger_postings as p where p.credit_account_id = a.id), 0)
                      - coalesce((select sum(p.amount) from game.ledger_postings as p where p.debit_account_id = a.id), 0) $$,
  'every balance equals its postings'
);

-- Access.
select ok(not has_function_privilege('anon', 'public.transfer_money(text, text, bigint, text, uuid)', 'EXECUTE'), 'visitors cannot transfer');
select ok(has_function_privilege('authenticated', 'public.transfer_money(text, text, bigint, text, uuid)', 'EXECUTE'), 'players can transfer');

select * from finish();
rollback;

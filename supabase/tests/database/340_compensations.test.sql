-- L3: compensating entries reverse money once, keep supply records consistent, refuse escrows and are audited
-- (ADR 0039).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'), now(), now(), now())
  returning id into v_id;
  return v_id;
end;
$$;

create function pg_temp.act_as(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.gold(p_user uuid)
returns bigint
language sql
as $$
  select coalesce((select balance from game.accounts where kind = 'citizen' and user_id = p_user and currency_code = 'GOLD'), 0);
$$;

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
-- Staff accounts are never citizens (ADR 0049).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@example.com', now(), now(), now())
returning id as admin \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
insert into game.admins (user_id) values (:'admin');

-- A mistaken reward (minted) and a transfer between players.
select game.post('election_reward', 'mistake', null, array[row(game.system_account('issuer', 'GOLD'),
                 game.citizen_account(:'ana', 'GOLD'), 1000, 'election_reward', null)::game.ledger_leg]) as reward \gset
select game.post('transfer', 'gift', :'ana', array[row(game.citizen_account(:'ana', 'GOLD'),
                 game.citizen_account(:'juan', 'GOLD'), 300, 'transfer', null)::game.ledger_leg]) as gift \gset
select hold as held from (select game.hold(game.citizen_account(:'juan', 'GOLD'), 100, 'test', null, 'h1', null) as hold) as h \gset
select transaction_id as hold_tx from game.ledger_postings where kind = 'hold' order by id desc limit 1 \gset
select pg_temp.gold(:'ana') as ana_before \gset
select pg_temp.gold(:'juan') as juan_before \gset

select pg_temp.act_as(:'ana');
select throws_ok(format('select public.admin_compensate(%s, %L)', :'gift', 'Error'), '42501', 'not_admin', 'admins only');
reset role;
select pg_temp.act_as(:'admin');
select results_eq(format('select posting_kind, amount, debit, credit from public.admin_transaction_legs(%s)', :'gift'),
                  $$ values ('transfer', 300::bigint, 'citizen:Ana Gómez', 'citizen:Juan Pérez') $$, 'the admin sees the legs');
select throws_ok(format('select public.admin_compensate(%s, %L)', :'gift', 'no'), '22023', 'reason_invalid', 'a reason is needed');
select throws_ok($$ select public.admin_compensate(999999999, 'Error de carga') $$, 'P0002', 'transaction_not_found', 'it must exist');
select throws_ok(format('select public.admin_compensate(%s, %L)', :'hold_tx', 'Reserva'), '22023', 'not_compensable',
                 'holds are released or captured, not compensated');
select lives_ok(format('select public.admin_compensate(%s, %L)', :'gift', 'Regalo enviado por error'), 'the transfer is reversed');
select throws_ok(format('select public.admin_compensate(%s, %L)', :'gift', 'Otra vez'), '22023', 'already_compensated', 'once');
select lives_ok(format('select public.admin_compensate(%s, %L)', :'reward', 'Premio duplicado'), 'the mistaken reward too');
reset role;
select is(pg_temp.gold(:'juan'), :'juan_before'::bigint - 300, 'Juan gives the 3 GOLD back');
select is(pg_temp.gold(:'ana'), :'ana_before'::bigint + 300 - 1000, 'Ana loses the 10 GOLD reward');
select results_eq($$ select direction, amount, reason from game.supply_changes where reason = 'compensation' $$,
                  $$ values ('burn', 1000::bigint, 'compensation') $$, 'reversing a mint is recorded as a burn');
select is(
  (select sum(case direction when 'mint' then amount else -amount end) from game.supply_changes where currency_code = 'GOLD')::bigint,
  -(select balance from game.accounts where kind = 'issuer' and currency_code = 'GOLD')
    - (select balance from game.accounts where kind = 'sink' and currency_code = 'GOLD'),
  'supply records still match the issuer and the sink'
);
select is((select count(*)::integer from game.admin_log where action = 'compensate_transaction'), 2, 'both are audited');
select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);

select * from finish();
rollback;

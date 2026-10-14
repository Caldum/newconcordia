-- P3: 10% of the GOLD referrals get in their first 30 days, claimable 30 days more (ADR 0043).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

-- A system payment of GOLD to a citizen.
create function pg_temp.pay(p_user uuid, p_kind text, p_amount bigint)
returns void
language sql
as $$
  select game.post(p_kind, p_kind || ':' || gen_random_uuid()::text, null,
                   array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(p_user, 'GOLD'), p_amount, p_kind,
                             null)::game.ledger_leg]);
$$;

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code = 'ARG';
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'ARG') as bea \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
update game.citizens set joined_at = '2026-11-01 10:00:00+00' where user_id in (:'ana', :'juan');
update game.citizens set joined_at = '2026-11-07 09:00:00+00', referred_by_user_id = :'ana' where user_id = :'bea';
select game.citizen_account(:'ana', 'GOLD') as ana_gold \gset

-- What counts. -----------------------------------------------------------------------------------------------------------
select pg_temp.pay(:'bea', 'level_reward', 300);
-- Bea buys 2 GOLD from Juan, then sells 1 back: 1 GOLD bought, net.
reset role;
select pg_temp.act_as(:'juan');
select public.fx_post_offer('ARG', 'sell_gold', 200, 1000, gen_random_uuid()) as juan_offer \gset
reset role;
select pg_temp.act_as(:'bea');
select public.fx_take(:'juan_offer', 200, gen_random_uuid());
select public.fx_post_offer('ARG', 'sell_gold', 100, 1000, gen_random_uuid()) as bea_offer \gset
reset role;
select pg_temp.act_as(:'juan');
select public.fx_take(:'bea_offer', 100, gen_random_uuid());
reset role;
-- A gift from another player does not count.
select game.post('transfer', 'gift:' || gen_random_uuid()::text, :'juan',
                 array[row(game.citizen_account(:'juan', 'GOLD'), game.citizen_account(:'bea', 'GOLD'), 50, 'transfer',
                           null)::game.ledger_leg]);

select pg_temp.act_as(:'ana');
select results_eq(
  $$ select gold_earned, gold_bought, due, claimed, claimable, status from public.list_my_referral_rewards() $$,
  $$ values (300::bigint, 100::bigint, 40::bigint, 0::bigint, 40::bigint, 'earning') $$,
  'system pay and net market purchases count, gifts do not; 10% of them is due');
select is((select earning_until from public.list_my_referral_rewards()), '2026-12-07 09:00:00+00'::timestamptz,
  'the GOLD of the first 30 days counts');
select is((select claim_until from public.list_my_referral_rewards()), '2027-01-06 09:00:00+00'::timestamptz,
  'and it can be claimed 30 days more');

-- Claiming. -------------------------------------------------------------------------------------------------------------
reset role;
select balance as before from game.accounts where id = :'ana_gold' \gset
select pg_temp.act_as(:'ana');
select is(public.claim_referral_rewards(), 40::bigint, 'the referrer claims their share');
select throws_ok($$ select public.claim_referral_rewards() $$, '22023', 'nothing_to_claim', 'and nothing twice');
reset role;
select is((select balance from game.accounts where id = :'ana_gold'), :before::bigint + 40, 'the GOLD is in their account');
select is((select sum(amount)::bigint from game.supply_changes where reason = 'referral_bonus' and direction = 'mint'), 40::bigint,
  'as a system mint');
select pg_temp.pay(:'bea', 'daily_missions', 100);
select pg_temp.act_as(:'ana');
select is((select claimable from public.list_my_referral_rewards()), 10::bigint, 'new GOLD in the window adds to the share');
select is(public.claim_referral_rewards(), 10::bigint, 'only the difference is paid');
reset role;
select is((select count(*)::integer from game.referral_claims where referrer_user_id = :'ana'), 2, 'every claim is recorded');

-- Their own bonus never counts for someone else's referrer, and others do not see these rows.
select pg_temp.act_as(:'juan');
select is((select count(*)::integer from public.list_my_referral_rewards()), 0, 'each player sees only their referrals');
select throws_ok($$ select public.claim_referral_rewards() $$, '22023', 'nothing_to_claim', 'and claims only for them');

-- The window and expiry. ----------------------------------------------------------------------------------------------
reset role;
select set_config('game.fixed_now', '2026-11-20 10:00:00+00', true);
select pg_temp.pay(:'bea', 'resistance_reward', 200);
select set_config('game.fixed_now', '2026-12-08 10:00:00+00', true);
select pg_temp.pay(:'bea', 'level_reward', 1000);
select pg_temp.act_as(:'ana');
select results_eq($$ select due, claimable, status from public.list_my_referral_rewards() $$,
  $$ values (70::bigint, 20::bigint, 'claimable') $$,
  'after 30 days new GOLD no longer counts; what was earned stays claimable');
reset role;
select set_config('game.fixed_now', '2027-01-07 10:00:00+00', true);
select pg_temp.act_as(:'ana');
select results_eq($$ select claimable, status from public.list_my_referral_rewards() $$, $$ values (0::bigint, 'expired') $$,
  'after 30 days more, an unclaimed share expires');
select throws_ok($$ select public.claim_referral_rewards() $$, '22023', 'nothing_to_claim', 'and cannot be claimed');

-- A share fully claimed before the end is done.
reset role;
select set_config('game.fixed_now', '2026-12-20 10:00:00+00', true);
select pg_temp.act_as(:'ana');
select is(public.claim_referral_rewards(), 20::bigint, 'within the claim window the rest is paid');
select results_eq($$ select claimable, status from public.list_my_referral_rewards() $$, $$ values (0::bigint, 'done') $$,
  'and the referral is done');

-- Selling more than was bought never goes below zero.
reset role;
select set_config('game.fixed_now', '2026-11-08 10:00:00+00', true);
select pg_temp.act_as(:'bea');
select public.fx_post_offer('ARG', 'sell_gold', 300, 1000, gen_random_uuid()) as bea_offer2 \gset
reset role;
select pg_temp.act_as(:'juan');
select public.fx_take(:'bea_offer2', 300, gen_random_uuid());
reset role;
select is((select bought from game.referral_gold(:'bea')), 0::bigint, 'net purchases never go below zero');
select is((select earned from game.referral_gold(:'bea')), 600::bigint, 'and system pay is counted apart');

select * from finish();
rollback;

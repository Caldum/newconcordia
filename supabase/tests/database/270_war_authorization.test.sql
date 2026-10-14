-- W1: war authorizations with a 50 GOLD escrow, burned once on launch or refunded once on expiry or cancellation,
-- and enemy designations by law (spec sections 6, 11 and 12.5, ADR 0032).
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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

create function pg_temp.at(p_at text)
returns void
language sql
as $$
  select set_config('game.fixed_now', p_at, true);
$$;

create function pg_temp.treasury()
returns bigint
language sql
as $$
  select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD';
$$;

select pg_temp.at('2026-11-07 10:00:00+00');
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, 'ARG-01')
where code in ('ARG', 'BRA', 'URY');
update game.countries set is_active = false where code = 'CHL';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('elena@example.com', 'Elena Sosa', 'ARG') as elena \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
insert into game.offices (country_code, office, user_id) values ('ARG', 'president', :'camila');
insert into game.mandates (country_code, office, user_id, began_at) values
  ('ARG', 'president', :'camila', game.now()), ('ARG', 'congress', :'elena', game.now()),
  ('ARG', 'congress', :'marcos', game.now());
select game.post('test_treasury', null, null, array[row(game.system_account('issuer', 'GOLD'),
                 game.treasury_account('ARG', 'GOLD'), 20000, 'election_reward', null)::game.ledger_leg]);

-- Terms. -----------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select throws_ok($$ select public.propose_bill('war_authorization', 'Guerra propia', '', '{"country_code": "ARG"}', null) $$,
                 '22023', 'country_invalid', 'not against one''s own country');
select throws_ok($$ select public.propose_bill('war_authorization', 'Guerra a Chile', '', '{"country_code": "CHL"}', null) $$,
                 '22023', 'country_inactive', 'only against a country in play');
select throws_ok($$ select public.propose_bill('alliance', 'Alianza', '', '{"country_code": "BRA"}', null) $$,
                 '22023', 'bill_kind_invalid', 'diplomacy arrives later');
reset role;

-- An authorization that expires. -----------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.propose_bill('war_authorization', 'Guerra a Brasil', '', '{"country_code": "BRA"}', null) as bill1 \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'bill1', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'bill1', 'yes');
reset role;
select is(pg_temp.treasury(), 15000::bigint, 'presenting it locks 50 GOLD');
select pg_temp.at('2026-11-08 10:05:00+00');
select game.job_elections('2026-11-08 10:05:00+00');
select results_eq($$ select target_country_code, status from public.list_war_authorizations('ARG') $$,
                  $$ values ('BRA', 'pending') $$, 'approval leaves it pending for 24 hours');
select is(pg_temp.treasury(), 15000::bigint, 'with the 50 GOLD still locked');
select pg_temp.at('2026-11-09 10:04:00+00');
select is((game.job_elections('2026-11-09 10:04:00+00') ->> 'war_authorizations_expired')::integer, 0, 'not before 24 hours');
select pg_temp.at('2026-11-09 11:05:00+00');
select is((game.job_elections('2026-11-09 11:05:00+00') ->> 'war_authorizations_expired')::integer, 1, 'then it expires');
select is(pg_temp.treasury(), 20000::bigint, 'and the 50 GOLD return');
select is((game.job_elections('2026-11-09 11:06:00+00') ->> 'war_authorizations_expired')::integer, 0, 'exactly once');
select is((select count(*)::integer from game.supply_changes where reason = 'war_authorization'), 0, 'nothing was burned');

-- An authorization that is used. ------------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.propose_bill('war_authorization', 'Segunda guerra a Brasil', '', '{"country_code": "BRA"}', null) as bill2 \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'bill2', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'bill2', 'yes');
reset role;
select pg_temp.at('2026-11-10 11:10:00+00');
select game.job_elections('2026-11-10 11:10:00+00');
select throws_ok($$ select game.consume_war_authorization('ARG', 'URY', null) $$, '22023', 'no_authorization',
                 'no authorization against Uruguay');
select ok(game.consume_war_authorization('ARG', 'BRA', :'camila') > 0, 'the launch consumes the authorization');
select is(pg_temp.treasury(), 15000::bigint, 'the 50 GOLD are spent');
select results_eq($$ select direction, amount from game.supply_changes where reason = 'war_authorization' $$,
                  $$ values ('burn', 5000::bigint) $$, 'and burned once');
select throws_ok($$ select game.consume_war_authorization('ARG', 'BRA', null) $$, '22023', 'no_authorization',
                 'it cannot be used twice');

-- An authorization that is cancelled. ---------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.propose_bill('war_authorization', 'Tercera guerra a Brasil', '', '{"country_code": "BRA"}', null) as bill3 \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'bill3', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'bill3', 'yes');
reset role;
select pg_temp.at('2026-11-11 11:10:00+00');
select game.job_elections('2026-11-11 11:10:00+00');
select id as auth3 from game.war_authorizations where bill_id = :'bill3' \gset
select pg_temp.act_as(:'elena');
select throws_ok(format('select public.cancel_war_authorization(%s)', :'auth3'), '42501', 'not_president', 'only the president');
reset role;
select pg_temp.act_as(:'camila');
select lives_ok(format('select public.cancel_war_authorization(%s)', :'auth3'), 'the president cancels it');
select throws_ok(format('select public.cancel_war_authorization(%s)', :'auth3'), '22023', 'authorization_closed', 'once');
reset role;
select is(pg_temp.treasury(), 15000::bigint, 'the cancelled authorization returns its 50 GOLD');

-- Enemy designations. --------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'camila');
select public.propose_bill('enemy_designation', 'Brasil es enemigo', '', '{"country_code": "BRA"}', null) as b_aylm0 \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'b_aylm0', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'b_aylm0', 'yes');
reset role;
select pg_temp.at('2026-11-12 11:10:00+00');
select game.job_elections('2026-11-12 11:10:00+00');
select results_eq($$ select enemy_country_code from public.get_enemy('ARG') $$, $$ values ('BRA') $$, 'Brazil is the enemy');
select pg_temp.act_as(:'camila');
select public.propose_bill('enemy_designation', 'Uruguay es enemigo', '', '{"country_code": "URY"}', null) as b_7qxsb \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'b_7qxsb', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'b_7qxsb', 'yes');
reset role;
select pg_temp.at('2026-11-13 11:10:00+00');
select game.job_elections('2026-11-13 11:10:00+00');
select results_eq($$ select enemy_country_code from public.get_enemy('ARG') $$, $$ values ('URY') $$,
                  'a new designation replaces it: one enemy at most');
select pg_temp.act_as(:'camila');
select public.propose_bill('enemy_designation', 'Sin enemigos', '', '{}', null) as b_g4ykt \gset
reset role;
select pg_temp.act_as(:'elena');
select public.vote_bill(:'b_g4ykt', 'yes');
reset role;
select pg_temp.act_as(:'marcos');
select public.vote_bill(:'b_g4ykt', 'yes');
reset role;
select pg_temp.at('2026-11-14 11:10:00+00');
select game.job_elections('2026-11-14 11:10:00+00');
select is((select count(*)::integer from public.get_enemy('ARG')), 0, 'and a law ends it');

-- Care for non-enemies. --------------------------------------------------------------------------------------------------
insert into game.enemy_designations (country_code, enemy_country_code, bill_id, since)
values ('ARG', 'BRA', :'bill1', game.now());
insert into game.care_policies (country_code, policy) values ('ARG', 'non_enemies');
select ok(not game.care_allowed('ARG', 'BRA') and game.care_allowed('ARG', 'URY'),
          'hospitals for non-enemies refuse only the enemy''s citizens');

select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);

select * from finish();
rollback;

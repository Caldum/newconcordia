-- ADR 0048: the market square. A player buys where they are (being there is enough, a license is not); a ticket
-- buys several offers at once, every line or none; the market's figures are for the president and the minister
-- of the economy only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into game.mint_reasons (kind, authority, description) values ('test', 'system_reward', 'Test funding.');

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

create function pg_temp.left_in(p_offer bigint)
returns integer
language sql
as $$
  select quantity from game.market_offers where id = p_offer;
$$;

set local game.fixed_now = '2026-11-09 15:00:00+00';

select pg_temp.new_player('camila@example.com', 'Camila Ríos', 'ARG') as camila \gset
select pg_temp.new_player('marcos@example.com', 'Marcos Villalba', 'ARG') as marcos \gset
select pg_temp.new_player('ana@example.com', 'Ana Souza', 'BRA') as ana \gset

select game.put_goods(game.holder_for_citizen(:'camila'), 'food_q1', 'ARG', 30, 'test', 'test');
select game.put_goods(game.holder_for_citizen(:'camila'), 'food_q2', 'ARG', 30, 'test', 'test');
select game.transfer(game.system_account('issuer', 'ARG'), game.citizen_account(:'marcos', 'ARG'), 100000, 'test', null);
select game.transfer(game.system_account('issuer', 'ARG'), game.citizen_account(:'ana', 'ARG'), 100000, 'test', null);

select pg_temp.act_as(:'camila');
select public.post_offer('food_q1', 20, 100, 'ARG', 'c0000000-0000-4000-8000-000000000001') as q1 \gset
select public.post_offer('food_q2', 20, 250, 'ARG', 'c0000000-0000-4000-8000-000000000002') as q2 \gset
reset role;

-- Buying where you are. ------------------------------------------------------------------------------------
select is(game.location_country((select c from game.citizens as c where user_id = :'marcos')), 'ARG',
          'the country a player is in is the owner of their region');
select pg_temp.act_as(:'marcos');
select is(public.buy(:'q1', 1, gen_random_uuid()), 100::bigint, 'in Argentina, Argentina''s market sells to you');
reset role;

insert into game.market_access_licenses (user_id, market_country_code, granted_at) values (:'ana', 'ARG', game.now());
select pg_temp.act_as(:'ana');
select throws_ok(format($$ select public.buy(%s, 1, gen_random_uuid()) $$, :'q1'), '42501', 'not_in_market_country',
                 'from Brazil, not even a license buys in Argentina');
reset role;
update game.citizens set region_code = 'ARG-01' where user_id = :'ana';
select pg_temp.act_as(:'ana');
select is(public.buy(:'q1', 1, gen_random_uuid()), 100::bigint, 'having travelled there, she buys without a license');
reset role;
update game.citizens set region_code = 'BRA-01' where user_id = :'marcos';
select pg_temp.act_as(:'marcos');
select throws_ok(format($$ select public.buy(%s, 1, gen_random_uuid()) $$, :'q1'), '42501', 'not_in_market_country',
                 'an Argentine abroad does not buy in Argentina''s market');
reset role;
update game.citizens set region_code = 'ARG-01' where user_id = :'marcos';

-- A ticket. -----------------------------------------------------------------------------------------------
select pg_temp.act_as(:'marcos');
select is(
  public.buy_ticket(jsonb_build_array(jsonb_build_object('offer_id', :'q1'::bigint, 'quantity', 3),
                                      jsonb_build_object('offer_id', :'q2'::bigint, 'quantity', 2)),
                    'd0000000-0000-4000-8000-000000000001'),
  800::bigint,
  'a ticket buys every line: 3 × 1,00 + 2 × 2,50'
);
reset role;
select results_eq(format($$ select pg_temp.left_in(%s), pg_temp.left_in(%s) $$, :'q1', :'q2'),
                  $$ values (15, 18) $$, 'both offers went down');
select pg_temp.act_as(:'marcos');
select is(
  public.buy_ticket(jsonb_build_array(jsonb_build_object('offer_id', :'q1'::bigint, 'quantity', 3),
                                      jsonb_build_object('offer_id', :'q2'::bigint, 'quantity', 2)),
                    'd0000000-0000-4000-8000-000000000001'),
  800::bigint,
  'a retried ticket returns what was paid'
);
reset role;
select results_eq(format($$ select pg_temp.left_in(%s), pg_temp.left_in(%s) $$, :'q1', :'q2'),
                  $$ values (15, 18) $$, 'and buys nothing twice');

select pg_temp.act_as(:'marcos');
select throws_ok(
  format($$ select public.buy_ticket(jsonb_build_array(jsonb_build_object('offer_id', %s, 'quantity', 1),
                                                       jsonb_build_object('offer_id', %s, 'quantity', 99)),
                                     gen_random_uuid()) $$, :'q1', :'q2'),
  '22023', 'quantity_unavailable', 'a line that cannot be bought stops the ticket'
);
reset role;
select results_eq(format($$ select pg_temp.left_in(%s), pg_temp.left_in(%s) $$, :'q1', :'q2'),
                  $$ values (15, 18) $$, 'and nothing of it is bought');
select pg_temp.act_as(:'marcos');
select throws_ok($$ select public.buy_ticket('[]'::jsonb, gen_random_uuid()) $$, '22023', 'ticket_invalid',
                 'an empty ticket is refused');
select throws_ok(
  $$ select public.buy_ticket((select jsonb_agg(jsonb_build_object('offer_id', n, 'quantity', 1))
                               from generate_series(1, 21) as n), gen_random_uuid()) $$,
  '22023', 'ticket_invalid', 'so is one longer than market_ticket_lines_max'
);
reset role;

-- The figures, for the government only. ------------------------------------------------------------------
select pg_temp.act_as(:'marcos');
select throws_ok($$ select * from public.market_stats('ARG') $$, '42501', 'not_allowed',
                 'a player does not see the market''s figures');
reset role;
insert into game.offices (country_code, office, user_id) values ('ARG', 'minister_economy', :'camila');
select pg_temp.act_as(:'camila');
select results_eq(
  $$ select volume_24h, volume_prev_24h, trades_24h, average_ticket_24h, active_offers, offers_today
     from public.market_stats('ARG') $$,
  $$ values (1000::bigint, 0::bigint, 4, 250::bigint, 2, 2) $$,
  'the minister of the economy sees the volume, the average ticket and the offers'
);
select throws_ok($$ select * from public.market_stats('BRA') $$, '42501', 'not_allowed',
                 'only of their own country');
reset role;
select ok(
  not has_function_privilege('anon', 'public.market_stats(text)', 'execute'),
  'visitors cannot ask for them'
);

select * from finish();
rollback;

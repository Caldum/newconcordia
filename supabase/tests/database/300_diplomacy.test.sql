-- W5: alliances by laws of both nations, broken relations, embargoes on the market, peace, allies in battles and
-- hospitals, and travel off until its price is decided (spec sections 6 and 13, ADR 0035).
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

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

-- A law of p_country presented by its president and voted by its two members (claims only, no role switch).
create function pg_temp.law(p_country text, p_kind text, p_terms jsonb)
returns bigint
language plpgsql
as $$
declare
  v_bill bigint;
  v_member uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select user_id from game.offices where country_code = p_country and office = 'president'))::text, true);
  v_bill := public.propose_bill(p_kind, p_kind || ' ' || coalesce(p_terms ->> 'country_code', ''), '', p_terms, null);
  for v_member in select user_id from game.mandates where country_code = p_country and office = 'congress' loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_member)::text, true);
    perform public.vote_bill(v_bill, 'yes');
  end loop;
  return v_bill;
end;
$$;

-- Moves the clock a day and runs the hourly job, which counts the bills.
create function pg_temp.next_day()
returns void
language plpgsql
as $$
begin
  perform set_config('game.fixed_now', (game.now() + interval '1 day 1 minute')::text, true);
  perform game.job_elections(game.now());
end;
$$;

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
select set_config('game.fixed_random', '0.9', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code in ('ARG', 'BRA', 'CHL');

-- Two governments with a Congress of two each, and some citizens.
create temp table people (name text, country text, office text, user_id uuid);
insert into people
select p.name, p.country, p.office, pg_temp.new_player(lower(replace(p.name, ' ', '')) || '@example.com', p.name, p.country)
from (values ('Camila Ríos', 'ARG', 'president'), ('Elena Sosa', 'ARG', 'congress'), ('Marcos Villalba', 'ARG', 'congress'),
             ('Ana Gómez', 'ARG', null), ('Bea Lima', 'BRA', 'president'), ('Beto Ruiz', 'BRA', 'congress'),
             ('Bruno Costa', 'BRA', 'congress'), ('Bia Souza', 'BRA', null), ('Carla Vera', 'CHL', null))
       as p (name, country, office);
insert into game.offices (country_code, office, user_id) select country, office, user_id from people where office = 'president';
insert into game.mandates (country_code, office, user_id, began_at) select country, office, user_id, game.now() from people where office is not null;
select user_id as ana from people where name = 'Ana Gómez' \gset
select user_id as bia from people where name = 'Bia Souza' \gset
select user_id as carla from people where name = 'Carla Vera' \gset
select user_id as elena from people where name = 'Elena Sosa' \gset
select game.post('test_treasury', null, null, array[row(game.system_account('issuer', 'GOLD'),
                 game.treasury_account('ARG', 'GOLD'), 20000, 'election_reward', null)::game.ledger_leg]);

-- Alliances need laws of both nations. ----------------------------------------------------------------------------------
select pg_temp.law('ARG', 'alliance', '{"country_code": "BRA"}');
select pg_temp.next_day();
select ok(not game.allied('ARG', 'BRA'), 'one law is not an alliance');
select results_eq($$ select relation, other_country_code, ours from public.list_foreign_relations('BRA') $$,
                  $$ values ('alliance_pending', 'ARG', false) $$, 'Brazil sees Argentina''s offer');
select pg_temp.law('BRA', 'alliance', '{"country_code": "ARG"}');
select pg_temp.next_day();
select ok(game.allied('ARG', 'BRA') and game.allied('BRA', 'ARG'), 'the reciprocal law forms the alliance');

-- Allies fight remotely and are treated by «allies» hospitals.
insert into game.battles (region_code, attacker_country_code, defender_country_code, started_at)
values ('CHL-01', 'ARG', 'CHL', game.now()) returning id as battle \gset
select pg_temp.act_as(:'bia');
select lives_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle', 'attacker'),
                'a Brazilian fights for her ally from home');
reset role;
insert into game.care_policies (country_code, policy) values ('ARG', 'allies');
select ok(game.care_allowed('ARG', 'BRA') and not game.care_allowed('ARG', 'CHL'), 'allies hospitals treat allies, not others');

-- Breaking relations ends the alliance and blocks a new one. -----------------------------------------------------------
select pg_temp.law('ARG', 'break_relations', '{"country_code": "BRA"}');
select pg_temp.next_day();
select ok(not game.allied('ARG', 'BRA'), 'broken relations end the alliance');
select throws_ok($$ select pg_temp.law('BRA', 'alliance', '{"country_code": "ARG"}') $$, '22023', 'relations_broken',
                 'no alliance while relations are broken');
insert into game.battles (region_code, attacker_country_code, defender_country_code, started_at)
values ('CHL-02', 'ARG', 'CHL', game.now()) returning id as battle2 \gset
select pg_temp.act_as(:'bia');
select throws_ok(format('select * from public.attack(%s, %L, gen_random_uuid())', :'battle2', 'attacker'), '42501',
                 'not_eligible', 'nor remote fighting for a former ally');
reset role;

-- Peace restores relations, ends the enemy designation and refunds pending war authorizations. -----------------------------
select pg_temp.law('ARG', 'enemy_designation', '{"country_code": "BRA"}');
select pg_temp.law('ARG', 'war_authorization', '{"country_code": "BRA"}');
select pg_temp.next_day();
select is(game.enemy_of('ARG'), 'BRA', 'Brazil is the enemy');
select is((select count(*)::integer from game.war_authorizations where status = 'pending'), 1, 'and a war is authorized');
select is((select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD'),
          15000::bigint, 'its 50 GOLD locked');
select pg_temp.law('ARG', 'peace', '{"country_code": "BRA"}');
select pg_temp.next_day();
select ok(game.enemy_of('ARG') is null, 'peace ends the designation');
select is((select status from game.war_authorizations order by id desc limit 1), 'cancelled', 'cancels the authorization');
select is((select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD'),
          20000::bigint, 'returns its 50 GOLD');
select ok(not game.relations_broken('ARG', 'BRA'), 'and restores relations');

-- Embargoes on the market. ---------------------------------------------------------------------------------------------------
select game.put_goods(game.holder_for_citizen(:'ana'), g, o, 10, 'test', null)
from (values ('food_q1', 'BRA'), ('food_q1', 'CHL'), ('weapon_q1', 'CHL')) as s (g, o);
select pg_temp.act_as(:'ana');
select public.post_offer('food_q1', 2, 100, 'ARG', gen_random_uuid(), null, 'BRA') as brazilian_food \gset
reset role;
select pg_temp.law('ARG', 'embargo', '{"country_code": "BRA", "kind": "economic"}');
select pg_temp.law('ARG', 'embargo', '{"country_code": "CHL", "kind": "arms"}');
select throws_ok($$ select pg_temp.law('ARG', 'embargo', '{"country_code": "BRA", "kind": "total"}') $$, '22023',
                 'bill_terms_invalid', 'economic or arms');
select pg_temp.next_day();
select pg_temp.act_as(:'ana');
select throws_ok($$ select public.post_offer('food_q1', 1, 100, 'ARG', gen_random_uuid(), null, 'BRA') $$, '22023', 'embargoed',
                 'goods made in Brazil cannot be offered in Argentina');
select throws_ok($$ select public.post_offer('weapon_q1', 1, 100, 'ARG', gen_random_uuid(), null, 'CHL') $$, '22023', 'embargoed',
                 'nor Chilean weapons, under the arms embargo');
select lives_ok($$ select public.post_offer('food_q1', 1, 100, 'ARG', gen_random_uuid(), null, 'CHL') $$,
                'but Chilean food can');
reset role;
select pg_temp.act_as(:'elena');
select throws_ok(format('select public.buy(%s, 1, gen_random_uuid())', :'brazilian_food'), '22023', 'embargoed',
                 'and an offer of Brazilian goods posted before cannot be bought');
reset role;
select results_eq($$ select relation, other_country_code, detail from public.list_foreign_relations('ARG') where relation = 'embargo' $$,
                  $$ values ('embargo', 'BRA', 'economic'), ('embargo', 'CHL', 'arms') $$, 'embargoes are public');
select pg_temp.law('ARG', 'lift_embargo', '{"country_code": "BRA", "kind": "economic"}');
select pg_temp.next_day();
select pg_temp.act_as(:'ana');
select lives_ok($$ select public.post_offer('food_q1', 1, 100, 'ARG', gen_random_uuid(), null, 'BRA') $$,
                'lifting the embargo opens trade again');
reset role;

-- Travel. -----------------------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select results_eq($$ select enabled from public.get_travel_terms() $$, $$ values (true) $$,
                  'travel is open since its price was decided (ADR 0042)');
select throws_ok($$ select public.travel('ZZZ-01', gen_random_uuid()) $$, '22023', 'region_invalid', 'only to a region');
reset role;
select pg_temp.act_as(:'ana');
select is(public.travel('ARG-02', gen_random_uuid()), 'ARG-02', 'a citizen travels');
select throws_ok($$ select public.travel('ARG-02', gen_random_uuid()) $$, '22023', 'region_invalid', 'somewhere else');
reset role;
update game.player_stats set health = 0 where user_id = :'ana';
select pg_temp.act_as(:'ana');
select throws_ok($$ select public.travel('ARG-01', gen_random_uuid()) $$, '22023', 'health_zero', 'nobody travels at zero health');
reset role;

select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);

select * from finish();
rollback;

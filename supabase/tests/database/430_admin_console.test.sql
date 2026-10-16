-- Admin console: staff apart from players, GOLD prices and their split, balance parameters, sanctions and the
-- moderation tools (ADR 0049).
begin;
create extension if not exists pgtap with schema extensions;
select plan(76);

insert into game.mint_reasons (kind, authority, description) values ('test', 'system_reward', 'Test funding.');

create function pg_temp.new_player(p_email text, p_name text, p_country text)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
          jsonb_build_object('citizen_name', p_name, 'country_code', p_country, 'locale', 'es'), now(), now(), now())
  returning id;
$$;

-- An account with no citizen: what the owner creates in Supabase Auth for the staff.
create function pg_temp.new_account(p_email text)
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email,
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

select set_config('game.fixed_now', '2026-11-11 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code = 'ARG';

select pg_temp.new_account('owner@example.com') as owner \gset
select pg_temp.new_account('mod@example.com') as moderator \gset
select pg_temp.new_account('later@example.com') as later \gset
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
insert into game.admins (user_id) values (:'owner');

-- Staff accounts are never citizens. ---------------------------------------------------------------------------------
select throws_ok(format($$ insert into game.admins (user_id) values (%L) $$, :'ana'), '23514', 'staff_is_citizen',
  'a citizen cannot be made staff');
select throws_ok(format($$ select game.create_citizen(%L, 'Dueña Admin', 'ARG', 'es') $$, :'owner'), '42501',
  'staff_account', 'a staff account cannot get a citizen');
-- An admin row from before this rule, whose account is a citizen, grants nothing.
alter table game.admins disable trigger admins_not_citizens;
insert into game.admins (user_id) values (:'juan');
alter table game.admins enable trigger admins_not_citizens;
select is(game.staff_role(:'juan'), null, 'an older admin row of a citizen grants no role');
delete from game.admins where user_id = :'juan';

reset role;
select pg_temp.act_as(:'owner');
select results_eq($$ select role, email from public.get_my_staff() $$, $$ values ('admin', 'owner@example.com') $$,
  'the admin sees their role');
select lives_ok(format($$ select public.admin_grant_staff(%L, 'moderator') $$, 'MOD@example.com '),
  'an admin makes an account a moderator by email');
select throws_ok($$ select public.admin_grant_staff('ana@example.com', 'moderator') $$, '22023', 'staff_is_citizen',
  'a player''s account cannot be staff');
select throws_ok($$ select public.admin_grant_staff('owner@example.com', 'moderator') $$, '22023', 'staff_self',
  'nobody changes their own role');
select throws_ok($$ select public.admin_grant_staff('nobody@example.com', 'moderator') $$, 'P0002', 'account_not_found',
  'the account must exist');
select throws_ok($$ select public.admin_grant_staff('later@example.com', 'owner') $$, '22023', 'role_invalid',
  'only admin and moderator are roles');
select lives_ok($$ select public.admin_grant_staff('later@example.com', 'admin') $$, 'a second admin');
select lives_ok($$ select public.admin_revoke_staff('later@example.com') $$, 'and removed again');
select throws_ok($$ select public.admin_revoke_staff('owner@example.com') $$, '22023', 'staff_self',
  'nobody removes themselves');
select results_eq($$ select email, role, is_citizen from public.admin_list_team() $$,
  $$ values ('owner@example.com', 'admin', false), ('mod@example.com', 'moderator', false) $$, 'the team');
reset role;
select results_eq($$ select action, target, after ->> 'role' from game.admin_log
                     where action in ('grant_staff', 'revoke_staff') order by id $$,
  $$ values ('grant_staff', 'mod@example.com', 'moderator'), ('grant_staff', 'later@example.com', 'admin'),
            ('revoke_staff', 'later@example.com', null) $$,
  'staff changes are audited');

reset role;
select pg_temp.act_as(:'moderator');
select results_eq($$ select role from public.get_my_staff() $$, $$ values ('moderator') $$, 'the moderator''s role');
select is(public.am_i_admin(), false, 'a moderator is not an admin');
select throws_ok($$ select * from public.admin_list_params() $$, '42501', 'not_admin',
  'parameters are for admins only');
select throws_ok($$ select * from public.admin_list_gold_prices() $$, '42501', 'not_admin',
  'GOLD prices are for admins only');
select lives_ok($$ select * from public.admin_list_reports() $$, 'moderators see the reports');
reset role;
select pg_temp.act_as(:'ana');
select is((select count(*)::integer from public.get_my_staff()), 0, 'a player has no staff role');
select throws_ok($$ select public.admin_overview() $$, '42501', 'not_staff', 'players see no console');

-- GOLD prices and their split. ---------------------------------------------------------------------------------------
reset role;
select results_eq(
  $$ select key, price, beneficiary, country_share_bp from game.gold_prices
     where key in ('company_level_1', 'company_level_5', 'party_founding', 'presidential_ticket', 'party_list',
                   'training_session_basic', 'war_authorization', 'market_license') order by key $$,
  $$ values ('company_level_1', 1000::bigint, 'host_country', 0), ('company_level_5', 20000::bigint, 'host_country', 0),
            ('market_license', 1000::bigint, 'market_country', 5000), ('party_founding', 5000::bigint, 'party_country', 0),
            ('party_list', 1000::bigint, 'party_country', 5000),
            ('presidential_ticket', 2000::bigint, 'party_country', 5000),
            ('training_session_basic', 0::bigint, 'citizen_country', 0),
            ('war_authorization', 5000::bigint, 'none', 0) $$,
  'the prices keep their values; fixed treasury amounts become their percentage'
);
select is((select count(*)::integer from game.balance_params
           where key in ('party_founding_gold', 'resistance_fee', 'market_license_price', 'company_level1_gold')), 0,
  'the prices left the balance parameters');
select is((select count(*)::integer from game.gold_prices), 23, 'every GOLD payment has a price');
set local role anon;
select is((select count(*)::integer from public.get_gold_prices()), 23, 'anyone reads the prices');
reset role;

reset role;
select pg_temp.act_as(:'owner');
select throws_ok($$ select public.admin_set_gold_price('party_founding', 6000, 4000, '') $$, '22023', 'reason_required',
  'a price change needs a reason');
select throws_ok($$ select public.admin_set_gold_price('party_founding', 0, 0, 'Gratis') $$, '22023', 'price_invalid',
  'a payment recognised by its ledger transaction cannot be free');
select throws_ok($$ select public.admin_set_gold_price('war_authorization', 5000, 1000, 'Para el país') $$, '22023',
  'share_invalid', 'the state''s own payments have no country share');
select throws_ok($$ select public.admin_set_gold_price('party_founding', 6000, 10001, 'Demasiado') $$, '22023',
  'share_invalid', 'at most 100 %');
select throws_ok($$ select public.admin_set_gold_price('party_founding', 5000, 0, 'Igual') $$, '22023', 'no_change',
  'nothing to change');
select lives_ok($$ select public.admin_set_gold_price('party_founding', 6000, 4000, 'Más partidos serios') $$,
  'an admin sets a price and its split');
select lives_ok($$ select public.admin_set_gold_price('training_session_basic', 10, 10000, 'Prueba') $$,
  'a session may cost and go whole to the country');
select lives_ok($$ select public.admin_set_gold_price('training_session_basic', 0, 0, 'Vuelve a ser gratis') $$,
  'and be free again (sessions are recognised by their day)');
reset role;
select results_eq($$ select before, after - 'reason' from game.admin_log
                     where action = 'set_gold_price' and target = 'party_founding' $$,
  $$ values ('{"price": 5000, "country_share_bp": 0}'::jsonb, '{"price": 6000, "country_share_bp": 4000}'::jsonb) $$,
  'price changes are audited');

-- 60 GOLD: 40 % (24) to Argentina's treasury, 36 burned.
select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account(:'ana', 'GOLD'), 10000, 'test', null);
select coalesce((select balance from game.accounts
                  where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD'), 0) as treasury_before \gset
select balance as sink_before from game.accounts where kind = 'sink' and currency_code = 'GOLD' \gset
reset role;
select pg_temp.act_as(:'ana');
select lives_ok($$ select public.found_party('Partido Nuevo', '', gen_random_uuid()) $$, 'founding a party at the new price');
reset role;
select is((select balance from game.accounts where kind = 'treasury' and country_code = 'ARG' and currency_code = 'GOLD')
          - :treasury_before, 2400::bigint, 'the country receives its share');
select is((select balance from game.accounts where kind = 'sink' and currency_code = 'GOLD') - :'sink_before'::bigint,
  3600::bigint, 'the rest leaves the game');
select is((select balance from game.accounts where kind = 'citizen' and user_id = :'ana' and currency_code = 'GOLD'),
  500::bigint + 10000 - 6000, 'the founder paid the whole price');

-- Balance parameters. ------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'owner');
select throws_ok($$ select public.admin_set_param('closed_beta', 1, 'Cerrar') $$, '22023', 'param_managed',
  'the closed beta has its own switch');
select throws_ok($$ select public.admin_set_param('food_appetite_max', -1, 'Negativo') $$, '22023', 'value_invalid',
  'no negative values');
select throws_ok($$ select public.admin_set_param('no_such_param', 1, 'Nada') $$, 'P0002', 'param_invalid',
  'only existing parameters');
select lives_ok($$ select public.admin_set_param('mission_reward', 200, 'Doble recompensa esta semana') $$,
  'an admin changes a parameter');
reset role;
select is(game.param('mission_reward'), 200::numeric, 'the rules read the new value at once');
select results_eq($$ select before, after - 'reason' from game.admin_log where action = 'set_param' $$,
  $$ values ('{"value": 100}'::jsonb, '{"value": 200}'::jsonb) $$, 'parameter changes are audited');

-- Sanctions. ---------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'moderator');
select throws_ok($$ select public.admin_sanction('Nadie', 'mute', 'spam', 'Spam en mensajes', 24) $$, 'P0002',
  'citizen_not_found', 'sanctions need an existing citizen');
select throws_ok($$ select public.admin_sanction('Juan Pérez', 'suspension', 'cheating', 'Multicuentas', null) $$,
  '42501', 'admin_only', 'moderators do not suspend for good');
select throws_ok($$ select public.admin_sanction('Juan Pérez', 'suspension', 'cheating', 'Multicuentas', 1000) $$,
  '42501', 'admin_only', 'nor longer than 30 days');
select throws_ok($$ select public.admin_sanction('Juan Pérez', 'mute', 'spam', '', 24) $$, '22023', 'note_invalid',
  'the player is told why');
select public.admin_sanction('juan pérez', 'mute', 'spam', 'Spam en mensajes privados', 24) as mute \gset
reset role;
select is((select kind || ':' || (payload ->> 'kind') from game.notifications where user_id = :'juan' and kind = 'sanction'),
  'sanction:mute', 'the player is notified');

reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.send_message('Ana Gómez', 'Compra mi oro', gen_random_uuid()) $$, '42501', 'muted',
  'a muted citizen sends no messages');
select results_eq($$ select kind, reason from public.get_my_sanctions() $$, $$ values ('mute', 'spam') $$,
  'the player sees the sanction in force');
select lives_ok($$ select public.check_request() $$, 'a mute does not stop other actions');
reset role;
update game.citizens set bio = '' where user_id = :'juan';
select pass('clearing a muted citizen''s description still works');

reset role;
select pg_temp.act_as(:'moderator');
select lives_ok(format($$ select public.admin_revoke_sanction(%s, 'Era un malentendido') $$, :'mute'),
  'a moderator lifts it');
select throws_ok(format($$ select public.admin_revoke_sanction(%s, 'Otra vez') $$, :'mute'), '22023', 'sanction_closed',
  'once');
reset role;
select pg_temp.act_as(:'juan');
select lives_ok($$ select public.send_message('Ana Gómez', 'Perdón', gen_random_uuid()) $$, 'they can write again');

reset role;
select pg_temp.act_as(:'owner');
select public.admin_sanction('Juan Pérez', 'suspension', 'cheating', 'Multicuentas comprobadas', null) as ban \gset
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.check_request() $$, 'PT403', 'account_suspended',
  'a suspended player''s writes are refused');
select throws_ok($$ select public.send_message('Ana Gómez', 'Hola', gen_random_uuid()) $$, '42501', 'muted',
  'a suspension also mutes');
reset role;
select pg_temp.act_as(:'moderator');
select throws_ok(format($$ select public.admin_revoke_sanction(%s, 'Perdonado') $$, :'ban'), '42501', 'admin_only',
  'only an admin lifts a suspension for good');
select results_eq($$ select citizen_name, kind, ends_at is null from public.admin_list_sanctions(true) $$,
  $$ values ('Juan Pérez', 'suspension', true) $$, 'the sanctions in force');

-- Searching and the citizen's record. --------------------------------------------------------------------------------
select throws_ok($$ select * from public.admin_search_citizens('a') $$, '22023', 'query_too_short', 'two characters at least');
select results_eq($$ select name, sanction from public.admin_search_citizens('PÉREZ') $$,
  $$ values ('Juan Pérez', 'suspension') $$, 'search by name, with the sanction in force');
select results_eq($$ select name from public.admin_search_citizens('ana@example') $$, $$ values ('Ana Gómez') $$,
  'search by email');
select is((select count(*)::integer from public.admin_search_citizens('%_')), 0, 'wildcards are literal');
select lives_ok($$ select public.admin_add_note('Juan Pérez', 'Cuatro cuentas desde la misma red') $$, 'a staff note');
select is(public.admin_get_citizen('Juan Pérez') -> 'notes' -> 0 ->> 'body', 'Cuatro cuentas desde la misma red',
  'the record shows the notes');
select is(jsonb_array_length(public.admin_get_citizen('Juan Pérez') -> 'sanctions'), 2, 'and every sanction');
select is(public.admin_get_citizen('Ana Gómez') -> 'party' ->> 'name', 'Partido Nuevo', 'and the party');

-- Renaming and hiding. -----------------------------------------------------------------------------------------------
select throws_ok($$ select public.admin_rename_citizen('Ana Gómez', 'Juan Pérez', 'Nombre ofensivo') $$, '23505',
  'citizen_name_taken', 'a new name must be free');
select lives_ok($$ select public.admin_rename_citizen('Juan Pérez', 'Juan Renombrado', 'Nombre ofensivo') $$,
  'moderation replaces an offensive name');
reset role;
select is((select name from game.citizens where user_id = :'juan'), 'Juan Renombrado', 'the name changed');
select throws_ok(format($$ update game.citizens set name = 'Otro Nombre' where user_id = %L $$, :'juan'), '23514',
  'citizen_name_immutable', 'and stays immutable outside moderation');
select id as party from game.parties where name = 'Partido Nuevo' \gset
select pg_temp.act_as(:'moderator');
select lives_ok(format($$ select public.admin_rename('party', %s, 'Partido Renombrado', 'Nombre engañoso') $$,
                       :'party'),
  'moderation renames a party');

reset role;
insert into game.newspapers (owner_user_id, country_code, name, created_at) values (:'ana', 'ARG', 'La Voz', game.now());
insert into game.articles (newspaper_id, author_user_id, title, body, published_at)
select id, :'ana', 'Insultos', 'Texto ofensivo', game.now() from game.newspapers where name = 'La Voz';
select id as article from game.articles where title = 'Insultos' \gset
insert into game.reports (reporter_user_id, target_kind, target_id, reason, created_at)
values (:'juan', 'article', :'article', 'abuse', game.now());
reset role;
select pg_temp.act_as(:'moderator');
select lives_ok(format($$ select public.admin_hide_content('article', %L, 'Insultos a otro jugador') $$, :'article'),
  'moderation hides an article directly');
reset role;
select results_eq(format($$ select a.hidden_at is not null, r.status from game.articles as a
                            join game.reports as r on r.target_id = a.id::text where a.id = %s $$, :'article'),
  $$ values (true, 'actioned') $$, 'and closes its reports');

reset role;
select pg_temp.act_as(:'moderator');
select results_eq($$ select (public.admin_overview() ->> 'suspended')::integer, (public.admin_overview() ->> 'citizens')::integer $$,
  $$ values (1, 2) $$, 'the overview counts suspended players and citizens');
reset role;

select * from finish();
rollback;

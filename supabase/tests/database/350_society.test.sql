-- L4: daily missions paid once with the 7-day streak, first steps, press and private messages (ADR 0040).
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

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

-- Records the day's work, training and five hits for a player (the article is read through the API).
create function pg_temp.do_day(p_user uuid)
returns void
language plpgsql
as $$
declare
  v_company bigint := (select id from game.companies limit 1);
  v_battle bigint := (select id from game.battles limit 1);
begin
  insert into game.work_shifts (user_id, company_id, game_day, kind, gross, tax, good_code, output, inputs, idempotency_key, created_at)
  values (p_user, v_company, game.game_day(), 'regular', 0, 0, 'food_raw', 0, 0, gen_random_uuid()::text, game.now());
  insert into game.training_sessions (user_id, kind, game_day, center_level, energy_spent, fee, strength_gained, xp_gained, created_at)
  values (p_user, 'basic', game.game_day(), 1, 10, 0, 5, 5, game.now());
  insert into game.battle_attacks (battle_id, round_no, user_id, side, damage, military_xp, civil_xp, energy_after, idempotency_key, created_at)
  select v_battle, 1, p_user, 'attacker', 10, 10, 10, 50, gen_random_uuid()::text, game.now() from generate_series(1, 5);
end;
$$;

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code in ('ARG', 'BRA');
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
values ('Granja', :'juan', 'ARG', 'ARG-01', 'food_raw', game.now());
insert into game.battles (region_code, attacker_country_code, defender_country_code, started_at)
values ('BRA-01', 'ARG', 'BRA', game.now());

-- Press. -------------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.publish_article('Hola', 'Texto', null) $$, 'P0002', 'no_newspaper', 'a newspaper first');
select throws_ok($$ select public.found_newspaper('X') $$, '22023', 'name_invalid', 'a name of 3 to 60');
select lives_ok($$ select public.found_newspaper('La Voz del Plata') $$, 'Juan founds a newspaper');
select throws_ok($$ select public.found_newspaper('Otra Voz') $$, '22023', 'already_has_newspaper', 'one each');
select public.publish_article('Abre el mercado', 'Hoy se abrió el mercado nacional.', '00000000-0000-0000-0000-00000000fa01') as article \gset
select is(public.publish_article('Abre el mercado', 'Hoy se abrió el mercado nacional.', '00000000-0000-0000-0000-00000000fa01'),
          :'article'::bigint, 'once per key');
select throws_ok($$ select public.publish_article('Vacío', '   ', null) $$, '22023', 'article_invalid', 'an article has text');
reset role;
select pg_temp.act_as(:'bea');
select throws_ok($$ select public.found_newspaper('la voz del plata') $$, '22023', 'name_taken', 'names are unique');
reset role;

-- Missions. ------------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select results_eq($$ select mission, progress, goal, done from public.get_my_missions() $$,
                  $$ values ('work', 0, 1, false), ('train', 0, 1, false), ('fight', 0, 5, false), ('read', 0, 1, false) $$,
                  'four missions to do');
select throws_ok($$ select * from public.claim_daily_missions() $$, '22023', 'missions_incomplete', 'nothing to claim yet');
reset role;
select pg_temp.do_day(:'ana');
select pg_temp.act_as(:'ana');
select results_eq($$ select mission, done from public.get_my_missions() where not done $$, $$ values ('read', false) $$,
                  'only the reading is missing');
select results_eq(format('select title, newspaper from public.read_article(%s)', :'article'),
                  $$ values ('Abre el mercado', 'La Voz del Plata') $$, 'Ana reads the article');
select results_eq($$ select article_id, readers, read_by_me from public.list_articles('ARG') $$,
                  format('values (%s::bigint, 1, true)', :'article'), 'the press shows it read');
select results_eq($$ select reward, streak from public.claim_daily_missions() $$, $$ values (100::bigint, 1) $$,
                  'the four missions pay 1 GOLD');
select throws_ok($$ select * from public.claim_daily_missions() $$, '22023', 'already_claimed', 'once a day');
reset role;

-- Seven days in a row pay 3 GOLD more.
do $$
declare
  v_day integer;
  v_ana uuid := (select user_id from game.citizens where name = 'Ana Gómez');
begin
  for v_day in 1 .. 6 loop
    perform set_config('game.fixed_now', (timestamptz '2026-11-07 10:00:00+00' + make_interval(days => v_day))::text, true);
    perform pg_temp.do_day(v_ana);
    insert into game.article_reads (article_id, user_id, read_at)
    select a.id, v_ana, game.now() from game.articles as a limit 1
    on conflict (article_id, user_id) do update set read_at = excluded.read_at;
    perform set_config('request.jwt.claims', json_build_object('sub', v_ana)::text, true);
    perform public.claim_daily_missions();
  end loop;
end;
$$;
select results_eq(format('select streak, reward from game.mission_claims where user_id = %L order by game_day desc limit 1', :'ana'),
                  $$ values (7, 400::bigint) $$, 'the seventh day in a row pays 4 GOLD');
select results_eq($$ select reason, sum(amount)::bigint from game.supply_changes where reason in ('daily_missions', 'mission_streak') group by reason order by reason $$,
                  $$ values ('daily_missions', 700::bigint), ('mission_streak', 300::bigint) $$, 'minted as system rewards');

-- First steps. --------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select results_eq($$ select step, done from public.get_my_first_steps() $$,
                  $$ values ('work', true), ('buy', false), ('train', true), ('read', true), ('party', false), ('fight', true) $$,
                  'the checklist follows what she did');
reset role;

-- Messages. ------------------------------------------------------------------------------------------------------------
select pg_temp.act_as(:'ana');
select throws_ok($$ select public.send_message('Nadie', 'Hola', null) $$, '22023', 'recipient_invalid', 'to an existing citizen');
select throws_ok($$ select public.send_message('Ana Gómez', 'Hola', null) $$, '22023', 'recipient_invalid', 'not to oneself');
select throws_ok($$ select public.send_message('Bea Lima', '  ', null) $$, '22023', 'message_invalid', 'with text');
select lives_ok($$ select public.send_message('bea lima', '¡Hola, Bea!', '00000000-0000-0000-0000-00000000fb01') $$,
                'Ana writes to Bea');
select lives_ok($$ select public.send_message('Bea Lima', '¡Hola, Bea!', '00000000-0000-0000-0000-00000000fb01') $$, 'once per key');
reset role;
select pg_temp.act_as(:'bea');
select results_eq($$ select other_name, last_body, unread from public.list_conversations() $$,
                  $$ values ('Ana Gómez', '¡Hola, Bea!', 1) $$, 'Bea has one unread message from Ana');
select results_eq($$ select mine, body from public.list_messages('Ana Gómez') $$, $$ values (false, '¡Hola, Bea!') $$,
                  'she reads it');
select results_eq($$ select unread from public.list_conversations() $$, $$ values (0) $$, 'and it is read');
reset role;
select pg_temp.act_as(:'juan');
select is((select count(*)::integer from public.list_conversations()), 0, 'nobody else sees it');
reset role;

select is(
  (select count(*)::integer from (select currency_code from game.accounts group by currency_code having sum(balance) <> 0) as c),
  0,
  'every currency balances'
);

select * from finish();
rollback;

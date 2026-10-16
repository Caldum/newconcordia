-- L5: legal acceptance by version, reports and audited moderation, the closed beta (ADR 0044).
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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

select set_config('game.fixed_now', '2026-11-07 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code = 'ARG';
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
-- Staff accounts are never citizens (ADR 0049).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'mod@example.com', now(), now(), now())
returning id as admin \gset
insert into game.admins (user_id) values (:'admin');
insert into game.newspapers (owner_user_id, country_code, name, created_at) values (:'juan', 'ARG', 'El Faro', game.now());
insert into game.articles (newspaper_id, author_user_id, title, body, published_at)
select id, :'juan', 'Un insulto', 'Texto ofensivo', game.now() from game.newspapers where name = 'El Faro';
select id as article from game.articles where title = 'Un insulto' \gset
insert into game.messages (sender_user_id, recipient_user_id, body, sent_at) values (:'juan', :'ana', 'Spam spam', game.now());
select id as message from game.messages where body = 'Spam spam' \gset
insert into game.messages (sender_user_id, recipient_user_id, body, sent_at) values (:'ana', :'juan', 'Hola', game.now());
select id as own_message from game.messages where body = 'Hola' \gset

-- Legal acceptance. ---------------------------------------------------------------------------------------------------
reset role;
reset role;
select pg_temp.act_as(:'ana');
select results_eq($$ select document, version, accepted from public.get_my_legal_status() order by document $$,
  $$ values ('privacy', 1, false), ('terms', 1, false) $$, 'a new player has not accepted the documents in force');
select throws_ok($$ select public.accept_legal(0, 1) $$, '22023', 'legal_version_invalid', 'only the versions in force');
select lives_ok($$ select public.accept_legal(1, 1) $$, 'the player accepts them');
select lives_ok($$ select public.accept_legal(1, 1) $$, 'accepting again changes nothing');
select is((select bool_and(accepted) from public.get_my_legal_status()), true, 'both are accepted');
reset role;
update game.balance_params set value = 2 where key = 'terms_version';
reset role;
select pg_temp.act_as(:'ana');
select results_eq($$ select document, accepted from public.get_my_legal_status() order by document $$,
  $$ values ('privacy', true), ('terms', false) $$, 'a new version of the terms asks again');
reset role;
select is((select count(*)::integer from game.legal_acceptances where user_id = :'ana'), 2,
  'every acceptance is kept by version');

-- Reports. -------------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'ana');
select ok(public.report_content('article', :'article'::text, 'abuse', 'Insulta a otros') > 0, 'a citizen reports an article');
select throws_ok(format($$ select public.report_content('article', %L, 'abuse') $$, :'article'), '22023', 'already_reported',
  'once while it is open');
select ok(public.report_content('message', :'message'::text, 'spam') > 0, 'and a message they received');
select throws_ok(format($$ select public.report_content('message', %L, 'spam') $$, :'own_message'), '22023', 'target_invalid',
  'not a message they sent');
select ok(public.report_content('citizen', 'juan pérez', 'cheating', 'Multicuenta') > 0, 'and a citizen by name');
select throws_ok($$ select public.report_content('citizen', 'Ana Gómez', 'cheating') $$, '22023', 'target_invalid', 'not themselves');
select throws_ok(format($$ select public.report_content('article', %L, 'rude') $$, :'article'), '22023', 'report_invalid',
  'with a known reason');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok(format($$ select public.report_content('article', %L, 'spam') $$, :'article'), '22023', 'target_invalid',
  'nobody reports their own article');
select ok(public.report_content('message', :'own_message'::text, 'spam') > 0, 'the recipient may report it');
select throws_ok($$ select public.admin_list_reports() $$, '42501', 'not_staff', 'only the staff sees the reports');
reset role;
update game.balance_params set value = 1 where key = 'reports_max_per_day';
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$ select public.report_content('citizen', 'Ana Gómez', 'other') $$, '22023', 'reports_limit',
  'there is a daily limit');
reset role;
update game.balance_params set value = 20 where key = 'reports_max_per_day';

-- Moderation. ---------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'admin');
select is((select count(*)::integer from public.admin_list_reports()), 4, 'moderators see every open report');
select results_eq(
  format($$ select target_author, target_title, target_excerpt from public.admin_list_reports() where target_kind = 'article' $$),
  $$ values ('Juan Pérez', 'Un insulto', 'Texto ofensivo') $$, 'with what was reported');
reset role;
select id as article_report from game.reports where target_kind = 'article' \gset
select id as message_report from game.reports where target_kind = 'message' and target_id = :'message'::text \gset
select pg_temp.act_as(:'admin');
select lives_ok(format('select public.admin_resolve_report(%s, %L, %L)', :'article_report', 'hide', 'Insultos'),
  'a moderator hides the article');
select throws_ok(format('select public.admin_resolve_report(%s, %L)', :'article_report', 'dismiss'), '22023', 'report_closed',
  'a report is resolved once');
select lives_ok(format('select public.admin_resolve_report(%s, %L)', :'message_report', 'hide'), 'and hides the message');
reset role;
reset role;
select pg_temp.act_as(:'ana');
select is((select count(*)::integer from public.list_articles('ARG')), 0, 'a hidden article leaves the press');
select results_eq($$ select body, hidden from public.list_messages('Juan Pérez') where not mine $$,
  $$ values ('', true) $$, 'a hidden message keeps its place without its text');
reset role;
select is((select count(*)::integer from game.admin_log where action = 'resolve_report'), 2, 'moderation is audited');
reset role;
select pg_temp.act_as(:'admin');
select lives_ok(format('select public.admin_unhide(%L, %L)', 'article', :'article'::text), 'a moderator can show it again');
reset role;
select ok((select hidden_at is null from game.articles where id = :'article'), 'the article is back');

-- Closed beta. --------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'ana');
select is((select closed from public.get_beta_status()), false, 'the beta is open by default');
select throws_ok($$ select public.admin_set_closed_beta(true) $$, '42501', 'not_admin', 'only admins close it');
reset role;
select pg_temp.act_as(:'admin');
select lives_ok($$ select public.admin_set_closed_beta(true) $$, 'an admin closes it');
select lives_ok($$ select public.admin_invite_beta(' Bea@Example.com ', 'Amiga') $$, 'and invites an email');
reset role;
select throws_ok($$ select pg_temp.new_player('zoe@example.com', 'Zoe Ruiz', 'ARG') $$, '42501', 'beta_closed',
  'without an invitation, no citizen');
select lives_ok($$ select pg_temp.new_player('bea@example.com', 'Bea Lima', 'ARG') $$, 'an invited email gets one');

select * from finish();
rollback;

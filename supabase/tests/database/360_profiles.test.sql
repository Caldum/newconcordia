-- P1: pictures under folders the player controls, description, regiments, friends, referrals, achievements and the
-- national rank (ADR 0041).
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

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
where code in ('ARG', 'BRA');
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('bea@example.com', 'Bea Lima', 'BRA') as bea \gset
update game.citizens set joined_at = '2026-11-01 10:00:00+00' where user_id = :'ana';
update game.citizens set joined_at = '2026-11-06 10:00:00+00' where user_id = :'juan';
update game.citizens set joined_at = '2026-11-07 09:00:00+00' where user_id = :'bea';
update game.player_stats set experience = 500 where user_id = :'juan';
insert into game.parties (country_code, name, founder_user_id, leader_user_id, founded_at)
values ('ARG', 'Partido Federal', :'ana', :'ana', game.now());
select id as party from game.parties where name = 'Partido Federal' \gset
insert into game.party_memberships (user_id, party_id, joined_at) values (:'ana', :'party', game.now());
select :'ana'::text || '/11111111-1111-4111-8111-111111111111.webp' as ana_file \gset

-- Pictures. ------------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'ana');
select ok(public.can_store_picture('citizens/' || :'ana_file'), 'a player stores pictures in their own folder');
select ok(not public.can_store_picture('citizens/' || :'juan' || '/11111111-1111-4111-8111-111111111111.webp'),
  'and not in someone else''s');
select ok(not public.can_store_picture('citizens/' || :'ana' || '/photo.exe'), 'only pictures with a generated name');
select ok(public.can_store_picture('parties/' || :'party' || '/22222222-2222-4222-8222-222222222222.png'),
  'the party leader stores the party picture');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('pictures', 'citizens/%s')$$, :'ana_file'),
  'the storage policy lets them upload to their folder');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('pictures', 'citizens/%s/33333333-3333-4333-8333-333333333333.webp')$$, :'juan'),
  '42501', null, 'and refuses another player''s folder');
select lives_ok(format($$select public.set_my_avatar('citizens/%s')$$, :'ana_file'), 'an uploaded picture becomes theirs');
select throws_ok($$select public.set_my_avatar('citizens/nobody/44444444-4444-4444-8444-444444444444.webp')$$,
  '22023', 'picture_invalid', 'a picture outside their folder is refused');
select throws_ok(format($$select public.set_my_avatar('citizens/%s/55555555-5555-4555-8555-555555555555.webp')$$, :'ana'),
  '22023', 'picture_invalid', 'and one that was never uploaded');
select lives_ok($$select public.set_my_bio('  Soldado de la Pampa.  ')$$, 'they write a description');
select throws_ok(format('select public.set_my_bio(%L)', repeat('a', 501)), '22023', 'bio_invalid',
  'up to 500 characters');
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$select public.set_party_emblem(null)$$, '42501', 'not_party_leader',
  'only the leader sets the party picture');
reset role;
select is((select avatar_path || '|' || bio from game.citizens where user_id = :'ana'),
  'citizens/' || :'ana_file' || '|Soldado de la Pampa.', 'the picture and the trimmed description are recorded');

-- Regiments. -----------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'ana');
select ok(public.found_regiment('Granaderos') > 0, 'a citizen founds a regiment for free');
select throws_ok($$select public.found_regiment('Otro')$$, '22023', 'already_in_regiment', 'one regiment each');
reset role;
select id as regiment from game.regiments where name = 'Granaderos' \gset
reset role;
select pg_temp.act_as(:'juan');
select throws_ok($$select public.found_regiment('granaderos')$$, '22023', 'name_taken',
  'names are unique in a country');
select lives_ok(format('select public.join_regiment(%s)', :'regiment'), 'another citizen joins');
select ok(not public.can_store_picture('regiments/' || :'regiment' || '/66666666-6666-4666-8666-666666666666.webp'),
  'a member cannot change the regiment picture');
select is((select members from public.list_regiments('ARG') where regiment_id = :'regiment'), 2,
  'the regiment has two members');
reset role;
select pg_temp.act_as(:'bea');
select throws_ok(format('select public.join_regiment(%s)', :'regiment'), 'P0002', 'regiment_not_found',
  'regiments are of one country');
reset role;
select pg_temp.act_as(:'ana');
select ok(public.can_store_picture('regiments/' || :'regiment' || '/66666666-6666-4666-8666-666666666666.webp'),
  'the leader can');
select lives_ok($$select public.leave_regiment()$$, 'the leader leaves');
reset role;
select pg_temp.act_as(:'juan');
select is((select is_leader from public.get_my_regiment()), true, 'the oldest member left takes the lead');
reset role;
update game.citizens set country_code = 'BRA' where user_id = :'juan';
select ok((select dissolved_at is not null from game.regiments where id = :'regiment')
  and not exists (select 1 from game.regiment_members where user_id = :'juan'),
  'changing citizenship leaves the regiment, and with nobody left it dissolves');
update game.citizens set country_code = 'ARG' where user_id = :'juan';

-- Friends. -------------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'ana');
select is(public.request_friend('juan pérez'), 'requested', 'a citizen asks another to be friends');
select throws_ok($$select public.request_friend('Ana Gómez')$$, '22023', 'friend_invalid', 'not themselves');
reset role;
select pg_temp.act_as(:'juan');
select is((select status from public.list_my_friends()), 'incoming', 'the other sees the request');
select is(public.request_friend('Ana Gómez'), 'accepted', 'asking back accepts it');
reset role;
select pg_temp.act_as(:'bea');
select throws_ok($$select public.answer_friend('Ana Gómez', true)$$, 'P0002', 'request_not_found',
  'there is nothing to answer without a request');
reset role;
select is((select count(*)::integer from game.notifications where user_id = :'ana' and kind = 'friend_accepted'), 1,
  'the requester is told');

-- Referrals. -----------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'bea');
select throws_ok($$select public.set_my_referrer('Nadie')$$, '22023', 'referrer_invalid', 'the referrer must exist');
select lives_ok($$select public.set_my_referrer('Ana Gómez')$$, 'a new citizen names who invited them');
select throws_ok($$select public.set_my_referrer('Juan Pérez')$$, '22023', 'referral_closed', 'only once');
reset role;
select pg_temp.act_as(:'ana');
select throws_ok($$select public.set_my_referrer('Juan Pérez')$$, '22023', 'referral_closed',
  'and only in the first 72 hours');
select is((select name from public.list_my_referrals()), 'Bea Lima', 'the referrer sees who they invited');

-- Profile, achievements and messages. --------------------------------------------------------------------------------
select is((select row(national_rank, national_citizens, party_name, regiment_name, friends, referrals)::text
           from public.get_my_profile_details()),
  row(2, 2, 'Partido Federal', null::text, 1, 1)::text,
  'the profile has the place in the country by experience, the party, friends and referrals');
select is((select array_agg(achievement order by achievement) from public.list_my_achievements() where achieved),
  array['party_leader', 'party_member', 'regiment_founder'],
  'achievements come from what the player did');
select is((select count(*)::integer from public.list_my_achievements()), 14, 'every achievement is listed');
reset role;
insert into game.messages (sender_user_id, recipient_user_id, body, sent_at)
values (:'juan', :'ana', 'Hola', game.now()), (:'juan', :'ana', '¿Vienes?', game.now());
reset role;
select pg_temp.act_as(:'ana');
select is(public.count_unread_messages(), 2, 'the unread messages are counted');
reset role;
select pg_temp.act_as(:'juan');
select is(public.count_unread_messages(), 0, 'only for their recipient');

select * from finish();
rollback;

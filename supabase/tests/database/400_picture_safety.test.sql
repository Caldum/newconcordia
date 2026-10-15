-- Picture safety: folders hold a capped number of pictures, a picture in use cannot be deleted, setting a picture
-- returns the one it replaces, and moderators clear a reported citizen's picture and description (ADR 0045).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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

-- A picture name in a folder: the n-th generated file.
create function pg_temp.pic(p_folder text, p_n integer)
returns text
language sql
as $$
  select p_folder || '/' || lpad(p_n::text, 8, '0') || '-1111-4111-8111-111111111111.webp';
$$;
grant execute on function pg_temp.pic(text, integer) to authenticated;

select set_config('game.fixed_now', '2026-11-08 10:00:00+00', true);
update game.countries set is_active = true, color = coalesce(color, '#7BAFD4'), official_name_es = coalesce(official_name_es, name_es),
  official_name_en = coalesce(official_name_en, name_en), capital_region_code = coalesce(capital_region_code, code || '-01')
where code = 'ARG';
select pg_temp.new_player('ana@example.com', 'Ana Gómez', 'ARG') as ana \gset
select pg_temp.new_player('juan@example.com', 'Juan Pérez', 'ARG') as juan \gset
select pg_temp.new_player('admin@example.com', 'Admin Uno', 'ARG') as admin \gset
insert into game.admins (user_id) values (:'admin');
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'nadie@example.com',
        '{}', now(), now(), now())
returning id as nobody \gset
delete from game.citizens where user_id = :'nobody';
insert into game.parties (country_code, name, founder_user_id, leader_user_id, founded_at)
values ('ARG', 'Partido Federal', :'ana', :'ana', game.now());
select id as party from game.parties where name = 'Partido Federal' \gset
insert into game.party_memberships (user_id, party_id, joined_at) values (:'ana', :'party', game.now());
select 'citizens/' || :'ana' as ana_folder \gset
select 'parties/' || :'party' as party_folder \gset

-- Who may write. -------------------------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(:'nobody');
select ok(not public.can_store_picture(pg_temp.pic('citizens/' || :'nobody', 1)),
  'a signed-up player without a citizen stores no pictures');

-- The cap. -------------------------------------------------------------------------------------------------------------
reset role;
insert into storage.objects (bucket_id, name)
select 'pictures', pg_temp.pic(:'ana_folder', n) from generate_series(1, 9) as n;
select pg_temp.act_as(:'ana');
select ok(public.can_upload_picture(pg_temp.pic(:'ana_folder', 10)), 'a folder with room takes one more picture');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('pictures', %L)$$, pg_temp.pic(:'ana_folder', 10)),
  'the tenth picture uploads');
select ok(not public.can_upload_picture(pg_temp.pic(:'ana_folder', 11)), 'a full folder takes no more');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('pictures', %L)$$, pg_temp.pic(:'ana_folder', 11)),
  '42501', null, 'and the storage policy refuses the eleventh');
select ok(public.can_upload_picture(pg_temp.pic(:'party_folder', 1)), 'the party folder has its own room');

-- Setting returns the replaced picture. --------------------------------------------------------------------------------
select is(public.set_my_avatar(pg_temp.pic(:'ana_folder', 1)), null, 'the first picture replaces nothing');
select is(public.set_my_avatar(pg_temp.pic(:'ana_folder', 2)), pg_temp.pic(:'ana_folder', 1),
  'a new picture returns the previous one');
select is(public.set_my_avatar(pg_temp.pic(:'ana_folder', 2)), null, 'setting the same picture returns nothing');
reset role;
insert into storage.objects (bucket_id, name) values ('pictures', pg_temp.pic(:'party_folder', 1));
select pg_temp.act_as(:'ana');
select is(public.set_party_emblem(pg_temp.pic(:'party_folder', 1)), null, 'the party picture is set');
select is(public.set_party_emblem(), pg_temp.pic(:'party_folder', 1), 'removing it returns the one it had');

-- Deleting. ------------------------------------------------------------------------------------------------------------
select ok(not public.can_delete_picture(pg_temp.pic(:'ana_folder', 2)), 'the picture in use cannot be deleted');
select ok(public.can_delete_picture(pg_temp.pic(:'ana_folder', 1)), 'the replaced one can');
select lives_ok(
  format($$delete from storage.objects where bucket_id = 'pictures' and name = %L$$, pg_temp.pic(:'ana_folder', 1)),
  'and the player deletes it');
reset role;
select is((select count(*)::integer from storage.objects where name like :'ana_folder' || '/%'), 9,
  'which frees room in the folder');
select pg_temp.act_as(:'juan');
select ok(not public.can_delete_picture(pg_temp.pic(:'ana_folder', 3)), 'nobody deletes in someone else''s folder');

-- Moderation. ----------------------------------------------------------------------------------------------------------
reset role;
update game.citizens set bio = 'Texto ofensivo' where user_id = :'ana';
select pg_temp.act_as(:'juan');
select public.report_content('citizen', 'Ana Gómez', 'abuse', 'La foto') as report \gset
reset role;
select pg_temp.act_as(:'admin');
select results_eq(
  format($$select target_picture, target_excerpt from public.admin_list_reports() where report_id = %s$$, :'report'),
  format($$values (%L, 'Texto ofensivo')$$, pg_temp.pic(:'ana_folder', 2)),
  'moderators see the reported citizen''s picture and description');
select lives_ok(format($$select public.admin_resolve_report(%s, 'clear_profile', 'Foto ofensiva')$$, :'report'),
  'and clear them');
reset role;
select results_eq(
  format($$select avatar_path, bio from game.citizens where user_id = %L$$, :'ana'),
  $$values (null::text, '')$$,
  'the citizen is back to the initials and no description');
select results_eq(
  $$select before->>'avatar_path' is not null, after->>'action' from game.admin_log
    where action = 'resolve_report' order by id desc limit 1$$,
  $$values (true, 'clear_profile')$$,
  'the admin log keeps what was cleared');

select * from finish();
rollback;

-- Picture safety: a cap on the pictures each folder holds, pictures in use cannot be deleted, the previous picture is
-- returned so the web removes it, and moderators clear a reported citizen's picture and description (ADR 0045).
--
-- public.can_store_picture (replaced: the citizens folder needs a citizen)
-- public.can_upload_picture, public.can_delete_picture; storage policies pictures_insert and pictures_delete use them;
--   new policy pictures_select (deleting through Storage needs it)
-- public.set_my_avatar, set_party_emblem, set_regiment_emblem (recreated: they return the previous picture)
-- public.admin_resolve_report (replaced: action clear_profile for citizens)
-- public.admin_list_reports (recreated: the reported citizen's picture and description)
--
-- Errors (ADR 0005): picture_invalid, not_party_leader, not_regiment_leader, report_closed, action_invalid.
--
-- Rollback: drop the policy pictures_select; point the policies pictures_insert and pictures_delete back to
-- public.can_store_picture and drop public.can_upload_picture and public.can_delete_picture; restore
-- public.can_store_picture, the three set_* functions (returning void) from 20261102090000 and admin_resolve_report
-- and admin_list_reports from 20261105090000; delete the balance_params row added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('pictures_per_folder_max', 10, 'Pictures a citizen, party or regiment folder may hold in storage.');

-- Who may write in a folder ------------------------------------------------------------------------------------------

-- Their own folder (once they are a citizen), or the folder of the party or regiment they lead.
create or replace function public.can_store_picture(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(array_length(string_to_array(p_name, '/'), 1), 0) = 3
    and split_part(p_name, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg)$'
    and case split_part(p_name, '/', 1)
      when 'citizens' then split_part(p_name, '/', 2) = auth.uid()::text
        and exists (select 1 from game.citizens as c where c.user_id = auth.uid())
      when 'parties' then exists (
        select 1 from game.parties as p
        where p.id::text = split_part(p_name, '/', 2) and p.leader_user_id = auth.uid())
      when 'regiments' then exists (
        select 1 from game.regiments as r
        where r.id::text = split_part(p_name, '/', 2) and r.leader_user_id = auth.uid() and r.dissolved_at is null)
      else false
    end;
$$;

-- Uploading: allowed in the folder, and the folder still has room (the new picture is not counted yet).
create function public.can_upload_picture(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_store_picture(p_name)
    and (select count(*) from storage.objects as o
         where o.bucket_id = 'pictures'
           and o.name like split_part(p_name, '/', 1) || '/' || split_part(p_name, '/', 2) || '/%')
        < game.param('pictures_per_folder_max');
$$;
comment on function public.can_upload_picture(text) is
  'Storage policy: whether the player may upload a picture at a path (folder allowed and not full).';
grant execute on function public.can_upload_picture(text) to authenticated;

-- Deleting: allowed in the folder, and the picture is not the one a citizen, party or regiment shows.
create function public.can_delete_picture(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_store_picture(p_name)
    and not exists (select 1 from game.citizens where avatar_path = p_name)
    and not exists (select 1 from game.parties where emblem_path = p_name)
    and not exists (select 1 from game.regiments where emblem_path = p_name);
$$;
comment on function public.can_delete_picture(text) is
  'Storage policy: whether the player may delete a picture (folder allowed and the picture not in use).';
grant execute on function public.can_delete_picture(text) to authenticated;

alter policy pictures_insert on storage.objects
  with check (bucket_id = 'pictures' and (select public.can_upload_picture(name)));
alter policy pictures_delete on storage.objects
  using (bucket_id = 'pictures' and (select public.can_delete_picture(name)));
-- Deleting through Storage reads the rows first: players see the pictures in the folders they write in. The pictures
-- are public anyway; this only lists names.
create policy pictures_select on storage.objects for select to authenticated
  using (bucket_id = 'pictures' and (select public.can_store_picture(name)));

-- Setting a picture returns the one it replaces --------------------------------------------------------------------

-- The return type changes (void to text); the web is released with this migration.
-- squawk-ignore ban-drop-function
drop function public.set_my_avatar(text);
create function public.set_my_avatar(p_path text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_path text := game.require_picture(p_path, 'citizens/' || v_citizen.user_id::text);
begin
  update game.citizens set avatar_path = v_path where user_id = v_citizen.user_id;
  return nullif(v_citizen.avatar_path, v_path);
end;
$$;
comment on function public.set_my_avatar(text) is
  'Uses an uploaded picture as the citizen''s, or the initials with null; returns the picture it replaced.';
grant execute on function public.set_my_avatar(text) to authenticated;

-- The return type changes (void to text); the web is released with this migration.
-- squawk-ignore ban-drop-function
drop function public.set_party_emblem(text);
create function public.set_party_emblem(p_path text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party game.parties;
  v_path text;
begin
  select * into v_party from game.parties where leader_user_id = v_citizen.user_id for update;
  if not found then
    raise exception 'not_party_leader' using errcode = '42501';
  end if;
  v_path := game.require_picture(p_path, 'parties/' || v_party.id::text);
  update game.parties set emblem_path = v_path where id = v_party.id;
  return nullif(v_party.emblem_path, v_path);
end;
$$;
comment on function public.set_party_emblem(text) is
  'The leader sets the picture of their party; returns the picture it replaced.';
grant execute on function public.set_party_emblem(text) to authenticated;

-- The return type changes (void to text); the web is released with this migration.
-- squawk-ignore ban-drop-function
drop function public.set_regiment_emblem(text);
create function public.set_regiment_emblem(p_path text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_regiment game.regiments;
  v_path text;
begin
  select * into v_regiment from game.regiments
  where leader_user_id = v_citizen.user_id and dissolved_at is null
  for update;
  if not found then
    raise exception 'not_regiment_leader' using errcode = '42501';
  end if;
  v_path := game.require_picture(p_path, 'regiments/' || v_regiment.id::text);
  update game.regiments set emblem_path = v_path where id = v_regiment.id;
  return nullif(v_regiment.emblem_path, v_path);
end;
$$;
comment on function public.set_regiment_emblem(text) is
  'The leader sets the picture of their regiment; returns the picture it replaced.';
grant execute on function public.set_regiment_emblem(text) to authenticated;

-- Moderating a citizen's picture and description -------------------------------------------------------------------

-- Dismisses a report, hides the reported article or message, or clears the reported citizen's picture and
-- description; closes every open report on that target the same way. Audited.
create or replace function public.admin_resolve_report(p_report_id bigint, p_action text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_report game.reports;
  v_status text;
  v_before jsonb := '{}';
  v_after jsonb := '{}';
  v_citizen game.citizens;
begin
  select * into v_report from game.reports where id = p_report_id for update;
  if not found or v_report.status <> 'open' then
    raise exception 'report_closed' using errcode = '22023';
  end if;
  if p_action = 'hide' then
    perform game.set_hidden(v_report.target_kind, v_report.target_id, v_admin, true);
    v_status := 'actioned';
  elsif p_action = 'clear_profile' and v_report.target_kind = 'citizen' then
    select * into v_citizen from game.citizens where user_id::text = v_report.target_id for update;
    if not found then
      raise exception 'target_invalid' using errcode = '22023';
    end if;
    update game.citizens set avatar_path = null, bio = '' where user_id = v_citizen.user_id;
    v_before := jsonb_build_object('avatar_path', v_citizen.avatar_path, 'bio', v_citizen.bio);
    v_after := jsonb_build_object('avatar_path', null, 'bio', '');
    v_status := 'actioned';
  elsif p_action = 'dismiss' then
    v_status := 'dismissed';
  else
    raise exception 'action_invalid' using errcode = '22023';
  end if;
  update game.reports
  set status = v_status, reviewed_by = v_admin, reviewed_at = game.now(), resolution = left(btrim(coalesce(p_note, '')), 300)
  where target_kind = v_report.target_kind and target_id = v_report.target_id and status = 'open';
  perform game.log_admin_action(
    v_admin, 'resolve_report', v_report.target_kind || ':' || v_report.target_id,
    v_before || jsonb_build_object('report_id', v_report.id, 'status', 'open'),
    v_after || jsonb_build_object('report_id', v_report.id, 'status', v_status, 'action', p_action,
                                  'note', btrim(coalesce(p_note, '')))
  );
end;
$$;
comment on function public.admin_resolve_report(bigint, text, text) is
  'Moderation: dismiss a report, hide the reported article or message, or clear a citizen''s picture and description.';

-- A new column; only the admin panel calls it and is released with this migration.
-- squawk-ignore ban-drop-function
drop function public.admin_list_reports(text);
create function public.admin_list_reports(p_status text default 'open')
returns table (report_id bigint, target_kind text, target_id text, reason text, details text, status text,
               created_at timestamptz, reporter_name text, target_author text, target_title text, target_excerpt text,
               target_hidden boolean, reports_on_target integer, resolution text, target_picture text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select r.id, r.target_kind, r.target_id, r.reason, r.details, r.status, r.created_at, rc.name,
         coalesce(aa.name, ms.name, tc.name), a.title, left(coalesce(a.body, m.body, nullif(tc.bio, '')), 280),
         coalesce(a.hidden_at, m.hidden_at) is not null,
         (select count(*)::integer from game.reports as o
          where o.target_kind = r.target_kind and o.target_id = r.target_id),
         r.resolution, tc.avatar_path
  from game.reports as r
  left join game.citizens as rc on rc.user_id = r.reporter_user_id
  left join game.articles as a on r.target_kind = 'article' and a.id::text = r.target_id
  left join game.citizens as aa on aa.user_id = a.author_user_id
  left join game.messages as m on r.target_kind = 'message' and m.id::text = r.target_id
  left join game.citizens as ms on ms.user_id = m.sender_user_id
  left join game.citizens as tc on r.target_kind = 'citizen' and tc.user_id::text = r.target_id
  where r.status = coalesce(p_status, r.status)
  order by r.created_at
  limit 200;
end;
$$;
comment on function public.admin_list_reports(text) is
  'Reports for moderators, oldest first, with what was reported (a citizen''s picture and description too).';
grant execute on function public.admin_list_reports(text) to authenticated;

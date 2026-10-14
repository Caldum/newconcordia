-- L5 · Terms and privacy acceptance, reports and moderation, closed beta (spec PD-14; ADR 0044).
--
-- Legal: the versions in force of the terms and the privacy policy are balance parameters; every player accepts the
--   current ones before playing, and each acceptance is kept. The texts themselves are the owner's (PD-14).
-- Reports: a citizen reports an article, a message they received or a citizen, with a reason; admins dismiss them or
--   hide the content, audited. Hidden content stays for the record and can be shown again.
-- Closed beta: off by default; when on, only invited emails (and admins) get a citizen.
--
-- game.legal_acceptances, game.reports, game.beta_invites; game.messages + hidden_at, hidden_by
-- game.beta_allows; game.create_citizen (replaced: the beta check)
-- public.get_legal_versions, get_my_legal_status, accept_legal, report_content, admin_list_reports,
--   admin_resolve_report, admin_unhide, get_beta_status, admin_list_beta_invites, admin_invite_beta,
--   admin_revoke_beta_invite, admin_set_closed_beta; list_messages and list_conversations (replaced: hidden messages)
--
-- Errors (ADR 0005): legal_version_invalid, report_invalid, target_invalid, already_reported, reports_limit,
-- report_closed, action_invalid, email_invalid, beta_closed, not_admin.
--
-- Rollback: drop the public functions created here, game.beta_allows, game.beta_invites, game.reports,
-- game.legal_acceptances and the messages' hidden columns; restore game.create_citizen from 20261009153427,
-- public.list_messages and public.list_conversations from 20261101090000; delete the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('terms_version', 1, 'Version of the terms and conditions in force; players accept it before playing.'),
  ('privacy_version', 1, 'Version of the privacy policy in force; players accept it before playing.'),
  ('reports_max_per_day', 20, 'Reports a citizen may file in 24 hours.'),
  ('closed_beta', 0, 'Closed beta: when 1, only invited emails get a citizen.');

-- Legal acceptance -----------------------------------------------------------------------------------------------

create table game.legal_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy')),
  version integer not null check (version > 0),
  accepted_at timestamptz not null,
  primary key (user_id, document, version)
);
alter table game.legal_acceptances enable row level security;
comment on table game.legal_acceptances is 'Who accepted which version of the terms and of the privacy policy, and when.';

create function public.get_legal_versions()
returns table (terms_version integer, privacy_version integer)
language sql
stable
security definer
set search_path = ''
as $$
  select game.param('terms_version')::integer, game.param('privacy_version')::integer;
$$;
comment on function public.get_legal_versions() is 'The versions in force of the terms and the privacy policy.';
grant execute on function public.get_legal_versions() to anon, authenticated;

create function public.get_my_legal_status()
returns table (document text, version integer, accepted boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.document, d.version,
         exists (select 1 from game.legal_acceptances as a
                 where a.user_id = auth.uid() and a.document = d.document and a.version = d.version)
  from (values ('terms', game.param('terms_version')::integer),
               ('privacy', game.param('privacy_version')::integer)) as d (document, version)
  where auth.uid() is not null;
$$;
comment on function public.get_my_legal_status() is 'Whether the player accepted the versions in force.';
grant execute on function public.get_my_legal_status() to authenticated;

-- Accepts both documents at the versions the player read; refuses versions no longer in force.
create function public.accept_legal(p_terms_version integer, p_privacy_version integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_terms_version is distinct from game.param('terms_version')::integer
     or p_privacy_version is distinct from game.param('privacy_version')::integer then
    raise exception 'legal_version_invalid' using errcode = '22023';
  end if;
  insert into game.legal_acceptances (user_id, document, version, accepted_at)
  values (auth.uid(), 'terms', p_terms_version, game.now()), (auth.uid(), 'privacy', p_privacy_version, game.now())
  on conflict do nothing;
end;
$$;
comment on function public.accept_legal(integer, integer) is 'Records that the player accepts the terms and privacy in force.';
grant execute on function public.accept_legal(integer, integer) to authenticated;

-- Reports and moderation ---------------------------------------------------------------------------------------

-- New columns of a players' table, empty: the key's validation reads no rows.
alter table game.messages add column hidden_at timestamptz;
-- squawk-ignore adding-foreign-key-constraint
alter table game.messages add column hidden_by uuid references auth.users (id) on delete set null;
comment on column game.messages.hidden_at is 'When moderation hid the message; it stays for the record.';
-- squawk-ignore require-concurrent-index-creation
create index messages_hidden_by_idx on game.messages (hidden_by) where hidden_by is not null;

create table game.reports (
  id bigint generated always as identity primary key,
  reporter_user_id uuid references game.citizens (user_id) on delete set null,
  target_kind text not null check (target_kind in ('article', 'message', 'citizen')),
  target_id text not null check (char_length(target_id) <= 60),
  reason text not null check (reason in ('spam', 'abuse', 'hate', 'cheating', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  resolution text check (char_length(resolution) <= 300),
  constraint reports_reviewed check ((status = 'open') = (reviewed_at is null))
);
alter table game.reports enable row level security;
comment on table game.reports is 'Reports of articles, messages and citizens, and how moderation resolved them.';
create unique index reports_open_key on game.reports (reporter_user_id, target_kind, target_id) where status = 'open';
create index reports_status_idx on game.reports (status, created_at);
create index reports_target_idx on game.reports (target_kind, target_id);
create index reports_reporter_idx on game.reports (reporter_user_id, created_at);
create index reports_reviewed_by_idx on game.reports (reviewed_by) where reviewed_by is not null;

create function public.report_content(p_kind text, p_target text, p_reason text, p_details text default '')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_target text := btrim(coalesce(p_target, ''));
  v_id bigint;
begin
  if p_kind not in ('article', 'message', 'citizen')
     or p_reason not in ('spam', 'abuse', 'hate', 'cheating', 'other')
     or char_length(coalesce(p_details, '')) > 500 then
    raise exception 'report_invalid' using errcode = '22023';
  end if;
  if (select count(*) from game.reports
      where reporter_user_id = v_citizen.user_id and created_at > game.now() - interval '24 hours')
     >= game.param('reports_max_per_day') then
    raise exception 'reports_limit' using errcode = '22023';
  end if;
  if p_kind = 'article' then
    if v_target !~ '^[0-9]{1,18}$' or not exists (
      select 1 from game.articles
      where id = v_target::bigint and hidden_at is null and author_user_id <> v_citizen.user_id) then
      raise exception 'target_invalid' using errcode = '22023';
    end if;
  elsif p_kind = 'message' then
    -- Only a message the reporter received: reporting shows it to the moderators.
    if v_target !~ '^[0-9]{1,18}$' or not exists (
      select 1 from game.messages
      where id = v_target::bigint and recipient_user_id = v_citizen.user_id and hidden_at is null) then
      raise exception 'target_invalid' using errcode = '22023';
    end if;
  else
    v_target := (select user_id::text from game.citizens
                 where (name collate game.citizen_name) = (v_target collate game.citizen_name));
    if v_target is null or v_target = v_citizen.user_id::text then
      raise exception 'target_invalid' using errcode = '22023';
    end if;
  end if;
  insert into game.reports (reporter_user_id, target_kind, target_id, reason, details, created_at)
  values (v_citizen.user_id, p_kind, v_target, p_reason, btrim(coalesce(p_details, '')), game.now())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already_reported' using errcode = '22023';
end;
$$;
comment on function public.report_content(text, text, text, text) is
  'Reports an article, a message the player received or a citizen (by name) to the moderators.';
grant execute on function public.report_content(text, text, text, text) to authenticated;

create function public.admin_list_reports(p_status text default 'open')
returns table (report_id bigint, target_kind text, target_id text, reason text, details text, status text,
               created_at timestamptz, reporter_name text, target_author text, target_title text, target_excerpt text,
               target_hidden boolean, reports_on_target integer, resolution text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select r.id, r.target_kind, r.target_id, r.reason, r.details, r.status, r.created_at, rc.name,
         coalesce(aa.name, ms.name, tc.name), a.title, left(coalesce(a.body, m.body), 280),
         coalesce(a.hidden_at, m.hidden_at) is not null,
         (select count(*)::integer from game.reports as o
          where o.target_kind = r.target_kind and o.target_id = r.target_id),
         r.resolution
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
comment on function public.admin_list_reports(text) is 'Reports for moderators, oldest first, with what was reported.';
grant execute on function public.admin_list_reports(text) to authenticated;

-- Hides or shows again an article or a message; logged by the caller.
create function game.set_hidden(p_kind text, p_target text, p_admin uuid, p_hidden boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_kind = 'article' then
    update game.articles
    set hidden_at = case when p_hidden then game.now() end, hidden_by = case when p_hidden then p_admin end
    where id::text = p_target;
  elsif p_kind = 'message' then
    update game.messages
    set hidden_at = case when p_hidden then game.now() end, hidden_by = case when p_hidden then p_admin end
    where id::text = p_target;
  else
    raise exception 'action_invalid' using errcode = '22023';
  end if;
  if not found then
    raise exception 'target_invalid' using errcode = '22023';
  end if;
end;
$$;

-- Dismisses a report or hides what it reports; closes every open report on that target the same way. Audited.
create function public.admin_resolve_report(p_report_id bigint, p_action text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_report game.reports;
  v_status text;
begin
  select * into v_report from game.reports where id = p_report_id for update;
  if not found or v_report.status <> 'open' then
    raise exception 'report_closed' using errcode = '22023';
  end if;
  if p_action = 'hide' then
    perform game.set_hidden(v_report.target_kind, v_report.target_id, v_admin, true);
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
    jsonb_build_object('report_id', v_report.id, 'status', 'open'),
    jsonb_build_object('report_id', v_report.id, 'status', v_status, 'note', btrim(coalesce(p_note, '')))
  );
end;
$$;
comment on function public.admin_resolve_report(bigint, text, text) is
  'Moderation: dismiss a report or hide the reported article or message. Audited.';
grant execute on function public.admin_resolve_report(bigint, text, text) to authenticated;

create function public.admin_unhide(p_kind text, p_target text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
begin
  perform game.set_hidden(p_kind, p_target, v_admin, false);
  perform game.log_admin_action(v_admin, 'unhide_content', p_kind || ':' || p_target,
                                jsonb_build_object('hidden', true), jsonb_build_object('hidden', false));
end;
$$;
comment on function public.admin_unhide(text, text) is 'Moderation: shows a hidden article or message again. Audited.';
grant execute on function public.admin_unhide(text, text) to authenticated;

-- Hidden messages keep their place in the conversation without their text.
-- The return type grows; only this web calls it and it reads the new column in the same release.
-- squawk-ignore ban-drop-function
drop function public.list_messages(text);
create function public.list_messages(p_with_name text)
returns table (message_id bigint, mine boolean, body text, sent_at timestamptz, hidden boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_other uuid := (select user_id from game.citizens where lower(name) = lower(btrim(coalesce(p_with_name, ''))));
begin
  if v_other is null then
    raise exception 'recipient_invalid' using errcode = '22023';
  end if;
  update game.messages set read_at = game.now()
  where sender_user_id = v_other and recipient_user_id = v_citizen.user_id and read_at is null;
  return query
  select m.id, m.sender_user_id = v_citizen.user_id, case when m.hidden_at is null then m.body else '' end, m.sent_at,
         m.hidden_at is not null
  from game.messages as m
  where (m.sender_user_id = v_citizen.user_id and m.recipient_user_id = v_other)
     or (m.sender_user_id = v_other and m.recipient_user_id = v_citizen.user_id)
  order by m.sent_at desc, m.id desc
  limit 100;
end;
$$;
comment on function public.list_messages(text) is
  'The latest messages with a citizen, hidden ones without their text; marks theirs as read.';
grant execute on function public.list_messages(text) to authenticated;

create or replace function public.list_conversations()
returns table (other_name text, last_body text, last_at timestamptz, unread integer)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select m.*, case when m.sender_user_id = auth.uid() then m.recipient_user_id else m.sender_user_id end as other
    from game.messages as m
    where auth.uid() in (m.sender_user_id, m.recipient_user_id)
  )
  select c.name,
         (select case when x.hidden_at is null then x.body else '' end
          from mine as x where x.other = o.other order by x.sent_at desc, x.id desc limit 1),
         max(o.sent_at),
         count(*) filter (where o.recipient_user_id = auth.uid() and o.read_at is null)::integer
  from mine as o
  join game.citizens as c on c.user_id = o.other
  group by o.other, c.name
  order by max(o.sent_at) desc
  limit 50;
$$;

-- Closed beta --------------------------------------------------------------------------------------------------------

create table game.beta_invites (
  email text primary key check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid references auth.users (id) on delete set null,
  note text not null default '' check (char_length(note) <= 120),
  created_at timestamptz not null,
  used_at timestamptz
);
alter table game.beta_invites enable row level security;
comment on table game.beta_invites is 'Emails invited to the closed beta, and when each got its citizen.';
create index beta_invites_invited_by_idx on game.beta_invites (invited_by) where invited_by is not null;

create function game.beta_allows(p_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select game.param('closed_beta') = 0
      or game.is_admin(p_user_id)
      or exists (select 1 from auth.users as u join game.beta_invites as i on i.email = lower(btrim(u.email))
                 where u.id = p_user_id);
$$;
comment on function game.beta_allows(uuid) is 'Whether an account may get a citizen: open game, an admin, or invited.';

create or replace function game.create_citizen(
  p_user_id uuid,
  p_name text,
  p_country_code text,
  p_locale text,
  p_signup_key text default null
)
returns game.citizens
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
  v_citizen game.citizens;
begin
  if not game.beta_allows(p_user_id) then
    raise exception 'beta_closed' using errcode = '42501';
  end if;
  if not game.is_valid_citizen_name(v_name) then
    raise exception 'citizen_name_invalid' using errcode = '22023';
  end if;
  if coalesce(p_locale, '') not in ('es', 'en') then
    raise exception 'locale_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from game.countries where code = p_country_code and is_active) then
    raise exception 'country_not_in_play' using errcode = '22023';
  end if;
  if exists (select 1 from game.citizens where user_id = p_user_id) then
    raise exception 'citizen_exists' using errcode = '23505';
  end if;

  -- Take over an expired reservation, or one this browser made a moment ago.
  delete from game.citizens where user_id = game.releasable_citizen(v_name, p_signup_key);

  begin
    insert into game.citizens (user_id, name, country_code, locale)
    values (p_user_id, v_name, p_country_code, p_locale)
    returning * into v_citizen;
  exception when unique_violation then
    raise exception 'citizen_name_taken' using errcode = '23505';
  end;
  update game.beta_invites set used_at = coalesce(used_at, game.now())
  where email = (select lower(btrim(email)) from auth.users where id = p_user_id);
  return v_citizen;
end;
$$;
comment on function game.create_citizen(uuid, text, text, text, text) is
  'Validates and creates the citizen of an account; in a closed beta, only for invited emails.';

create function public.get_beta_status()
returns table (closed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select game.param('closed_beta') <> 0;
$$;
comment on function public.get_beta_status() is 'Whether the game is in closed beta (invitation only).';
grant execute on function public.get_beta_status() to anon, authenticated;

create function public.admin_list_beta_invites()
returns table (email text, note text, invited_by text, created_at timestamptz, used_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform game.require_admin();
  return query
  select i.email, i.note, c.name, i.created_at, i.used_at
  from game.beta_invites as i
  left join game.citizens as c on c.user_id = i.invited_by
  order by i.created_at desc
  limit 500;
end;
$$;
comment on function public.admin_list_beta_invites() is 'Invitations to the closed beta, latest first.';
grant execute on function public.admin_list_beta_invites() to authenticated;

create function public.admin_invite_beta(p_email text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(coalesce(p_note, '')) > 120 then
    raise exception 'email_invalid' using errcode = '22023';
  end if;
  insert into game.beta_invites (email, invited_by, note, created_at)
  values (v_email, v_admin, btrim(coalesce(p_note, '')), game.now())
  on conflict (email) do nothing;
  if found then
    perform game.log_admin_action(v_admin, 'beta_invite', v_email, null, jsonb_build_object('invited', true));
  end if;
end;
$$;
comment on function public.admin_invite_beta(text, text) is 'Invites an email to the closed beta. Audited.';
grant execute on function public.admin_invite_beta(text, text) to authenticated;

create function public.admin_revoke_beta_invite(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  delete from game.beta_invites where email = v_email and used_at is null;
  if not found then
    raise exception 'email_invalid' using errcode = '22023';
  end if;
  perform game.log_admin_action(v_admin, 'beta_revoke', v_email, jsonb_build_object('invited', true),
                                jsonb_build_object('invited', false));
end;
$$;
comment on function public.admin_revoke_beta_invite(text) is 'Withdraws an unused invitation. Audited.';
grant execute on function public.admin_revoke_beta_invite(text) to authenticated;

create function public.admin_set_closed_beta(p_closed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := game.require_admin();
  v_before boolean := game.param('closed_beta') <> 0;
begin
  update game.balance_params set value = case when p_closed then 1 else 0 end, updated_at = now()
  where key = 'closed_beta';
  perform game.log_admin_action(v_admin, 'closed_beta', 'closed_beta', jsonb_build_object('closed', v_before),
                                jsonb_build_object('closed', p_closed));
end;
$$;
comment on function public.admin_set_closed_beta(boolean) is 'Opens or closes the beta to invitations only. Audited.';
grant execute on function public.admin_set_closed_beta(boolean) to authenticated;

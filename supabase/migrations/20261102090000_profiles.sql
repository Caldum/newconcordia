-- P1 · The player's profile: picture and description, friends, referrals, regiments, achievements and national rank
-- (GDD D25–D27 and section 4 «military units», ADR 0041).
--
-- Storage bucket «pictures»  public pictures: citizens/<user>/<uuid>.webp, parties/<id>/<uuid>.webp,
--                           regiments/<id>/<uuid>.webp; a player uploads only under a folder they control
--                           (public.can_store_picture), and a function records which picture is in use.
-- game.citizens             + bio, avatar_path, referred_by_user_id
-- game.parties              + emblem_path (the leader sets it)
-- game.regiments, game.regiment_members   military units of a country: free, one per citizen, a leader
-- game.friendships          requested, then accepted by the other citizen
-- Achievements and the national rank are read from the player's state, nothing is paid for them.
--
-- public.can_store_picture, set_my_bio, set_my_avatar, set_party_emblem, set_regiment_emblem,
--   get_my_profile_details, list_my_achievements, count_unread_messages, set_my_referrer, list_my_referrals,
--   request_friend, answer_friend, remove_friend, list_my_friends, found_regiment, join_regiment, leave_regiment,
--   list_regiments, get_my_regiment
--
-- Errors (ADR 0005): bio_invalid, picture_invalid, not_party_leader, not_regiment_leader, referrer_invalid,
-- referral_closed, friend_invalid, friends_full, request_not_found, name_invalid, name_taken, already_in_regiment,
-- regiment_not_found, not_in_regiment.
--
-- Rollback: drop the public functions created here, the storage policies pictures_insert and pictures_delete, the
-- trigger citizens_leave_regiment and game.citizens_leave_regiment(), game.friendships, game.regiment_members,
-- game.regiments, the columns added to game.citizens and game.parties; delete the bucket «pictures» (and its
-- objects) and the balance_params rows added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('friends_max', 500, 'Friends and pending requests a citizen may have.'),
  ('referral_window_hours', 72, 'Hours after joining in which a new citizen may name who invited them.'),
  ('bio_max_length', 500, 'Characters of a citizen''s description.');

-- Pictures ---------------------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pictures', 'pictures', true, 307200, array['image/webp', 'image/png', 'image/jpeg']);

-- A stored picture under a folder, or picture_invalid.
create function game.require_picture(p_path text, p_folder text)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_path is null then
    return null;
  end if;
  if p_path not like p_folder || '/%'
     or not exists (select 1 from storage.objects where bucket_id = 'pictures' and name = p_path) then
    raise exception 'picture_invalid' using errcode = '22023';
  end if;
  return p_path;
end;
$$;

-- Columns -------------------------------------------------------------------------------------------------------

alter table game.citizens add column bio text not null default '';
alter table game.citizens add column avatar_path text;
-- The column is new and empty: validating the key and building the index read no rows.
-- squawk-ignore adding-foreign-key-constraint
alter table game.citizens add column referred_by_user_id uuid references game.citizens (user_id) on delete set null;
comment on column game.citizens.bio is 'What the citizen says about themselves on their profile.';
comment on column game.citizens.avatar_path is 'Their picture in the «pictures» bucket; initials when null.';
comment on column game.citizens.referred_by_user_id is 'Who invited them; recorded only, nothing is paid for it.';
-- squawk-ignore require-concurrent-index-creation
create index citizens_referred_by_idx on game.citizens (referred_by_user_id) where referred_by_user_id is not null;

alter table game.parties add column emblem_path text;
comment on column game.parties.emblem_path is 'The party picture in the «pictures» bucket, set by its leader.';

-- Regiments --------------------------------------------------------------------------------------------------------

create table game.regiments (
  id bigint generated always as identity primary key,
  country_code text not null references game.countries (code),
  name text not null check (char_length(btrim(name)) between 3 and 40 and name = btrim(name)),
  founder_user_id uuid references game.citizens (user_id) on delete set null,
  leader_user_id uuid references game.citizens (user_id) on delete set null,
  emblem_path text,
  founded_at timestamptz not null,
  dissolved_at timestamptz
);
alter table game.regiments enable row level security;
comment on table game.regiments is 'Military units of a country: a leader and its members. Dissolved when the last leaves.';
create unique index regiments_name_key on game.regiments (country_code, lower(name)) where dissolved_at is null;
create index regiments_leader_idx on game.regiments (leader_user_id) where leader_user_id is not null;
create index regiments_founder_idx on game.regiments (founder_user_id) where founder_user_id is not null;

create table game.regiment_members (
  user_id uuid primary key references game.citizens (user_id) on delete cascade,
  regiment_id bigint not null references game.regiments (id),
  joined_at timestamptz not null
);
alter table game.regiment_members enable row level security;
comment on table game.regiment_members is 'One regiment per citizen, of their country.';
create index regiment_members_regiment_idx on game.regiment_members (regiment_id, joined_at);

-- Leaving: the oldest member left takes the lead; with nobody left the regiment is dissolved.
create function game.leave_regiment(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_regiment bigint;
  v_next uuid;
begin
  delete from game.regiment_members where user_id = p_user_id returning regiment_id into v_regiment;
  if v_regiment is null then
    return;
  end if;
  perform 1 from game.regiments where id = v_regiment for update;
  if exists (select 1 from game.regiments where id = v_regiment and leader_user_id = p_user_id) then
    select user_id into v_next from game.regiment_members
    where regiment_id = v_regiment order by joined_at, user_id limit 1;
    update game.regiments
    set leader_user_id = v_next,
        dissolved_at = case when v_next is null then game.now() end
    where id = v_regiment;
  end if;
end;
$$;

-- A regiment belongs to a country: changing citizenship leaves it.
create function game.citizens_leave_regiment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform game.leave_regiment(new.user_id);
  return new;
end;
$$;

create trigger citizens_leave_regiment
after update of country_code on game.citizens
for each row when (old.country_code is distinct from new.country_code)
execute function game.citizens_leave_regiment();

-- Who may store a picture at a path: their own folder, or the folder of the party or regiment they lead.
create function public.can_store_picture(p_name text)
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
      when 'parties' then exists (
        select 1 from game.parties as p
        where p.id::text = split_part(p_name, '/', 2) and p.leader_user_id = auth.uid())
      when 'regiments' then exists (
        select 1 from game.regiments as r
        where r.id::text = split_part(p_name, '/', 2) and r.leader_user_id = auth.uid() and r.dissolved_at is null)
      else false
    end;
$$;
comment on function public.can_store_picture(text) is 'Storage policy: whether the player may store a picture at a path.';
grant execute on function public.can_store_picture(text) to authenticated;

create policy pictures_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pictures' and (select public.can_store_picture(name)));
create policy pictures_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pictures' and (select public.can_store_picture(name)));

-- Friends ---------------------------------------------------------------------------------------------------------

create table game.friendships (
  user_low uuid not null references game.citizens (user_id) on delete cascade,
  user_high uuid not null references game.citizens (user_id) on delete cascade,
  requested_by uuid not null references game.citizens (user_id) on delete cascade,
  requested_at timestamptz not null,
  accepted_at timestamptz,
  primary key (user_low, user_high),
  constraint friendships_ordered check (user_low < user_high),
  constraint friendships_requester check (requested_by in (user_low, user_high))
);
alter table game.friendships enable row level security;
comment on table game.friendships is 'Friends: a request by one citizen, accepted by the other.';
create index friendships_high_idx on game.friendships (user_high);
create index friendships_requested_by_idx on game.friendships (requested_by);

-- The other citizen, by name, or friend_invalid.
create function game.other_citizen(p_name text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_other uuid;
begin
  select user_id into v_other from game.citizens
  where (name collate game.citizen_name) = (btrim(coalesce(p_name, '')) collate game.citizen_name);
  if v_other is null or v_other = auth.uid() then
    raise exception 'friend_invalid' using errcode = '22023';
  end if;
  return v_other;
end;
$$;

-- Picture and description ------------------------------------------------------------------------------------------

create function public.set_my_bio(p_bio text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  if p_bio is null or char_length(btrim(p_bio)) > game.param('bio_max_length') then
    raise exception 'bio_invalid' using errcode = '22023';
  end if;
  update game.citizens set bio = btrim(p_bio) where user_id = v_citizen.user_id;
end;
$$;
comment on function public.set_my_bio(text) is 'Changes the citizen''s description.';
grant execute on function public.set_my_bio(text) to authenticated;

create function public.set_my_avatar(p_path text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  update game.citizens
  set avatar_path = game.require_picture(p_path, 'citizens/' || v_citizen.user_id::text)
  where user_id = v_citizen.user_id;
end;
$$;
comment on function public.set_my_avatar(text) is 'Uses an uploaded picture as the citizen''s, or the initials with null.';
grant execute on function public.set_my_avatar(text) to authenticated;

create function public.set_party_emblem(p_path text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_party bigint;
begin
  select id into v_party from game.parties where leader_user_id = v_citizen.user_id;
  if v_party is null then
    raise exception 'not_party_leader' using errcode = '42501';
  end if;
  update game.parties set emblem_path = game.require_picture(p_path, 'parties/' || v_party::text) where id = v_party;
end;
$$;
comment on function public.set_party_emblem(text) is 'The leader sets the picture of their party.';
grant execute on function public.set_party_emblem(text) to authenticated;

create function public.set_regiment_emblem(p_path text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_regiment bigint;
begin
  select id into v_regiment from game.regiments where leader_user_id = v_citizen.user_id and dissolved_at is null;
  if v_regiment is null then
    raise exception 'not_regiment_leader' using errcode = '42501';
  end if;
  update game.regiments set emblem_path = game.require_picture(p_path, 'regiments/' || v_regiment::text)
  where id = v_regiment;
end;
$$;
comment on function public.set_regiment_emblem(text) is 'The leader sets the picture of their regiment.';
grant execute on function public.set_regiment_emblem(text) to authenticated;

-- Profile -------------------------------------------------------------------------------------------------------------

create function public.get_my_profile_details()
returns table (
  bio text,
  avatar_path text,
  national_rank integer,
  national_citizens integer,
  party_id bigint,
  party_name text,
  party_emblem_path text,
  regiment_id bigint,
  regiment_name text,
  regiment_emblem_path text,
  friends integer,
  referrals integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select c.* from game.citizens as c where c.user_id = auth.uid()
  ),
  ranked as (
    select c.user_id,
           rank() over (order by s.experience desc, c.joined_at, c.user_id)::integer as position,
           count(*) over ()::integer as total
    from game.citizens as c
    join game.player_stats as s on s.user_id = c.user_id
    where c.country_code = (select me.country_code from me)
  )
  select me.bio, me.avatar_path, r.position, r.total,
         p.id, p.name, p.emblem_path,
         g.id, g.name, g.emblem_path,
         (select count(*)::integer from game.friendships as f
          where f.accepted_at is not null and me.user_id in (f.user_low, f.user_high)),
         (select count(*)::integer from game.citizens as x where x.referred_by_user_id = me.user_id)
  from me
  left join ranked as r on r.user_id = me.user_id
  left join game.party_memberships as pm on pm.user_id = me.user_id
  left join game.parties as p on p.id = pm.party_id
  left join game.regiment_members as gm on gm.user_id = me.user_id
  left join game.regiments as g on g.id = gm.regiment_id;
$$;
comment on function public.get_my_profile_details() is
  'The rest of the player''s profile: description, picture, place in their country by experience, party, regiment, '
  'friends and referrals.';
grant execute on function public.get_my_profile_details() to authenticated;

-- Achievements, read from what the player did; nothing is paid for them.
create function public.list_my_achievements()
returns table (achievement text, achieved boolean, achieved_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.achievement, a.achieved_at is not null or coalesce(a.reached, false), a.achieved_at
  from game.citizens as c
  join game.player_stats as s on s.user_id = c.user_id
  cross join lateral (values
    ('first_shift', 1, (select min(created_at) from game.work_shifts where user_id = c.user_id), null::boolean),
    ('first_training', 2, (select min(created_at) from game.training_sessions where user_id = c.user_id), null),
    ('first_battle', 3, (select min(t) from (
        select min(created_at) as t from game.battle_attacks where user_id = c.user_id
        union all select min(created_at) from game.independence_attacks where user_id = c.user_id) as x), null),
    ('company_founder', 4, (select min(created_at) from game.companies where owner_user_id = c.user_id), null),
    ('newspaper_founder', 5, (select created_at from game.newspapers where owner_user_id = c.user_id), null),
    ('first_article', 6, (select min(published_at) from game.articles where author_user_id = c.user_id), null),
    ('party_member', 7, (select joined_at from game.party_memberships where user_id = c.user_id), null),
    ('party_leader', 8, null, exists (select 1 from game.parties where leader_user_id = c.user_id)),
    ('regiment_founder', 9, (select min(founded_at) from game.regiments where founder_user_id = c.user_id), null),
    ('office_holder', 10, (select min(since) from game.offices where user_id = c.user_id), null),
    ('mission_streak', 11, (select min(claimed_at) from game.mission_claims
                            where user_id = c.user_id and streak >= game.param('mission_streak_days')), null),
    ('level_10', 12, null, game.level_for_experience(s.experience) >= 10),
    ('sergeant', 13, null, game.rank_step(s.military_xp) >= 16),
    ('liberating_hero', 14, (select min(granted_at) from game.titles
                             where user_id = c.user_id and title = 'liberating_hero'), null)
  ) as a (achievement, position, achieved_at, reached)
  where c.user_id = auth.uid()
  order by a.position;
$$;
comment on function public.list_my_achievements() is 'Every achievement and whether the player has it, with when.';
grant execute on function public.list_my_achievements() to authenticated;

create function public.count_unread_messages()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from game.messages where recipient_user_id = auth.uid() and read_at is null;
$$;
comment on function public.count_unread_messages() is 'Private messages the player has not read.';
grant execute on function public.count_unread_messages() to authenticated;

-- Referrals -----------------------------------------------------------------------------------------------------------

create function public.set_my_referrer(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_referrer game.citizens;
begin
  if v_citizen.referred_by_user_id is not null
     or game.now() > v_citizen.joined_at + make_interval(hours => game.param('referral_window_hours')::integer) then
    raise exception 'referral_closed' using errcode = '22023';
  end if;
  select * into v_referrer from game.citizens
  where (name collate game.citizen_name) = (btrim(coalesce(p_name, '')) collate game.citizen_name);
  if not found or v_referrer.user_id = v_citizen.user_id or v_referrer.joined_at >= v_citizen.joined_at then
    raise exception 'referrer_invalid' using errcode = '22023';
  end if;
  update game.citizens set referred_by_user_id = v_referrer.user_id where user_id = v_citizen.user_id;
end;
$$;
comment on function public.set_my_referrer(text) is
  'A new citizen names who invited them, once and within the referral window.';
grant execute on function public.set_my_referrer(text) to authenticated;

create function public.list_my_referrals()
returns table (name text, avatar_path text, country_code text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.avatar_path, c.country_code, c.joined_at
  from game.citizens as c
  where c.referred_by_user_id = auth.uid()
  order by c.joined_at desc
  limit 100;
$$;
comment on function public.list_my_referrals() is 'The citizens the player invited, latest first.';
grant execute on function public.list_my_referrals() to authenticated;

-- Friends ---------------------------------------------------------------------------------------------------------

-- Asks someone to be friends; if they had asked already, it accepts.
create function public.request_friend(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_other uuid := game.other_citizen(p_name);
  v_low uuid := least(v_citizen.user_id, v_other);
  v_high uuid := greatest(v_citizen.user_id, v_other);
  v_row game.friendships;
begin
  select * into v_row from game.friendships where user_low = v_low and user_high = v_high for update;
  if found then
    if v_row.accepted_at is null and v_row.requested_by = v_other then
      update game.friendships set accepted_at = game.now() where user_low = v_low and user_high = v_high;
      perform game.notify(v_other, null, 'friend_accepted', jsonb_build_object('name', v_citizen.name));
      return 'accepted';
    end if;
    return case when v_row.accepted_at is null then 'requested' else 'accepted' end;
  end if;
  if (select count(*) from game.friendships where v_citizen.user_id in (user_low, user_high))
     >= game.param('friends_max') then
    raise exception 'friends_full' using errcode = '22023';
  end if;
  insert into game.friendships (user_low, user_high, requested_by, requested_at)
  values (v_low, v_high, v_citizen.user_id, game.now());
  perform game.notify(v_other, null, 'friend_requested', jsonb_build_object('name', v_citizen.name));
  return 'requested';
end;
$$;
comment on function public.request_friend(text) is 'Asks a citizen to be friends, or accepts their request.';
grant execute on function public.request_friend(text) to authenticated;

create function public.answer_friend(p_name text, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_other uuid := game.other_citizen(p_name);
begin
  if p_accept then
    update game.friendships set accepted_at = game.now()
    where user_low = least(v_citizen.user_id, v_other) and user_high = greatest(v_citizen.user_id, v_other)
      and requested_by = v_other and accepted_at is null;
  else
    delete from game.friendships
    where user_low = least(v_citizen.user_id, v_other) and user_high = greatest(v_citizen.user_id, v_other)
      and requested_by = v_other and accepted_at is null;
  end if;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if p_accept then
    perform game.notify(v_other, null, 'friend_accepted', jsonb_build_object('name', v_citizen.name));
  end if;
end;
$$;
comment on function public.answer_friend(text, boolean) is 'Accepts or declines a friend request.';
grant execute on function public.answer_friend(text, boolean) to authenticated;

-- Ends a friendship or withdraws a request.
create function public.remove_friend(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_other uuid := game.other_citizen(p_name);
begin
  delete from game.friendships
  where user_low = least(v_citizen.user_id, v_other) and user_high = greatest(v_citizen.user_id, v_other);
end;
$$;
comment on function public.remove_friend(text) is 'Ends a friendship, or withdraws or declines a request.';
grant execute on function public.remove_friend(text) to authenticated;

create function public.list_my_friends()
returns table (name text, avatar_path text, country_code text, status text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.avatar_path, c.country_code,
         case when f.accepted_at is not null then 'friend'
              when f.requested_by = auth.uid() then 'outgoing'
              else 'incoming' end,
         coalesce(f.accepted_at, f.requested_at)
  from game.friendships as f
  join game.citizens as c
    on c.user_id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  where auth.uid() in (f.user_low, f.user_high)
  order by f.accepted_at is not null, coalesce(f.accepted_at, f.requested_at) desc
  limit 500;
$$;
comment on function public.list_my_friends() is 'Friends and pending requests, the incoming ones first.';
grant execute on function public.list_my_friends() to authenticated;

-- Regiments --------------------------------------------------------------------------------------------------------

create function public.found_regiment(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_id bigint;
begin
  if p_name is null or char_length(btrim(p_name)) not between 3 and 40 then
    raise exception 'name_invalid' using errcode = '22023';
  end if;
  if exists (select 1 from game.regiment_members where user_id = v_citizen.user_id) then
    raise exception 'already_in_regiment' using errcode = '22023';
  end if;
  insert into game.regiments (country_code, name, founder_user_id, leader_user_id, founded_at)
  values (v_citizen.country_code, btrim(p_name), v_citizen.user_id, v_citizen.user_id, game.now())
  returning id into v_id;
  insert into game.regiment_members (user_id, regiment_id, joined_at) values (v_citizen.user_id, v_id, game.now());
  return v_id;
exception when unique_violation then
  raise exception 'name_taken' using errcode = '22023';
end;
$$;
comment on function public.found_regiment(text) is 'Founds a regiment of the citizen''s country and leads it; free.';
grant execute on function public.found_regiment(text) to authenticated;

create function public.join_regiment(p_regiment_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  if exists (select 1 from game.regiment_members where user_id = v_citizen.user_id) then
    raise exception 'already_in_regiment' using errcode = '22023';
  end if;
  perform 1 from game.regiments
  where id = p_regiment_id and country_code = v_citizen.country_code and dissolved_at is null
  for share;
  if not found then
    raise exception 'regiment_not_found' using errcode = 'P0002';
  end if;
  insert into game.regiment_members (user_id, regiment_id, joined_at)
  values (v_citizen.user_id, p_regiment_id, game.now());
exception when unique_violation then
  raise exception 'already_in_regiment' using errcode = '22023';
end;
$$;
comment on function public.join_regiment(bigint) is 'Joins a regiment of the citizen''s country.';
grant execute on function public.join_regiment(bigint) to authenticated;

create function public.leave_regiment()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
begin
  if not exists (select 1 from game.regiment_members where user_id = v_citizen.user_id) then
    raise exception 'not_in_regiment' using errcode = 'P0002';
  end if;
  perform game.leave_regiment(v_citizen.user_id);
end;
$$;
comment on function public.leave_regiment() is 'Leaves the regiment; the oldest member takes the lead, or it dissolves.';
grant execute on function public.leave_regiment() to authenticated;

create function public.list_regiments(p_country_code text)
returns table (regiment_id bigint, name text, emblem_path text, leader text, members integer, founded_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name, r.emblem_path, l.name,
         (select count(*)::integer from game.regiment_members as m where m.regiment_id = r.id),
         r.founded_at
  from game.regiments as r
  left join game.citizens as l on l.user_id = r.leader_user_id
  where r.country_code = p_country_code and r.dissolved_at is null
  order by 5 desc, r.founded_at
  limit 200;
$$;
comment on function public.list_regiments(text) is 'The regiments of a country, the largest first.';
grant execute on function public.list_regiments(text) to anon, authenticated;

create function public.get_my_regiment()
returns table (regiment_id bigint, name text, emblem_path text, leader text, is_leader boolean, members integer,
               joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name, r.emblem_path, l.name, r.leader_user_id = m.user_id,
         (select count(*)::integer from game.regiment_members as x where x.regiment_id = r.id),
         m.joined_at
  from game.regiment_members as m
  join game.regiments as r on r.id = m.regiment_id
  left join game.citizens as l on l.user_id = r.leader_user_id
  where m.user_id = auth.uid();
$$;
comment on function public.get_my_regiment() is 'The player''s regiment, if any.';
grant execute on function public.get_my_regiment() to authenticated;

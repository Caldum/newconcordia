-- L4 · Daily missions, first steps, press and private messages (brief section 3, GDD D13 and D25–D27, spec PD-15,
-- ADR 0040).
--
-- Missions (brief): every UTC day work, train, land 5 hits and read an article; claiming all four pays 1 GOLD once a
-- day, and every 7 days in a row 3 GOLD more (system rewards). Progress is read from what the player did.
-- game.mission_claims       one claim per player and day, with its streak
-- game.newspapers, game.articles, game.article_reads   one newspaper per citizen, articles in their country's press,
--                           who read what (the reading mission); admins hide articles (L5 moderation)
-- game.messages             private messages between citizens
-- First steps (PD-15, the tutorial is UX pending): a checklist read from the player's state.
--
-- public.get_my_missions, claim_daily_missions, get_my_first_steps, found_newspaper, publish_article,
--   list_articles, read_article, get_my_newspaper, send_message, list_conversations, list_messages
--
-- Errors (ADR 0005): missions_incomplete, already_claimed, name_invalid, name_taken, already_has_newspaper,
-- no_newspaper, article_invalid, article_not_found, recipient_invalid, message_invalid.
--
-- Rollback: drop the public functions created here, game.messages, game.article_reads, game.articles,
-- game.newspapers, game.mission_claims, game.mission_progress; delete the mint reasons and balance_params rows
-- added here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into game.balance_params (key, value, description) values
  ('mission_reward', 100, 'GOLD hundredths for completing the four daily missions (brief section 3).'),
  ('mission_streak_reward', 300, 'GOLD hundredths more for every 7 days in a row.'),
  ('mission_streak_days', 7, 'Days in a row of the streak reward.'),
  ('mission_hits', 5, 'Hits the fighting mission asks for.'),
  ('message_max_per_hour', 30, 'Private messages a citizen may send per hour.');

insert into game.mint_reasons (kind, authority, description) values
  ('daily_missions', 'system_reward', 'The four daily missions, once a day.'),
  ('mission_streak', 'system_reward', 'Seven days in a row of daily missions.');

-- Press ---------------------------------------------------------------------------------------------------------

create table game.newspapers (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null unique references game.citizens (user_id) on delete cascade,
  country_code text not null references game.countries (code),
  name text not null check (char_length(btrim(name)) between 3 and 60),
  created_at timestamptz not null
);
alter table game.newspapers enable row level security;
comment on table game.newspapers is 'One newspaper per citizen, in the press of their country.';
create unique index newspapers_name_key on game.newspapers (lower(btrim(name)));
create index newspapers_country_idx on game.newspapers (country_code);

create table game.articles (
  id bigint generated always as identity primary key,
  newspaper_id bigint not null references game.newspapers (id),
  author_user_id uuid not null references game.citizens (user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  idempotency_key text unique check (char_length(idempotency_key) <= 200),
  published_at timestamptz not null,
  hidden_at timestamptz,
  hidden_by uuid references auth.users (id) on delete set null
);
alter table game.articles enable row level security;
comment on table game.articles is 'Articles of the press; hidden ones (moderation) stay for the record.';
create index articles_newspaper_idx on game.articles (newspaper_id, published_at);
create index articles_author_idx on game.articles (author_user_id);
create index articles_hidden_by_idx on game.articles (hidden_by) where hidden_by is not null;

create table game.article_reads (
  article_id bigint not null references game.articles (id),
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  read_at timestamptz not null,
  primary key (article_id, user_id)
);
alter table game.article_reads enable row level security;
comment on table game.article_reads is 'Who read which article and when (the reading mission).';
create index article_reads_user_idx on game.article_reads (user_id, read_at);

create function public.found_newspaper(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_id bigint;
begin
  if p_name is null or char_length(btrim(p_name)) not between 3 and 60 then
    raise exception 'name_invalid' using errcode = '22023';
  end if;
  if exists (select 1 from game.newspapers where owner_user_id = v_citizen.user_id) then
    raise exception 'already_has_newspaper' using errcode = '22023';
  end if;
  insert into game.newspapers (owner_user_id, country_code, name, created_at)
  values (v_citizen.user_id, v_citizen.country_code, btrim(p_name), game.now())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'name_taken' using errcode = '22023';
end;
$$;
comment on function public.found_newspaper(text) is 'Founds the citizen''s newspaper (one each), free.';
grant execute on function public.found_newspaper(text) to authenticated;

create function public.publish_article(p_title text, p_body text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'article:' || auth.uid()::text || ':' || coalesce(p_key::text, gen_random_uuid()::text);
  v_paper bigint;
  v_id bigint;
begin
  select id into v_id from game.articles where idempotency_key = v_key;
  if found then
    return v_id;
  end if;
  select id into v_paper from game.newspapers where owner_user_id = v_citizen.user_id;
  if v_paper is null then
    raise exception 'no_newspaper' using errcode = 'P0002';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 120
     or p_body is null or char_length(btrim(p_body)) not between 1 and 8000 then
    raise exception 'article_invalid' using errcode = '22023';
  end if;
  insert into game.articles (newspaper_id, author_user_id, title, body, idempotency_key, published_at)
  values (v_paper, v_citizen.user_id, btrim(p_title), btrim(p_body), v_key, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.publish_article(text, text, uuid) is 'Publishes an article in the citizen''s newspaper.';
grant execute on function public.publish_article(text, text, uuid) to authenticated;

create function public.list_articles(p_country_code text)
returns table (
  article_id bigint, title text, newspaper text, author text, published_at timestamptz, readers integer, read_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.title, n.name, c.name, a.published_at,
         (select count(*)::integer from game.article_reads as r where r.article_id = a.id),
         exists (select 1 from game.article_reads as r where r.article_id = a.id and r.user_id = auth.uid())
  from game.articles as a
  join game.newspapers as n on n.id = a.newspaper_id
  join game.citizens as c on c.user_id = a.author_user_id
  where n.country_code = p_country_code and a.hidden_at is null
  order by a.published_at desc
  limit 30;
$$;
comment on function public.list_articles(text) is 'The latest visible articles of a country''s press.';
grant execute on function public.list_articles(text) to anon, authenticated;

-- Reads an article; for a signed-in citizen it counts as read (once).
create function public.read_article(p_article_id bigint)
returns table (article_id bigint, title text, body text, newspaper text, author text, published_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from game.articles where id = p_article_id and hidden_at is null) then
    raise exception 'article_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from game.citizens where user_id = auth.uid()) then
    insert into game.article_reads (article_id, user_id, read_at) values (p_article_id, auth.uid(), game.now())
    on conflict do nothing;
  end if;
  return query
  select a.id, a.title, a.body, n.name, c.name, a.published_at
  from game.articles as a
  join game.newspapers as n on n.id = a.newspaper_id
  join game.citizens as c on c.user_id = a.author_user_id
  where a.id = p_article_id;
end;
$$;
comment on function public.read_article(bigint) is 'An article''s text; a citizen reading it counts for the reading mission.';
grant execute on function public.read_article(bigint) to authenticated;

create function public.get_my_newspaper()
returns table (newspaper_id bigint, name text, articles integer)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.name, (select count(*)::integer from game.articles as a where a.newspaper_id = n.id)
  from game.newspapers as n where n.owner_user_id = auth.uid();
$$;
comment on function public.get_my_newspaper() is 'The player''s newspaper; no rows without one.';
grant execute on function public.get_my_newspaper() to authenticated;

-- Missions ----------------------------------------------------------------------------------------------------------

create table game.mission_claims (
  user_id uuid not null references game.citizens (user_id) on delete cascade,
  game_day date not null,
  streak integer not null check (streak >= 1),
  reward bigint not null check (reward > 0),
  claimed_at timestamptz not null,
  primary key (user_id, game_day)
);
alter table game.mission_claims enable row level security;
comment on table game.mission_claims is 'Daily missions claimed: one per player and UTC day, with the streak.';

-- What the player did today toward each mission.
create function game.mission_progress(p_user_id uuid, p_day date)
returns table (mission text, progress integer, goal integer)
language sql
stable
set search_path = ''
as $$
  select 'work', (select count(*)::integer from game.work_shifts where user_id = p_user_id and game_day = p_day), 1
  union all
  select 'train', (select count(*)::integer from game.training_sessions where user_id = p_user_id and game_day = p_day), 1
  union all
  select 'fight',
         (select count(*)::integer from game.battle_attacks
          where user_id = p_user_id and game.game_day(created_at) = p_day)
         + (select count(*)::integer from game.independence_attacks
            where user_id = p_user_id and game.game_day(created_at) = p_day),
         game.param('mission_hits')::integer
  union all
  select 'read', (select count(*)::integer from game.article_reads where user_id = p_user_id and game.game_day(read_at) = p_day), 1;
$$;

create function public.get_my_missions()
returns table (mission text, progress integer, goal integer, done boolean, claimed boolean, streak integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.mission, least(m.progress, m.goal), m.goal, m.progress >= m.goal,
         exists (select 1 from game.mission_claims where user_id = auth.uid() and game_day = game.game_day()),
         coalesce((select streak from game.mission_claims where user_id = auth.uid()
                   and game_day >= game.game_day() - 1 order by game_day desc limit 1), 0)
  from game.mission_progress(auth.uid(), game.game_day()) as m
  where exists (select 1 from game.citizens where user_id = auth.uid());
$$;
comment on function public.get_my_missions() is 'Today''s four missions, whether they are claimed, and the streak.';
grant execute on function public.get_my_missions() to authenticated;

create function public.claim_daily_missions()
returns table (reward bigint, streak integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_day date := game.game_day();
  v_streak integer;
  v_reward bigint := game.param('mission_reward')::bigint;
begin
  perform 1 from game.player_stats where user_id = v_citizen.user_id for update;
  if exists (select 1 from game.mission_claims where user_id = v_citizen.user_id and game_day = v_day) then
    raise exception 'already_claimed' using errcode = '22023';
  end if;
  if exists (select 1 from game.mission_progress(v_citizen.user_id, v_day) where progress < goal) then
    raise exception 'missions_incomplete' using errcode = '22023';
  end if;
  v_streak := coalesce((select c.streak from game.mission_claims as c
                        where c.user_id = v_citizen.user_id and c.game_day = v_day - 1), 0) + 1;
  perform game.post(
    'daily_missions', 'missions:' || v_citizen.user_id::text || ':' || v_day::text, v_citizen.user_id,
    array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(v_citizen.user_id, 'GOLD'), v_reward,
              'daily_missions', null)::game.ledger_leg]
  );
  if v_streak % game.param('mission_streak_days')::integer = 0 then
    perform game.post(
      'mission_streak', 'mission_streak:' || v_citizen.user_id::text || ':' || v_day::text, v_citizen.user_id,
      array[row(game.system_account('issuer', 'GOLD'), game.citizen_account(v_citizen.user_id, 'GOLD'),
                game.param('mission_streak_reward')::bigint, 'mission_streak', null)::game.ledger_leg]
    );
    v_reward := v_reward + game.param('mission_streak_reward')::bigint;
  end if;
  insert into game.mission_claims (user_id, game_day, streak, reward, claimed_at)
  values (v_citizen.user_id, v_day, v_streak, v_reward, game.now());
  return query select v_reward, v_streak;
end;
$$;
comment on function public.claim_daily_missions() is
  'Pays 1 GOLD for today''s four missions, once; every 7 days in a row, 3 GOLD more.';
grant execute on function public.claim_daily_missions() to authenticated;

-- First steps -------------------------------------------------------------------------------------------------------

create function public.get_my_first_steps()
returns table (step text, done boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.step, s.done
  from game.citizens as c
  cross join lateral (values
    ('work', 1, exists (select 1 from game.work_shifts where user_id = c.user_id)),
    ('buy', 2, exists (select 1 from game.market_trades where buyer_user_id = c.user_id)),
    ('train', 3, exists (select 1 from game.training_sessions where user_id = c.user_id)),
    ('read', 4, exists (select 1 from game.article_reads where user_id = c.user_id)),
    ('party', 5, exists (select 1 from game.party_memberships where user_id = c.user_id)),
    ('fight', 6, exists (select 1 from game.battle_attacks where user_id = c.user_id)
                 or exists (select 1 from game.independence_attacks where user_id = c.user_id))
  ) as s (step, position, done)
  where c.user_id = auth.uid()
  order by s.position;
$$;
comment on function public.get_my_first_steps() is 'The new citizen''s checklist, read from what they did.';
grant execute on function public.get_my_first_steps() to authenticated;

-- Messages ------------------------------------------------------------------------------------------------------------

create table game.messages (
  id bigint generated always as identity primary key,
  sender_user_id uuid not null references game.citizens (user_id) on delete cascade,
  recipient_user_id uuid not null references game.citizens (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  idempotency_key text unique check (char_length(idempotency_key) <= 200),
  sent_at timestamptz not null,
  read_at timestamptz,
  constraint messages_not_self check (sender_user_id <> recipient_user_id)
);
alter table game.messages enable row level security;
comment on table game.messages is 'Private messages between citizens; only the two of them read them.';
create index messages_recipient_idx on game.messages (recipient_user_id, sent_at);
create index messages_sender_idx on game.messages (sender_user_id, sent_at);

create function public.send_message(p_to_name text, p_body text, p_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen game.citizens := game.require_citizen();
  v_key text := 'message:' || auth.uid()::text || ':' || coalesce(p_key::text, gen_random_uuid()::text);
  v_to uuid;
  v_id bigint;
begin
  select id into v_id from game.messages where idempotency_key = v_key;
  if found then
    return v_id;
  end if;
  select user_id into v_to from game.citizens where lower(name) = lower(btrim(coalesce(p_to_name, '')));
  if v_to is null or v_to = v_citizen.user_id then
    raise exception 'recipient_invalid' using errcode = '22023';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'message_invalid' using errcode = '22023';
  end if;
  if (select count(*) from game.messages
      where sender_user_id = v_citizen.user_id and sent_at > game.now() - interval '1 hour')
     >= game.param('message_max_per_hour') then
    raise exception 'rate_limited' using errcode = '22023';
  end if;
  insert into game.messages (sender_user_id, recipient_user_id, body, idempotency_key, sent_at)
  values (v_citizen.user_id, v_to, btrim(p_body), v_key, game.now())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.send_message(text, text, uuid) is 'Sends a private message to a citizen by name.';
grant execute on function public.send_message(text, text, uuid) to authenticated;

create function public.list_conversations()
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
         (select x.body from mine as x where x.other = o.other order by x.sent_at desc, x.id desc limit 1),
         max(o.sent_at),
         count(*) filter (where o.recipient_user_id = auth.uid() and o.read_at is null)::integer
  from mine as o
  join game.citizens as c on c.user_id = o.other
  group by o.other, c.name
  order by max(o.sent_at) desc
  limit 50;
$$;
comment on function public.list_conversations() is 'The player''s conversations, latest first, with unread counts.';
grant execute on function public.list_conversations() to authenticated;

-- A conversation with someone; reading it marks their messages read.
create function public.list_messages(p_with_name text)
returns table (message_id bigint, mine boolean, body text, sent_at timestamptz)
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
  select m.id, m.sender_user_id = v_citizen.user_id, m.body, m.sent_at
  from game.messages as m
  where (m.sender_user_id = v_citizen.user_id and m.recipient_user_id = v_other)
     or (m.sender_user_id = v_other and m.recipient_user_id = v_citizen.user_id)
  order by m.sent_at desc, m.id desc
  limit 100;
end;
$$;
comment on function public.list_messages(text) is 'The latest messages with a citizen; marks theirs as read.';
grant execute on function public.list_messages(text) to authenticated;

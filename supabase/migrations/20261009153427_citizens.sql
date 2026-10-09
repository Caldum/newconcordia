-- D05 · Accounts: the citizen behind each account.
--
-- Supabase Auth owns credentials, sessions and email confirmation. The game keeps one citizen per account:
-- a public name (unique ignoring case and accents, never changes), the country chosen at sign-up and the
-- interface language for emails. D06 turns the country into full citizenship (number, adaptation period,
-- waitlist and changes).
--
-- Email sign-ups send the citizen in the user metadata and a trigger on auth.users creates it in the same
-- transaction: a taken or invalid name rejects the sign-up and leaves nothing half created. Google sign-ups
-- arrive without one and create it afterwards with public.create_my_citizen. Metadata is input only: it is
-- validated here and never read for authorization.
--
-- Until the email is confirmed the name is only reserved. A reservation is released when the same browser
-- signs up again (it sends the same random signup_key, for example to fix a mistyped email) or after 24
-- hours without confirmation, so a typo never locks a name forever.
--
-- Errors are stable codes in the message (ADR 0005): citizen_name_invalid, citizen_name_taken,
-- country_not_in_play, locale_invalid, citizen_exists, not_authenticated.
--
-- Rollback: drop the two triggers on auth.users, the public functions, game.citizens, the game functions and the
-- collation created here.

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Names compare at ICU strength 1: «Camila Ríos», «CAMILA RIOS» and «camila rios» are the same citizen.
create collation game.citizen_name (provider = icu, locale = 'und-u-ks-level1', deterministic = false);

create function game.is_valid_citizen_name(p_name text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  -- 3 to 24 characters in NFC; words of letters or digits joined by one space, hyphen or apostrophe,
  -- each optionally ending in a period («J. Ríos», «Jean-Luc», «O'Neill»).
  select p_name is not null
    and p_name is nfc normalized
    and char_length(p_name) between 3 and 24
    and p_name ~ '^[[:alnum:]]+\.?([ ''-][[:alnum:]]+\.?)*$';
$$;
comment on function game.is_valid_citizen_name(text) is 'Format rules for citizen names.';

create table game.citizens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  country_code text not null references game.countries (code),
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  constraint citizens_name_is_valid check (game.is_valid_citizen_name(name)),
  constraint citizens_locale_is_supported check (locale in ('es', 'en'))
);
alter table game.citizens enable row level security;
comment on table game.citizens is 'One citizen per account. The name is public, unique and immutable.';
comment on column game.citizens.country_code is 'Country chosen at sign-up; D06 manages citizenship from here.';
comment on column game.citizens.locale is 'Interface language, used for game emails.';

create unique index citizens_name_key on game.citizens ((name collate game.citizen_name));
create index citizens_country_code_idx on game.citizens (country_code);

-- The name is chosen once: it cannot change after the email is confirmed.
create function game.keep_citizen_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name
    and exists (select 1 from auth.users where id = old.user_id and email_confirmed_at is not null) then
    raise exception 'citizen_name_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger citizens_keep_name
before update of name on game.citizens
for each row execute function game.keep_citizen_name();

-- Creation ----------------------------------------------------------------------------------------

-- The citizen holding a name only as an unconfirmed reservation that this sign-up may take over.
create function game.releasable_citizen(p_name text, p_signup_key text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id
  from game.citizens as c
  join auth.users as u on u.id = c.user_id
  where (c.name collate game.citizen_name) = p_name
    and u.email_confirmed_at is null
    and (
      u.created_at < game.now() - interval '24 hours'
      or (char_length(p_signup_key) >= 32 and u.raw_user_meta_data ->> 'signup_key' = p_signup_key)
    );
$$;
comment on function game.releasable_citizen(text, text) is 'Unconfirmed reservation of a name that a new sign-up may take over.';

create function game.create_citizen(
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
  return v_citizen;
end;
$$;
comment on function game.create_citizen(uuid, text, text, text, text) is 'Validates and creates the citizen of an account.';

-- Email sign-ups carry the citizen in their metadata. Signing up again with the same unconfirmed email
-- updates the account instead of inserting it, and replaces the reservation with the new choice.
create function game.create_citizen_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.email_confirmed_at is not null
      or new.raw_user_meta_data is not distinct from old.raw_user_meta_data then
      return new;
    end if;
    delete from game.citizens where user_id = new.id;
  end if;

  if new.raw_user_meta_data ? 'citizen_name' then
    perform game.create_citizen(
      new.id,
      new.raw_user_meta_data ->> 'citizen_name',
      new.raw_user_meta_data ->> 'country_code',
      coalesce(new.raw_user_meta_data ->> 'locale', 'es'),
      new.raw_user_meta_data ->> 'signup_key'
    );
  end if;
  return new;
end;
$$;
comment on function game.create_citizen_for_new_user() is 'Creates or replaces the citizen sent with an email sign-up.';

create trigger on_auth_user_created_create_citizen
after insert on auth.users
for each row execute function game.create_citizen_for_new_user();

create trigger on_auth_user_signed_up_again_replace_citizen
after update of raw_user_meta_data on auth.users
for each row execute function game.create_citizen_for_new_user();

-- API ---------------------------------------------------------------------------------------------

create function public.check_citizen_name(p_name text, p_signup_key text default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
begin
  if not game.is_valid_citizen_name(v_name) then
    return 'invalid';
  end if;
  if exists (select 1 from game.citizens as c where (c.name collate game.citizen_name) = v_name)
    and game.releasable_citizen(v_name, p_signup_key) is null then
    return 'taken';
  end if;
  return 'available';
end;
$$;
comment on function public.check_citizen_name(text, text) is 'available, taken or invalid. Names are public.';
grant execute on function public.check_citizen_name(text, text) to anon, authenticated;

create function public.create_my_citizen(p_name text, p_country_code text, p_locale text)
returns table (name text, country_code text, locale text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_citizen game.citizens;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_citizen := game.create_citizen(v_user_id, p_name, p_country_code, p_locale);
  return query select v_citizen.name, v_citizen.country_code, v_citizen.locale;
end;
$$;
comment on function public.create_my_citizen(text, text, text) is 'Creates the citizen of the signed-in account (Google sign-ups).';
grant execute on function public.create_my_citizen(text, text, text) to authenticated;

create function public.get_my_citizen()
returns table (name text, country_code text, locale text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.country_code, c.locale
  from game.citizens as c
  where c.user_id = auth.uid();
$$;
comment on function public.get_my_citizen() is 'The citizen of the signed-in account, or no rows.';
grant execute on function public.get_my_citizen() to authenticated;

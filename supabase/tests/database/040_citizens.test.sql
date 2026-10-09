-- D05: one citizen per account, with a unique and immutable name.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Helpers: create an Auth user the way Auth does, and act as a signed-in user.
create function pg_temp.new_user(p_email text, p_metadata jsonb default '{}')
returns uuid
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          p_email, p_metadata, now(), now())
  returning id;
$$;

create function pg_temp.sign_in(p_user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- Name format.
select ok(game.is_valid_citizen_name('Camila Ríos'), 'accented names are valid');
select ok(game.is_valid_citizen_name('J. Ríos'), 'initials are valid');
select ok(game.is_valid_citizen_name('Jean-Luc O''Neill'), 'hyphens and apostrophes join words');
select ok(game.is_valid_citizen_name('Ana2'), 'digits are valid');
select ok(not game.is_valid_citizen_name('Al'), 'two characters are too short');
select ok(not game.is_valid_citizen_name(repeat('a', 25)), 'more than 24 characters is too long');
select ok(not game.is_valid_citizen_name('Camila  Ríos'), 'two spaces in a row are invalid');
select ok(not game.is_valid_citizen_name(' Camila'), 'leading spaces are invalid');
select ok(not game.is_valid_citizen_name('Camila_Ríos'), 'symbols are invalid');
select ok(not game.is_valid_citizen_name(normalize('Camila Ríos', NFD)), 'names are stored in NFC');

-- Email sign-up: the trigger creates the citizen from the metadata.
select lives_ok(
  $$ select pg_temp.new_user('camila@example.com',
       '{"citizen_name": " Camila Ríos ", "country_code": "ARG", "locale": "es"}') $$,
  'an email sign-up with a citizen succeeds'
);
select results_eq(
  $$ select c.name, c.country_code, c.locale from game.citizens c
     join auth.users u on u.id = c.user_id where u.email = 'camila@example.com' $$,
  $$ values ('Camila Ríos', 'ARG', 'es') $$,
  'the citizen is created with a trimmed name, the country and the language'
);
select throws_ok(
  $$ select pg_temp.new_user('copy@example.com', '{"citizen_name": "CAMILA RIOS", "country_code": "BRA"}') $$,
  '23505',
  'citizen_name_taken',
  'a name that differs only in case or accents is taken, and the sign-up fails'
);
select is(
  (select count(*) from auth.users where email = 'copy@example.com')::int,
  0,
  'a rejected sign-up leaves no account behind'
);
select throws_ok(
  $$ select pg_temp.new_user('far@example.com', '{"citizen_name": "Lejano", "country_code": "URY"}') $$,
  '22023',
  'country_not_in_play',
  'the country must be in play'
);
select throws_ok(
  $$ select pg_temp.new_user('lang@example.com', '{"citizen_name": "Idioma", "country_code": "ARG", "locale": "fr"}') $$,
  '22023',
  'locale_invalid',
  'the language must be supported'
);

-- Once the email is confirmed the name never changes, not even for the owner of the table.
update auth.users set email_confirmed_at = now() where email = 'camila@example.com';
select throws_ok(
  $$ update game.citizens set name = 'Otra Camila' where name = 'Camila Ríos' $$,
  '23514',
  'citizen_name_immutable',
  'the citizen name cannot change'
);

-- Reservations: an unconfirmed sign-up only reserves its name.
select pg_temp.new_user('typo@exmaple.com',
  '{"citizen_name": "Lucía Paz", "country_code": "CHL", "signup_key": "k1k1k1k1k1k1k1k1k1k1k1k1k1k1k1k1"}');
select throws_ok(
  $$ select pg_temp.new_user('other@example.com', '{"citizen_name": "Lucia Paz", "country_code": "CHL"}') $$,
  '23505',
  'citizen_name_taken',
  'another person cannot take a fresh reservation'
);
select lives_ok(
  $$ select pg_temp.new_user('lucia@example.com',
       '{"citizen_name": "Lucía Paz", "country_code": "CHL", "signup_key": "k1k1k1k1k1k1k1k1k1k1k1k1k1k1k1k1"}') $$,
  'the same browser fixes a mistyped email and keeps its name'
);
select is(
  (select u.email from game.citizens c join auth.users u on u.id = c.user_id where c.name = 'Lucía Paz'),
  'lucia@example.com',
  'the name moves to the corrected sign-up'
);
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"citizen_name": "Lucía Paz Soto"}'
where email = 'lucia@example.com';
select is(
  (select c.name from game.citizens c join auth.users u on u.id = c.user_id where u.email = 'lucia@example.com'),
  'Lucía Paz Soto',
  'signing up again before confirming replaces the reservation'
);
update auth.users set created_at = now() - interval '25 hours' where email = 'lucia@example.com';
select is(
  public.check_citizen_name('Lucía Paz Soto'),
  'available',
  'a reservation not confirmed in 24 hours is released'
);
update auth.users set created_at = now() - interval '25 hours' where email = 'camila@example.com';
select is(public.check_citizen_name('Camila Ríos'), 'taken', 'a confirmed name is never released');
select lives_ok(
  $$ select pg_temp.new_user('late@example.com', '{"citizen_name": "Lucía Paz Soto", "country_code": "ARG"}') $$,
  'a new sign-up takes over an expired reservation'
);

-- Name check for the sign-up form (public).
set local role anon;
select is(public.check_citizen_name('camila rios'), 'taken', 'anyone can see that a name is taken');
select is(public.check_citizen_name('Tomás Vera'), 'available', 'a free name is available');
select is(public.check_citizen_name('x'), 'invalid', 'an invalid name is reported as such');
select throws_ok(
  $$ select * from public.create_my_citizen('Nadie', 'ARG', 'es') $$,
  '42501',
  null,
  'anonymous visitors cannot create citizens'
);
reset role;

-- Google sign-up: no citizen until the player chooses one.
select pg_temp.new_user('google@example.com', '{"full_name": "Tomás Vera"}') as google_id \gset
select is(
  (select count(*) from game.citizens where user_id = :'google_id')::int,
  0,
  'a sign-up without a citizen name creates no citizen'
);
select pg_temp.sign_in(:'google_id');
select results_eq(
  $$ select * from public.create_my_citizen('Tomás Vera', 'ESP', 'en') $$,
  $$ values ('Tomás Vera', 'ESP', 'en') $$,
  'the signed-in player creates their own citizen'
);
select throws_ok(
  $$ select * from public.create_my_citizen('Tomás Segundo', 'ESP', 'en') $$,
  '23505',
  'citizen_exists',
  'an account has a single citizen'
);
select results_eq(
  $$ select name, country_code, locale from public.get_my_citizen() $$,
  $$ values ('Tomás Vera', 'ESP', 'en') $$,
  'a player reads only their own citizen'
);
reset role;

select * from finish();
rollback;

-- D02: the game clock and the game day (fixed GMT−3, day changes at 03:00 UTC).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- game.now(): the real clock unless a fixed instant is set for the transaction.
select ok(
  game.now() between now() - interval '1 second' and now() + interval '1 second',
  'game.now() follows the database clock by default'
);

set local game.fixed_now = '2026-10-09 02:59:59+00';
select is(game.now(), '2026-10-09 02:59:59+00'::timestamptz, 'game.now() honors game.fixed_now');

-- game.game_day(): the day changes exactly at 03:00 UTC.
select is(game.game_day(), '2026-10-08'::date, 'one second before 03:00 UTC it is still the previous day');
select is(
  game.game_day('2026-10-09 03:00:00+00'),
  '2026-10-09'::date,
  'at 03:00 UTC the new game day starts'
);
select is(
  game.game_day('2026-10-09 02:30:00-03'),
  '2026-10-09'::date,
  'local GMT−3 times map to their own calendar day'
);
select is(
  game.game_day('2026-12-31 23:00:00-03'),
  '2026-12-31'::date,
  'late evening in GMT−3 stays in the same day across the year end'
);
select is(
  game.game_day('2027-01-15 02:59:59+00'),
  '2027-01-14'::date,
  'no daylight saving: the cutoff is 03:00 UTC in summer too'
);

-- game.game_day_start(): the UTC instant each game day begins.
select is(
  game.game_day_start('2026-10-09'),
  '2026-10-09 03:00:00+00'::timestamptz,
  'a game day starts at 03:00 UTC'
);

-- public.get_game_clock(): what the web shows, computed by the server.
select is(
  (select game_day from public.get_game_clock()),
  '2026-10-08'::date,
  'get_game_clock reports the current game day'
);
select is(
  (select next_day_starts_at from public.get_game_clock()),
  '2026-10-09 03:00:00+00'::timestamptz,
  'get_game_clock reports when the next game day starts'
);
select ok(
  has_function_privilege('anon', 'public.get_game_clock()', 'EXECUTE'),
  'anyone can read the game clock'
);

select * from finish();
rollback;

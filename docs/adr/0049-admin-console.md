# 0049 · The admin console: staff apart from players, GOLD prices and their split, sanctions

Date: 2026-11-11 · Status: Accepted

## Context

The owner asked for three things:

- The admin panel must be separate from the game page, and an admin account must not be a player account.
- The work should go only into a complete administration and moderation panel. That includes setting what each
  GOLD payment costs and how it is split: how much goes to the game and how much to a country, as a percentage.
- Complete moderation tools.

Until now `/admin` was one more screen inside the game layout. Admins were citizens with a row in `game.admins`.
The GOLD prices were scattered through `game.balance_params`, with each split written into its function: most
were burned, two had a fixed treasury amount, and one had a fixed country share. Moderation could only dismiss a
report, hide reported content, or clear a reported citizen's picture and description.

## Decisions

1. **Staff accounts are never citizens.**
   - Triggers keep each table from taking a user the other has: `staff_is_citizen` and `staff_account`.
   - `game.staff_role` ignores an older admin row whose account is a citizen, so such a row grants nothing until
     the owner uses a team account. This removes access and never adds it.
   - `game.admins.role` is `admin` (the whole console) or `moderator` (reports, citizens, sanctions).
     `game.require_staff` covers both roles; `game.require_admin` covers admins only.
   - Admins add and remove staff by email with `admin_grant_staff` and `admin_revoke_staff`, both audited. The
     account must already exist in Supabase Auth, created by the owner, and must not be a citizen. Nobody changes
     their own role, so there is always at least one admin left.
   - The first admin is still added from the SQL editor (`docs/setup.md`, step 9).
2. **The console is apart from the game.**
   - `/admin/sign-in` is its own sign-in: email and password with Turnstile, no Google, no sign-up.
   - A layout route (`console`) has its own dark bar, as in the Admin canvas, and its own navigation:
     - for the whole staff: Resumen, Denuncias, Ciudadanos, Sanciones;
     - for admins only: Precios en oro, Parámetros, Economía, Mundo, Acceso, Registro.
   - The game no longer links to it. A staff account that reaches the game, or the citizen creation page, goes to
     the console. A player who opens the console reads that the account is not on the team.
3. **GOLD prices live in `game.gold_prices`, with their split.**
   - Each row has:
     - a price in hundredths;
     - a minimum (0.01 GOLD, or 0 for training sessions);
     - a beneficiary: the company's host, the market's country, the party's country, the payer's country, the
       country a resistance restores, or none when the state pays;
     - `country_share_bp`, the basis points that go to that country's treasury.
   - The rest leaves the game, and the country's share is rounded down.
   - `game.gold_legs` builds the postings, and every GOLD payment uses it: company levels, party founding,
     presidential ticket, party list, training sessions and centers, hospitals, war authorization, resistance and
     market license.
   - The prices moved out of `game.balance_params` with their values. The fixed treasury amounts became their
     percentage (50 % for the ticket, the list and the license).
   - `public.get_gold_prices` is public, so the game's screens show the price in force instead of a number
     written into their copy.
4. **Prices that a retry depends on are never free.**
   - Some payments recognize a retry by their ledger transaction: upgrades, foundings and licenses. `game.post`
     refuses an empty posting, so a free price would break that check. Those prices have a minimum of 0.01 GOLD.
   - Training sessions are recognized by their day and may be free.
5. **Every balance parameter is editable** with `admin_set_param`, which requires a reason (3 to 300 characters),
   is audited, and applies at once. The closed beta keeps its own switch. GOLD prices are edited only in their own
   table.
6. **Sanctions** (`game.sanctions`):
   - There are three kinds:
     - a warning, which only tells the player;
     - a mute, which refuses messages, articles, newspapers, and a new picture or description, enforced by
       triggers;
     - a suspension, which also mutes and makes PostgREST's pre-request hook refuse every write
       (`account_suspended`, HTTP 403).
   - Each one lasts some hours or is permanent. Moderators can set up to 30 days; anything longer or permanent,
     and lifting a permanent one, is for admins only.
   - The player is notified and sees a notice in the game.
   - Sanctions are kept for the record, including the lifted ones.
7. **Moderation tools.**
   - Searching citizens by name, email or citizen code, with wildcards taken literally.
   - A citizen's record: account, standing, money, belongings, sanctions, reports, articles, signals and notes.
   - Staff notes, which are append-only.
   - Hiding an article or a message directly; doing so closes its open reports.
   - Clearing a profile.
   - Renaming an offensive company, party, regiment or newspaper.
   - Renaming an offensive citizen name. A citizen's name stays immutable for players; moderation is the only
     exception, through a transaction-local setting in a `security definer` function, and the player is told.
   - Reports, hiding and showing again are now open to moderators, and closed reports can be listed by status.
8. **An overview** for the staff: players, the moderation queue, and GOLD created, burned and held.

## Consequences

- The owner needs a team account that does not play (`docs/setup.md`, step 9). The admin row of the owner's
  player account still exists in the development project and grants nothing.
- Admins can now grant access through the API, so this PR is left to the owner to merge (CLAUDE.md).
- Changing a price affects the next payment only; holds already taken (war authorizations) keep their amount.
- Parameter descriptions come from the database and are in English. The console shows the key and that text.
- Rewards in the game's copy (resistance reward, missions) are still written as numbers and come from balance
  parameters. Only the GOLD prices read their configured value.

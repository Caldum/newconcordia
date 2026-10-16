# Admin console (owner's request)

**Acceptance:**

- The admin panel is apart from the game, and an admin account is not a player account.
- GOLD prices and their split (game and country, as a percentage) can be set.
- The moderation tools are complete.

## Design (ADR 0049)

- Migration `20261111090000_admin_console.sql`:
  - **Staff:** `game.admins.role`, `game.staff_role`, `game.require_staff`, the triggers that keep staff and
    citizens apart, and `get_my_staff`, `admin_list_team`, `admin_grant_staff` and `admin_revoke_staff`.
  - **GOLD prices:**
    - `game.gold_prices` (moved out of `game.balance_params`), `game.gold_price` and `game.gold_legs`;
    - `get_gold_prices`, `admin_list_gold_prices` and `admin_set_gold_price`;
    - every GOLD payment redefined to use them.
  - **Parameters:** `admin_list_params` and `admin_set_param`.
  - **Sanctions:**
    - `game.sanctions`, `game.sanction_active`, the mute triggers and the suspension in `check_request`;
    - `admin_sanction`, `admin_revoke_sanction`, `admin_list_sanctions` and `get_my_sanctions`.
  - **Moderation:**
    - `game.staff_notes`, `admin_search_citizens`, `admin_get_citizen`, `admin_add_note`, `admin_hide_content`,
      `admin_clear_profile`, `admin_rename_citizen` (the name trigger allows moderation) and `admin_rename`;
    - reports for moderators, with closed ones by status.
  - **Overview:** `admin_overview`.
- Web:
  - **Console:** `features/admin`, with the `console` layout (`StaffOnly`, `AdminShell` and the navigation by role)
    and `/admin/sign-in`.
  - **Pages:** overview, reports, citizens and a citizen's record, sanctions, GOLD prices, parameters, economy,
    world, access and log.
  - **Game:** `features/prices` (the prices in force for the game's copy), the sanction notice, and staff accounts
    sent from the game to the console. The game no longer links to `/admin`.

## Tests

- **pgTAP:**
  - `430_admin_console.test.sql` (76): staff apart from citizens, roles, granting and revoking, prices and their
    split on a real payment, parameters, sanctions and their enforcement, search, the record, renames, hiding,
    the overview.
  - Eight earlier suites now make their admin a staff account without a citizen.
- **Vitest:**
  - the console (sign-in, guard, roles, overview, GOLD prices with the split, parameters, search, record and
    sanction, world, log, team);
  - the price and split helpers;
  - the game's copy reading the prices.

# 0032 · War authorization and enemy designation

Date: 2026-10-24 · Status: Accepted

## Context

Specification v3.1 sections 6 and 12.5: regular war needs a prior authorization law that reserves 50 GOLD of the
Treasury when presented; only the president starts offensives, within 24 hours; if the deadline passes the
authorization expires and the 50 GOLD return; the assumption keeps them in a refundable escrow and burns them only
when the president launches. State machine `PROPOSED → APPROVED_PENDING_ATTACK → STARTED/EXPIRED`. An enemy
country designated by law (at most one per country) lets the president launch at once without a new law or fee
and gives +50 % XP; a new law ends it.

## Decisions

1. **Bills.** `war_authorization {country_code}` locks `war_authorization_gold` (50 GOLD) like any spending bill.
   Its execution does not capture the hold: it creates a `pending` authorization that owns it for
   `war_launch_hours` (24). Rejection or failure releases it as usual.
2. **One use.** `game.consume_war_authorization` (used by the launch in W2) takes the oldest pending authorization
   against the target and burns its GOLD; the row lock and the hold make the burn happen once. Expiry (hourly job)
   and the president's cancellation release it once.
3. **Enemy.** `enemy_designation {country_code}` replaces the active designation; `{}` ends it. The partial unique
   index keeps one active per country.
4. **Plumbing.** Foreign-policy kinds go through `game.foreign_bill_terms` and `game.execute_foreign_bill`, so
   diplomacy (W5) extends them without rewriting the bill core again. The hourly job calls `game.hourly_world`.
5. **Care.** The `non_enemies` hospital policy now refuses citizens of the designated enemy.

## Consequences

- Laws gets the two kinds. The launch, the authorizations list and cancellation appear with battles (W2).
- Rollback: header of `20261024090000_war_authorization.sql`.

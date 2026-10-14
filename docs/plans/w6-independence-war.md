# W6 · Independence war (sandbox)

**Acceptance (roadmap W6):** independence war at the start (sandbox until PD-02 is defined).

## Design (ADR 0036)

- Migration `20261028090000_independence_war.sql`: `game.independence_wars`, `game.independence_attacks`,
  `game.titles`; `game.close_independence_war`; the hourly job closes expired wars; public
  `admin_start_independence_war`, `independence_attack`, `get_independence_war`, `independence_ranking`,
  `list_my_titles`.
- Web: the independence panel on `/battles` and the admin section.

## Tests

- pgTAP `310_independence_war.test.sql` (18): off by default, admins only and audited, one war at a time,
  nationals only, idempotent attacks, the target ends it early, the hero and the permanent title, closed wars
  refuse attacks, expiry after 7 days by the hourly job, the ledger.

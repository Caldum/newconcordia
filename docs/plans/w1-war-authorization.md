# W1 · War authorization and enemy designation

**Acceptance (roadmap W1):** war authorization law with 50 GOLD escrow, launch by the president within 24 hours,
refund on expiry, enemy country designation.

## Design (ADR 0032)

- Migration `20261024090000_war_authorization.sql`: `game.war_authorizations`, `game.enemy_designations`;
  `game.foreign_bill_terms`, `game.execute_foreign_bill`, `game.enemy_of`, `game.expire_war_authorizations`,
  `game.consume_war_authorization`, `game.hourly_world`; the bill core and the hourly job delegate to them; public
  `cancel_war_authorization`, `list_war_authorizations`, `get_enemy`.
- Web: Laws gets the war authorization and enemy designation kinds.

## Tests

- pgTAP `270_war_authorization.test.sql` (25): targets, the escrow on presentation, pending after approval,
  refund on expiry exactly once, burn on launch exactly once, no second use, cancellation by the president only
  and once, enemy designation replaced and ended by law, the non-enemies care policy, the ledger.
- Vitest: the terms of the new kinds.

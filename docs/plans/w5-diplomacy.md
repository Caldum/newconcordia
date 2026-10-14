# W5 · Diplomacy, travel and presence

**Acceptance (roadmap W5):** alliances, relations, embargoes (economic and arms), peace; regional eligibility,
travel and presence (prices pending).

## Design (ADR 0035)

- Migration `20261027090000_diplomacy.sql`: `game.alliance_approvals`, `game.alliances`,
  `game.broken_relations`, `game.embargoes`; `game.relations_broken`, `game.trade_blocked` and the embargo
  triggers; `game.allied`, `game.care_allowed`, `game.foreign_bill_terms` and `game.execute_foreign_bill`
  extended; public `travel`, `get_travel_terms`, `list_foreign_relations`.
- Web: the new kinds in Laws, foreign relations in Government, travel in Battles.

## Tests

- pgTAP `300_diplomacy.test.sql` (28): an alliance needs both laws, allies fight remotely and get «allies» care,
  broken relations end it and block a new one, peace ends the enemy, cancels and refunds authorizations and
  restores relations, economic and arms embargoes on offers and trades and their lifting, travel off, on and at
  zero health, the ledger.
- Vitest: the terms of the new kinds; foreign relations on the government page; travel off on the battles page.

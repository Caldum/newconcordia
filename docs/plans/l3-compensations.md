# L3 · Backups, restore drill, compensating entries

**Acceptance (roadmap L3):** backups, restore drill, compensating ledger entries for incidents.

## Design (ADR 0039)

- Migration `20261031090000_compensations.sql`: `game.ledger_compensations`; `game.record_supply_change` records
  reversals; public `admin_transaction_legs`, `admin_compensate`, `admin_list_compensations`.
- Runbook: backups and the monthly restore drill, money incidents, the rate-limit hook, the current crons. Setup:
  PITR as an owner step.
- Web: the compensation section of the admin page.

## Tests

- pgTAP `340_compensations.test.sql` (14): admins only, the legs preview, reason required, unknown transactions,
  holds refused, a transfer and a mistaken reward reversed once, balances back, a reversed mint recorded as a
  burn, supply records matching issuer and sink, audit, every currency balancing.

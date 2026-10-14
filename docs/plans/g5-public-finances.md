# G5 · Treasury and ministry accounts, allocations, issuance and public audit

**Acceptance (roadmap G5):** Treasury and ministry accounts, allocations by law, public audit of institutional
money; currency issuance by law.

## Design (ADR 0028)

- Migration `20261020090000_public_finances.sql`: account kinds `ministry` and `central_bank`;
  `game.ministry_account`, `game.central_bank_account`, `game.holder_for_ministry`; bill kinds
  `ministry_allocation` and `currency_issuance` with `game.bill_spending` (locks per currency);
  `game.settle_trade`; `game.require_minister`; public `ministry_pay`, `ministry_buy`, `get_public_finances`,
  `list_public_movements`, `get_ministry_stock`.
- Web: Laws gets the two kinds; `/finances` (Politics → Finances).

## Tests

- pgTAP `230_public_finances.test.sql` (43): allocation and issuance validation, one reservation per currency,
  free and held balances, execution into Health and the Treasury, issuance as a mint by law, payment rules and
  idempotency, one ministry cannot spend another's money, purchases within competences and once per key, stock
  privacy, a vacant ministry keeps its funds and cannot spend, the public audit, the ledger, privileges.
- Vitest: allocation, issuance and draft terms; ministry competences; movement labels; the finances page
  (public view, a minister's payment and stock).

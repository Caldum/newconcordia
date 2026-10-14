# G6 · Central Bank and foreign exchange

**Acceptance (roadmap G6):** FX order books against GOLD, transfers to its Treasury, single-use authorizations to
companies.

## Design (ADR 0029)

- Migration `20261021090000_central_bank_fx.sql`: bill kind `central_bank_allocation`; `game.fx_offers`,
  `game.fx_trades`, `game.cb_authorizations`; `game.require_governor`, `game.fx_owner_account`,
  `game.lock_fx_book`; public `fx_post_offer`, `fx_take`, `fx_cancel`, `fx_book`, `fx_summary`,
  `list_my_fx_offers`, `central_bank_to_treasury`, `authorize_cb_transfer`, `cancel_cb_authorization`,
  `execute_cb_transfer`, `list_cb_authorizations`.
- Web: `/market/fx` (Market → Exchange) with the governor's switch; Finances gets the Central Bank panel and the
  authorizations; Laws gets the new bill kind.

## Tests

- pgTAP `240_central_bank_fx.test.sql` (52): funds by law, transfers to the Treasury and who may make them, offer
  validation and locks, idempotent posting and taking, own offers, partial takes and balances, the Central Bank's
  buy offer with rounding and the returned hundredth, cancellation, summary and book, authorizations (who
  authorizes, company in the country, single use, withdrawal), paralysis without a governor, the ledger,
  privileges.
- Vitest: FX rounding and locks; the exchange page (taking an offer, the governor's offer with the bank's funds).

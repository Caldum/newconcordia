# R6 · Market orders

**Acceptance (roadmap R6):** the locked money is exact after partial fills; taxes are deducted on execution.

## Design (ADR 0021)

- `market_offers.status`; `game.market_buy_orders` with a hold each; `market_trades.buy_order_id` and
  `export_tax`; `country_policies.export_tax`; `game.market_access_licenses` behind
  `market_foreign_license_required` (off).
- `game.execute_trade` settles every trade at the offer's price, directly or from a hold (refunding what was
  locked above it); `game.match_buy_order` and `game.match_offer` apply price-time priority under
  `game.lock_book`.
- Public: `post_buy_order`, `cancel_buy_order`, `list_buy_orders`, `list_my_buy_orders`; `post_offer` and
  `buy` match and settle through the same path; `market_summary` adds the best bid, the bids and the export
  tax; `list_my_offers` adds the status.
- Web: a «Buy orders» market tab with the form (the held amount shown before posting), the public book of
  the chosen good and the player's orders with cancelling.

## Tests

- pgTAP `170_market_orders.test.sql` (40): locking, idempotency, a partial fill at the offer's price with the
  exact escrow left, a fill that closes the hold, cheapest-first and highest-first then oldest, no self
  trades, cancellation (exact refund, twice, someone else's), insufficient funds, the export tax and tariff
  on an import, tariff against the limit, the escrow invariant, licenses on and off.
- Vitest: `units.ts`; the Orders page (book, own orders, posting, refusal, validation, cancelling).

## Amendment (ADR 0022)

- Migration `20261014110000_market_licenses.sql`: buy orders removed; `buy_market_license`,
  `list_my_market_licenses`, `get_market_license_terms`; licenses required at 10 GOLD (5 to the country, 5
  burned).
- pgTAP `170` rewritten for the final state (23); `100` gives its foreign seller a license.
- Web: Licenses tab; market choice on Buy and Sell; the export tax line on sales abroad; `markets.ts`.

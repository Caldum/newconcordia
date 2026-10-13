# 0021 · Market orders, matching and the export tax

Date: 2026-10-14 · Status: Accepted

## Context

Specification v3.1 sections 5, 8 and 12.5 ask for sell and buy orders with partial execution and the rest
visible, public buy orders that lock the full amount until executed or cancelled, price-time priority
(marked as an assumption), the state machine `OPEN → PARTIAL → FILLED/CANCELLED/EXPIRED` with the reservation
following the remaining quantity, a uniform national export tax of 0–100 % on sales outside the production
country deducted on execution, and access licenses to foreign markets whose price is `PENDING` (PD-03). D11
already had sell offers holding their goods, direct purchases with VAT, tariff and fee, and R2 escrow holds.

## Decisions

1. **Sell orders are D11's offers** (`game.market_offers`) with a `status`. Their goods leave the seller's lot
   when posted and come back on withdrawal (`cancelled`).
2. **A buy order's limit is everything the buyer pays per unit**, VAT and, on imports, tariff included. The
   order locks `limit × quantity` in its own escrow (`game.hold`) before it exists; without the money nothing
   is published (`insufficient_funds`).
3. **Every trade executes at the offer's price.** A buy order that meets a cheaper offer pays the offer's
   price and gets the difference back at once, so its escrow always holds exactly `remaining × limit`. The
   seller never gets less than they asked and the buyer never pays more than their limit; one price formula
   serves direct purchases and orders alike.
4. **Price-time priority.** A new buy order takes the offers cheapest for the buyer first (price plus the
   tariff on imports), then the oldest. A new offer goes to the highest buy orders first, then the oldest.
   Nobody trades with themselves; those pairs are skipped. Everything that changes one book (a good in a
   market) runs under one advisory lock, so a new order always sees the other side as it is.
5. **The export tax** is set by the production country (`country_policies.export_tax`, 0–100 %, default 0)
   and applies when an offer's origin differs from its market, whoever the seller is. Its base is what the
   seller would keep (gross minus VAT and fee), so the seller's net is never negative; it is paid in the
   market's currency to the production country's treasury. Governments set it from Stage 2, where changes
   get their log.
6. **Foreign market licenses** exist (`game.market_access_licenses`) but are only required when
   `market_foreign_license_required` is 1; it ships as 0 because their price is `PENDING`.
7. **Expiry** is a valid status, but no order expires yet: the specification gives no duration.
8. The open offers limit (`market_max_open_offers`) counts offers and buy orders together.

## Consequences

- The Health ministry's public buy orders (Stage 4) reuse these orders with the ministry's account.
- A change of tariff after posting does not break a buy order: its limit already includes what it pays.
- Rollback: header of `20261014100000_market_orders.sql`.

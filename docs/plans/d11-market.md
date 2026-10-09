# D11 · Market

**Acceptance test (GDD):** in a purchase, the money that leaves the buyer is exactly what the seller and the
treasury receive, plus the fee that leaves the game.

## Design

- **Inventories:** players hold goods (`game.inventories`); companies already hold stock. Raw quantities can
  be fractional; offers and purchases are whole units.
- **Offers:** one market per country, priced in its Credit with VAT included (Market canvas). Posting moves
  the units out of the player's inventory or the company's depot into the offer, so nothing is sold twice;
  withdrawing returns what is left. At most `market_max_open_offers` (20) open offers per player.
- **Buying:** the buyer pays price × quantity, plus the country's tariff when the seller's country differs
  from the market's (imports). From the gross, the VAT goes to the market country's treasury and the 1 %
  fee to the sink; the seller gets the rest. All in one transaction. Goods go to the buyer's inventory or
  to one of their companies' depot.
- **Prices:** each trade is recorded; the market shows the best price and the 24-hour average per good.
- **Screens:** Market in the bar. `/market` (Market canvas): goods, offers sorted by price with origin, the
  purchase with its total and destination. `/market/sell` (Sell canvas): what to sell and from where,
  quantity and price, what the seller receives after VAT and fee, and the active offers.

## Tests

- pgTAP (`100_market.test.sql`): acceptance, imports with tariff, escrow and withdrawal, partial purchases,
  buying into a company, overdrafts and quantities above the offer, own offers, the open-offer limit, the
  24-hour average, permissions.
- Vitest: the market and sell pages, their totals and errors, in both languages.
- Playwright: a seller posts rations and a buyer buys them; both balances add up.

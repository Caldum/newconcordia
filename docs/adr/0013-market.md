# 0013 · Market: country markets, escrow and who pays each tax

Date: 2026-10-09 · Status: Accepted

## Context

D11 asks for offers, purchases, VAT, tariff and a 1 % fee. The Market canvas shows prices «con IVA 5 %
incluido» and says imports «pagan además 10 % de arancel»; the Sell canvas deducts the VAT and the fee from
what the seller receives. The GDD charges the tariff on «sales by foreign companies» and lists the fee among
the Credit that leaves the game.

## Decisions

1. **One market per country, in its Credit.** Anyone may post in any country's market; an offer from a
   seller or company of another country is an import.
2. **Prices include VAT.** From the gross, the VAT goes to the market country's treasury and the 1 % fee to
   the sink; the seller receives the rest (Sell canvas).
3. **The buyer pays the tariff on top** of the price for imports (Market canvas), to the same treasury.
4. **Posting holds the units.** They leave the inventory or depot when the offer is posted and come back if
   it is withdrawn, so nothing is sold twice and stock never goes negative.
5. **Purchases go to the inventory or to an own company's depot**, so a factory can buy its inputs.
6. **Players hold inventories**, created here because buying needs them; D12 adds using what they hold.
7. **At most 20 open offers per player**, a brake against flooding the market.

## Consequences

- In every purchase, buyer's payment = seller + treasury + fee, by construction (acceptance test).
- The Gold exchange tab of the Market canvas belongs to D24.

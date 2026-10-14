# 0022 · Market licenses at 10 GOLD, and no buy orders

Date: 2026-10-14 · Status: Accepted (owner's decision) · Supersedes parts of 0021

## Context

After R6 shipped buy orders (ADR 0021), the owner decided on 2026-10-14: "Las licencias valen 10 Oro (5 para
el país al que se le compra y 5 para el juego). Eliminemos las órdenes de compra." This settles PD-03 for market
licenses and overrides the specification's public buy orders (sections 5, 7 and 8.8); the Health ministry
buys kits by direct purchase.

## Decisions

1. **Buy orders are removed** (migration `20261014110000`): open ones are cancelled and their holds released,
   then their functions, matching and table are dropped. Holds stay for bills and war authorizations.
2. **Markets trade by direct purchase only.** Offers keep their states (`open`, `partial`, `filled`,
   `cancelled`), the tariff, the fee and the export tax of ADR 0021.
3. **A foreign market license costs 10 GOLD**: 5 to the GOLD treasury of the country whose market it opens, 5
   burned (recorded in `supply_changes`). Both values live in `balance_params` (`market_license_price`,
   `market_license_country_share`).
4. **Licenses are required** (`market_foreign_license_required` = 1) to sell or buy in another country's
   market. Nobody needs one for their own market (`license_not_needed`).
5. **A license is permanent**: the owner gave no duration. One per player and market; buying again returns it
   without charging.

## Consequences

- The web market has Buy, Sell and Licenses tabs; buying and selling choose among the own market and the
  licensed ones, and a sale abroad shows the export tax.
- Buying in a foreign market needs its currency, which arrives with FX in a later stage.
- Rollback: header of `20261014110000_market_licenses.sql`.

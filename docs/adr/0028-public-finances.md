# 0028 · Treasury, ministries and the public audit

Date: 2026-10-20 · Status: Accepted

## Context

Specification v3.1 sections 3 and 4: national currency is issued only by law; Treasury funds are assigned by law
to each ministry (GOLD and national currency) into its own institutional account; each minister spends freely
within their competences and cannot move funds between ministries; funds and inventories stay with the
institution when a minister leaves; a vacancy blocks the ministry; every ministerial operation publishes amount,
currency, destination, who ordered it and when; the detailed medical-kit inventory is visible only to the Health
minister and the president. The Stage 2 demo: Congress approves a budget, the funds go to Health, the minister
buys kits with a public order.

## Decisions

1. **Accounts.** New ledger account kinds `ministry` (country and ministry) and `central_bank` (country; used from
   G6). Like every account, they never go negative.
2. **Bills.** `ministry_allocation` moves GOLD and national currency (either or both) from the Treasury to one
   ministry; each currency is locked by its own hold when presented. `currency_issuance` mints national currency
   into the Treasury (mint reason `currency_issuance`, authority «law»); it locks nothing.
3. **Spending.** A minister pays from their ministry to a national (by name) with a public concept
   (`ministry_pay`), or buys goods of their competence on the national market into the ministry's inventory
   (`ministry_buy`): Health medical kits and medical raw material; Defense weapons, food and their raw materials;
   Development raw materials. Economy and Foreign Affairs have no purchases yet (their competences arrive with the
   Central Bank and diplomacy). The database also accepts payments to companies located in the country; the
   screen pays nationals.
4. **Market settlement** is shared: `game.settle_trade` takes any paying account and receiving holder;
   `market_trades.buyer_ministry` marks state purchases.
5. **Audit.** `list_public_movements` lists every posting of the Treasury, ministries and Central Bank with
   counterparty, concept and the citizen who ordered it; `get_public_finances` shows free and reserved balances.
   Both are open to visitors.
6. **Privacy.** A ministry's inventory is readable only by its minister and the president
   (`get_ministry_stock`). Purchases show as money movements (amount and seller), not as stock per hospital.

## Consequences

- Politics gets a Finances tab: funds, movements, the minister's payments and purchases, the stock.
- Hospitals (H3) will receive kits from Health's inventory.
- Rollback: header of `20261020090000_public_finances.sql`.

# D09 · Ledger and currencies

**Acceptance test (GDD):** after 1,000 random transfers, the total money does not change and no balance is
negative.

## Design

- **Currencies:** `GOLD`, shared by the world, and one Credit per country, coded with the country code
  (`ARG`). Amounts are `bigint` hundredths everywhere.
- **Accounts:** one per owner and currency, created on first use. Owners are citizens, national treasuries
  and, per currency, the issuer (where money is created; its balance is the negative of everything issued)
  and the sink (where money leaves the game). Only issuers may go below zero (check constraint).
- **Postings:** every movement is one row that debits one account and credits another of the same currency
  for the same positive amount, so an unbalanced entry cannot be written. A transaction groups the postings
  of one action and carries its idempotency key. Postings are append-only and keep both balances after.
  `game.post(kind, key, actor, legs)` is the only writer: it locks the accounts in id order, refuses
  overdrafts with `insufficient_funds` and returns the existing transaction when the key repeats.
- **Welcome grant:** 5 Gold and 50 Credit of the citizen's country, from the issuers, once per account,
  when the email is confirmed (or at once for Google). Values in `game.balance_params`.
- **API:** `get_my_balances`, `list_my_movements` (keyset pages, filter by currency, the counterparty of
  each posting) and `transfer_money` to another citizen by name, with an idempotency key and a limit of
  transfers per hour.
- **Screens:** Gold and Credit in the game bar (NavBar canvas); `/account` (Inventory canvas, account part):
  balances, transfer form, movements with a currency filter. Items, banks and the economy tabs wait for
  D10–D12 and D23.

## Tests

- pgTAP (`080_ledger.test.sql`): acceptance (1,000 random transfers keep the totals and no negatives), the
  sum of every currency is zero, welcome grant once and only after confirmation, overdrafts, idempotency,
  rate limit, transfers to unknown, unconfirmed or the same player, append-only postings, visitors locked out.
- Vitest: money formatting, the bar's balances, the account page (balances, movements, filter, transfer
  form and its errors) in both languages.
- Playwright: a player sends Credit to another and both see the movement, with axe.

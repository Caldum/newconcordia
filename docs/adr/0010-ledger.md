# 0010 · Ledger: currencies, accounts, postings and the welcome grant

Date: 2026-10-09 · Status: Accepted

## Context

D09 asks for a double-entry ledger, Gold and one local currency per country, and transfers as database
functions. The brief fixes amounts in `bigint` hundredths with constraints against negative balances and
unbalanced entries. The GDD says a new citizen receives 5 Gold and 50 Credit, that only the game creates
Gold and only the issuance law creates Credit, and that some money leaves the game (sinks).

## Decisions

1. **One row per posting.** A posting debits one account and credits another of the same currency for the
   same positive amount. Balance is guaranteed by the shape of the row, not by a deferred check over many
   rows; the counterparty of every movement is explicit, which is what the Inventory canvas shows. A
   transaction groups the postings of one action (a wage and its tax are two postings of one transaction).
2. **Created and destroyed money are accounts too.** Each currency has an issuer, whose balance is the
   negative of all the money issued, and a sink for the money that leaves the game. The sum of all
   balances of a currency is always zero, so «money created» and «money in circulation» can be read from
   the ledger at any time.
3. **Balances live on the account** and change only inside `game.post`, which locks the accounts in id
   order (no deadlocks between opposite transfers) and keeps both balances after each posting for the
   statement. A check constraint forbids negative balances except for issuers.
4. **Currency codes:** `GOLD` and the country code for each Credit (`ARG` is the Credit of Argentina), as
   the GDD names them («Credit, with the country code»). Every country gets its Credit now; it only moves
   when the country is in play.
5. **The welcome grant is the second source of Credit** besides the issuance law: 5 Gold and 50 Credit
   from the issuers, once per account (idempotency key `welcome:<user>`), when the email is confirmed.
   Granting at sign-up would pay unconfirmed reservations, which can be replaced.
6. **Citizen accounts reference the citizen and cannot be deleted** (`on delete restrict`). Only
   unconfirmed reservations are ever deleted, and they hold no money. Account deletion, when it exists,
   will close accounts by moving their balance, never by removing history.
7. **Transfers between players are limited** to `transfer_max_per_hour` (20) per sender. It is a brake on
   scripted abuse, not fair play (D28).

## Consequences

- D10 (wages, taxes), D11 (market), D13 (missions) and later modules only call `game.post` with their legs.
- Statements never need recomputation: each posting carries the balance after it on both sides.
- Moving to another country keeps every account; the Credit of the old country stays in the wallet.

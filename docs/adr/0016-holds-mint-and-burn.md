# 0016 · Holds, mint and burn records, and the sign-up grant

Date: 2026-10-13 · Status: Accepted

## Context

Specification v3.1 locks money before it is committed: buy orders lock their full amount (invariant 8),
bills reserve their budget when presented, and a war authorization keeps 50 GOLD in refundable escrow until
the president launches. It also says money is created only by law or an explicit system reward, and raises
the sign-up grant to 5 GOLD, 100 national currency and 10 Q1 food. D09's ledger had no locks, any code could
pay from an issuer, and the grant was 5 Gold and 50 Credit.

## Decisions

1. **A hold is an escrow account of its own.** `game.hold` moves the money from the owner's account into a
   new `escrow` account, so the existing non-negative balance check makes it unspendable, and every hold
   shows up in the double-entry ledger. `game.ledger_holds` keeps the purpose, a free reference (an order,
   a bill), the amount, captured and released totals and the state.
2. **Capture and release.** `game.capture_hold` pays from the escrow to any accounts (a seller, a treasury,
   the sink to burn); `game.release_hold` returns money to the owner. Both allow partial amounts, never
   beyond what is held, lock the hold row and recheck the idempotency key after the lock. An empty hold
   closes and accepts nothing more, so `amount = captured + released` once closed.
3. **Minting needs a listed reason.** A trigger on postings refuses any posting from an issuer whose kind is
   not in `game.mint_reasons` (`mint_not_authorized`). Today: `welcome_grant` and `level_reward` (system
   rewards); currency issuance by law adds its reason in Stage 2. Tests that need money add a `test` reason
   inside their own transaction.
4. **Mint and burn are recorded.** The same trigger writes every issuer debit (mint) and sink credit (burn)
   to the append-only `game.supply_changes`, backfilled for earlier postings. Minted minus burned is the
   money in circulation per currency.
5. **Sign-up grant:** 5 GOLD, 100 of the country's currency and 10 rations, once per account. Rations give
   10 energy, exactly what spec section 1 gives Q1 food, so they stand in for Q1 food until R3 introduces food
   lots by quality and converts them. Accounts already paid are not topped up (paid once).
6. **The player sees held money** under each balance (`get_my_balances.held`), and the statement names
   escrows and companies. Before this, a statement containing a company counterparty (wages, company
   funding since D10) failed to load.

## Consequences

- R6 buy orders, Stage 2 bills and Stage 4 war authorizations build on `game.hold` with their own purpose.
- Money supply can be audited per currency from `game.supply_changes`.
- Rollback: header of `20261013100000_holds_and_grant.sql`.

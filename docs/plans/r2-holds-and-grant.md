# R2 · Holds, mint and burn records, and the new sign-up grant

**Acceptance (roadmap R2, spec invariants 1, 8 and 10):** locked money cannot be spent elsewhere; the sign-up
grant is paid once.

## Design (ADR 0016)

- **Holds (escrow).** A hold moves money from its owner's account into an escrow account of its own (account
  kind `escrow`), so the normal balance check makes held money unspendable. `game.ledger_holds` records the
  owner, purpose, reference, original amount, captured and released totals and the state (`open`, `closed`).
  - `game.hold(owner_account, amount, purpose, reference, key, actor) → hold id`, idempotent per key.
  - `game.capture_hold(hold, legs, key, actor)`: pays from the escrow to the leg credit accounts (a seller,
    a treasury, the sink to burn); partial captures allowed; never more than what is held.
  - `game.release_hold(hold, amount default all, key, actor)`: returns money to the owner.
  - The hold closes when its escrow reaches zero; a closed hold accepts nothing. The hold row is locked
    first, so two captures never overspend it.
- **Mint and burn records.** Every posting that debits an issuer (mint) or credits a sink (burn) is recorded
  in `game.supply_changes` by a trigger on postings, backfilled for existing postings.
- **Mint authorization.** Issuers only pay for kinds listed in `game.mint_reasons` (`welcome_grant`,
  `level_reward`; laws add theirs in Stage 2). Anything else fails with `mint_not_authorized`.
- **Sign-up grant:** 5 GOLD, 100 of the country's currency and 10 rations (the Q1 food until R3 introduces
  food lots), once per account, keyed `welcome:<user>`. Citizens already paid are not topped up.
- **API:** `get_my_balances` adds `held`; `list_my_movements` names company counterparties and escrows (fixes
  the statement for players who worked or funded a company since D10).
- **Web:** the account shows held money under each balance and labels holds, releases and level rewards.

## Tests

- pgTAP `130_holds_and_grant.test.sql`: hold, capture, release, partial capture, closing, over-capture,
  idempotency, held money unspendable, mint authorization, supply records, the grant with food once.
- Vitest: held money on the account, the new movement kinds and counterparties.

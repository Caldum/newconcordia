# 0029 · Central Bank and foreign exchange

Date: 2026-10-21 · Status: Accepted

## Context

Specification v3.1 section 4: foreign exchange goes through pairs against GOLD (ARS → GOLD → BRL) with a free
price from offers and bids; the initial reference of about 1 GOLD = 100 national units is not a parity. The
Central Bank holds institutional assets with an immutable ledger, may trade GOLD and any national currency it
holds, may send what it holds to its Treasury with no minimum, and pays companies located in the country only
with an individual single-use authorization of the Economy minister (amount, currency, receiver). Without a
governor it is paralyzed. The owner removed buy orders from the goods market (ADR 0022).

## Decisions

1. **Offers on both sides, taken by hand.** Each pair `<currency>/GOLD` has offers to sell GOLD and offers to buy
   GOLD; nothing matches automatically. Anyone takes part or all of an offer at its price, as in the goods market.
   Both sides lock their funds when posted (ledger holds), so a taken offer always settles.
2. **Units.** Amounts are GOLD hundredths; the price is currency hundredths per 1 GOLD. The currency side of each
   take is `floor(gold × price / 100)`; a buy-GOLD offer locks `ceil(gold × price / 100)` and returns what
   rounding leaves when it fills or is withdrawn. No FX fee (the specification names none).
3. **Who trades.** Citizens with their own accounts, and the Central Bank through its governor
   (`p_central_bank`). At most 10 open offers per owner (`fx_max_open_offers`).
4. **Funds by law.** Bill kind `central_bank_allocation` moves GOLD and national currency from the Treasury to the
   Central Bank, locked when presented like any budget.
5. **Transfers.** The governor sends any currency the bank holds to its Treasury. Authorizations name the company
   (located in the country), the amount and the currency; the governor executes each once; the minister can
   withdraw an unused one. All are public.
6. **Paralysis.** Every Central Bank action requires holding the governor's office.

## Consequences

- Market gets an Exchange tab; Finances shows the governor's desk and the authorizations.
- Stage 2 is complete: Congress approves a budget, funds reach Health, the minister buys kits publicly.
- Rollback: header of `20261021090000_central_bank_fx.sql`.

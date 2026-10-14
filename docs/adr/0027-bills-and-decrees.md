# 0027 · Bills, budget escrow and decrees

Date: 2026-10-19 · Status: Accepted

## Context

Specification v3.1 sections 2, 3 and 12.5: bills per term (member of Congress 3, minister 1, president unlimited,
vice president none), never withdrawn; 24-hour votes; quorum is an absolute majority of the occupied seats,
abstentions count for quorum only; ordinary, economic and issuance laws pass by an absolute majority of valid
votes (yes and no), expropriation by 2/3; every bill that spends locks its funds when presented (escrow per
currency and origin); approval executes atomically, a failed execution reverts every effect, releases the
funds and keeps an approved-but-not-executed record. The vice president presides over Congress and votes only
to break ties. The president issues administrative decrees within the legal framework and cannot spend without
authorization.

## Decisions

1. **States.** `voting → rejected | executed | not_executed`. The specification's DRAFT is the form on the web;
   PRESENTED and VOTING coincide (voting opens on presentation); APPROVED is the instant before execution.
2. **Kinds in G4:** `ordinary` (text only), `taxes` (VAT, tariff, work tax, export tax within their legal ranges,
   minimum wage) and `gold_transfer` (GOLD from the Treasury to another country's Treasury). G5 adds allocations
   to ministries and currency issuance; expropriation arrives with state companies. All G4 kinds need a simple
   majority.
3. **Counting** with integers: quorum `2 × (yes + no + abstain) > seats occupied at presentation`; simple
   majority `yes > no`, a tie (`yes = no > 0`) goes to the vice president's tie-break; two thirds
   `3 × yes ≥ 2 × (yes + no)`. Nothing passes without a valid vote.
4. **Tie-break.** The vice president casts it while voting is open, once; it counts only if the count ends tied.
   The same applies to resignation motions (except their own). Removal and impeachment count over all members,
   so they cannot tie.
5. **Initiative** counts against the current mandate (`game.mandates`): a new appointment is a new term.
6. **Escrow.** A spending bill locks its funds with a ledger hold when presented; insufficient free funds refuse
   the bill. Execution runs in a subtransaction: on failure it rolls back, the hold is released and the failure
   code kept (`failure`).
7. **Decrees** are published text signed by the president: they move no money and change no rule.
8. Bills close in the hourly `elections` job (and lazily on a late vote).

## Consequences

- Politics gets a Laws tab: bills with terms and public counts, voting, the vice president's tie-break,
  presenting bills, decrees.
- Rollback: header of `20261019090000_bills.sql`.

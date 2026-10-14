# G4 · Bills and decrees

**Acceptance (roadmap G4):** initiative limits, 24-hour votes, quorum, majorities, budget escrow, atomic execution
or approved-not-executed; decrees.

## Design (ADR 0027)

- Migration `20261019090000_bills.sql`: `game.bills`, `game.bill_reservations`, `game.bill_votes`,
  `game.decrees`, `congress_motions.tiebreak`; `game.bill_terms`, `game.initiative`, `game.execute_bill`,
  `game.release_bill`, `game.close_bill`; `game.close_motion` with the tie-break; the hourly job closes bills.
- Public: `propose_bill`, `vote_bill`, `break_tie`, `break_motion_tie`, `issue_decree`, `list_bills`,
  `list_bill_votes`, `get_my_initiative`, `list_decrees`.
- Web: `/laws` (Politics → Laws).

## Tests

- pgTAP `220_bills.test.sql` (60): initiative per office and per term, title, kind and terms validation, escrow
  on presentation and refusal beyond free funds, idempotent presentation, who votes, tie-break rules, quorum,
  majority, tie with and without tie-break, executed taxes and transfer, approved-but-not-executed with the funds
  back, no open reservation left, public count and roll call, the resignation tie-break, decrees, the ledger,
  privileges.
- Vitest: `billTerms` (percentages, ceilings, transfer), the laws page (voting, presenting a tax bill, the
  vice president's tie-break).

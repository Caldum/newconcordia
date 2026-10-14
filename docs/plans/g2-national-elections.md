# G2 · National elections

**Acceptance (roadmap G2):** electoral calendar in UTC, candidacies, snapshot, voting, validation,
presidential ticket (day 5), Congress by D'Hondt (day 25), seats `max(8, floor(A/50))`, election fees and
rewards.

## Design (ADR 0025)

- Migration `20261017090000_national_elections.sql`: election columns (snapshot, active citizens, seats),
  candidacy columns (party, running mate, seats), `game.party_list_members`, `game.mandates`;
  `game.national_election`, `game.take_snapshot`, `game.dhondt`, `game.proclaim_*`, `game.election_reward`;
  `game.advance_election` and `game.job_elections` cover the three kinds.
- Public: `register_ticket`, `register_party_list`, `withdraw_party_candidacy`, `get_national_election`,
  `list_tickets`, `list_party_lists`, `get_last_national_election`, `get_government`, `list_congress`.
- Native test bootstrap: `auth.users.last_sign_in_at`.
- Web: Politics tabs (Parties, Elections); `/elections` with the government, both elections, voting and the
  leader's forms; `listDraft.ts` for ordering a list.

## Tests

- pgTAP `200_national_elections.test.sql` (39): list rules and fee; snapshot and seats from active voters; list
  closing; votes and who may vote; secret results; D'Hondt (4–1 with a tie to the older party, a vacant seat,
  the threshold); rewards; ticket rules and fee; the calendar; a tie to the older ticket; offices, rewards and
  leaving Congress; the term limit; withdrawing without refund; the ledger; privileges.
- `190_parties` keeps passing with the new calendar.
- Vitest: `listDraft`, the elections page (government, voting, ordering a list, a refused ticket).

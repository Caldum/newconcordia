# G1 · Parties, membership, donations and the party leaders' election

**Acceptance (roadmap G1):** parties (50 GOLD burned), membership, donations, party leaders' election (day 15).

## Design (ADR 0024)

- Migration `20261016090000_parties.sql`: `game.parties`, `game.party_memberships`, party accounts, the
  generic `game.elections`, `game.candidacies`, `game.election_voters`, `game.ballots`;
  `game.election_calendar`, `game.party_election`, `game.advance_election`, `game.job_elections`,
  `game.fill_party_leader`, the `citizens_leave_party` trigger.
- Public: `found_party`, `join_party`, `leave_party`, `donate_to_party`, `register_candidacy`,
  `withdraw_candidacy`, `vote`, `list_parties`, `list_party_members`, `get_my_party`, `get_party_election`,
  `list_candidates`, `get_last_party_election`; `list_my_movements` names parties.
- Clock: `5 * * * *` → `elections`.
- Web: `/parties` («Politics» in the navigation): parties list with joining, founding, the own party
  (facts, leaving, leader election with running and voting, donating, members).

## Tests

- pgTAP `190_parties.test.sql` (41): founding cost, burn and idempotency; names; one party; nationality;
  membership order; donations and their currencies; the calendar; candidacies closing; the snapshot excluding
  late members; one secret ballot; validation keeping the outgoing leader; proclamation on day 16 at 12:00;
  the public result; the next election; ties; succession; changing country; an empty party; the ledger.
- Vitest: `partyName`, `electionStep`, the clock's cron map, the parties page (list, founding, validation,
  refusal, voting, donating).

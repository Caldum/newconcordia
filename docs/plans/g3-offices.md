# G3 · Offices, succession, resignations, removal and impeachment

**Acceptance (roadmap G3):** offices (president, vice president, five ministries, Central Bank governor);
incompatibilities; atomic succession; resignation, inactivity removal, impeachment.

## Design (ADR 0026)

- Migration `20261018090000_offices.sql`: new office set and one office per person; ministers and governor in
  `game.mandates`; `game.succession_events`; `game.congress_motions` and `game.motion_votes`;
  `game.national_office`, `game.leave_national_office`, `game.fill_congress_vacancy`, `game.take_office`,
  `game.successor`, `game.fill_executive`, `game.vacate_executive`, `game.close_motion`,
  `game.reward_ministers`; proclamations and the hourly job updated; citizenship and party locks.
- Public: `appoint_minister`, `appoint_governor`, `dismiss_official`, `resign_office`, `request_resignation`,
  `propose_removal`, `propose_impeachment`, `vote_motion`, `get_cabinet`, `get_my_office`, `list_motions`,
  `list_motion_votes`.
- Web: `/government` (Politics → Government): cabinet with removals, appointments, own office, motions.

## Tests

- pgTAP `210_offices.test.sql` (45): appointment rules and incompatibilities, replacing and dismissing, the
  cabinet, executive locks, a seat passing down the list, a resignation approved (2–1) and the minister
  succeeding, a failed and an approved impeachment with the chain to Congress and a vacant seat, removal
  refused while active and rejected without a majority, the exceptional succession, minister rewards once per
  month, the ledger, privileges.
- `050_citizenship` uses the president instead of the Interior minister and checks the citizenship lock.
- Vitest: the government page (cabinet and appointing, voting a motion, asking to resign).

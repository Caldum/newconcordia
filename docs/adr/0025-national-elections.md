# 0025 · National elections: the presidential ticket and Congress

Date: 2026-10-17 · Status: Accepted

## Context

Specification v3.1 sections 2 and 3: president and vice president are elected monthly on a joint ticket (vote
on day 5, office on day 6 at 12:00), at most two elected terms in a row then one out; candidates need
citizenship, civil level ≥ 15 and party membership. Congress is elected on day 25 (office on day 26 at 12:00)
with `max(8, floor(A/50))` seats, `A` being the nationals of civil level ≥ 5 who signed in during the last
seven days, from an immutable snapshot 24 hours before the vote; seats by D'Hondt over a national
constituency with a 1 % threshold of valid votes; ties by seniority; seats may stay vacant. National votes
need civil level ≥ 5. A legislative list costs the party 10 GOLD (5 to the Treasury, 5 burned), a
presidential ticket 20 GOLD (10 and 10). Rewards: president 10 GOLD, vice president 5, each elected member
of Congress 5.

## Decisions

1. **Same machinery as G1.** Both elections are rows of `game.elections`; a ticket or a list is a candidacy
   with `party_id` (a ticket also names the president in `user_id` and the running mate); ballots are the
   same secret ballots.
2. **Who registers:** the party leader, from the party's funds, one ticket and one list per party and
   election. Registering again changes the ticket or reorders the list without paying again; withdrawing
   keeps the fee spent, and registering after a withdrawal pays again.
3. **List candidates** need party membership, nationality and civil level ≥ 10 (`congress_civil_level`): the
   specification gives no level for Congress, and 10 is the ordinary requirement for offices in its succession
   rules.
4. **Calendar.** Candidacies open when the previous election of the same kind takes office and close 24 hours
   before the vote (this also applies to party leaders from now on).
5. **Snapshot when candidacies close:** nationals of civil level ≥ 5 (the vote also checks the 7-day
   adaptation period); `A` counts those whose `auth.users.last_sign_in_at` falls in the last 7 days; the seats
   are fixed then.
6. **Results.** President: the most votes win, ties to the older ticket, both still nationals and members of
   its party; without votes the outgoing authorities stay. Congress: D'Hondt with the threshold, equal
   quotients to the older party; each list fills its seats in order skipping who left the party or the country
   or holds the presidency; unfilled seats stay vacant.
7. **Offices and mandates.** `game.mandates` records every elected office with its election and dates; the
   president and vice president also go to `game.offices`. Winning the presidency ends any seat in Congress
   and any other office (incompatibility); G3 adds succession and the rest of the incompatibilities.
8. **Term limit:** a president elected in the two previous monthly elections cannot head a ticket; they may
   run as vice president.
9. **Rewards** are minted on proclamation with the reason `election_reward`, once per election, office and
   person.

## Consequences

- The web's Politics section has an Elections tab: the government, both elections with their schedule,
  voting, and the leader's ticket and list forms.
- Since a seat in Congress needs a level-10 member, small countries may leave seats vacant early in the game.
- Rollback: header of `20261017090000_national_elections.sql`.

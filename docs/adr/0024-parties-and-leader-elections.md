# 0024 · Parties and the party leaders' election

Date: 2026-10-16 · Status: Accepted

## Context

Specification v3.1 sections 2 and 3: founding a party burns 50 GOLD; parties are funded by donations; their
leaders are elected every month, voting on day 15 (UTC, 24 hours) and taking office on day 16 at 12:00 after
12 hours of anti-fraud validation; candidacies close 24 hours before; ties go to the oldest candidacy. The
specification is silent on who may found, join or donate, what happens when a leader leaves, and who votes in
a party election.

## Decisions

1. **National parties.** A party belongs to its founder's country; names are unique per country (case
   insensitive, 3–40 characters) with an optional motto of up to 160.
2. **Founding** costs 50 GOLD (`party_founding_gold`), burned and recorded in `supply_changes`. Any citizen
   not already in a party may found one; the founder is its first member and leader.
3. **Membership** is free and immediate, one party at a time, only for citizens of the party's country.
   Changing country loses the party (GDD, ADR 0007). Leaving is always possible; the president and vice
   president's lock arrives with offices (G3).
4. **Donations** in GOLD or the party's national currency, only from citizens of that country, into the
   party's own ledger accounts (kind `party`). Funds are public. Parties spend them on electoral fees in G2.
5. **Generic elections.** `game.elections` holds every election with its UTC calendar and the state machine
   `registration → voting → validation → proclaimed` (`incident` reserved for anti-fraud). Party leaders now;
   president and Congress reuse it in G2. Calendar values live in `balance_params`.
6. **Who votes for leader:** members who joined before candidacies closed (snapshot taken when the vote
   opens, immutable) and are past the 7-day adaptation period (brief). **Who runs:** any member, from day 1
   until candidacies close; a candidate who leaves the party is withdrawn.
7. **Result.** The most votes win; ties go to the oldest candidacy, then its id. Without votes or candidates
   the leader stays. Ballots are secret: only totals are published, once proclaimed.
8. **Vacancy.** A leader who leaves (or changes country) is replaced by the member with the most civil XP,
   then the oldest membership. An empty party has no leader until someone joins.
9. **Schedule.** The hourly `elections` job (clock cron `5 * * * *`) takes snapshots, closes, tallies and
   proclaims, and opens each party's next election. Voting also advances the election, so a late job never
   blocks a ballot.

## Consequences

- The web has a «Politics» section: the parties of the country, founding, joining, the own party with its
  funds, donating, members, running and voting.
- The clock Worker gains a third cron; deploying it is part of the next clock deploy (`docs/setup.md`).
- Rollback: header of `20261016090000_parties.sql`.

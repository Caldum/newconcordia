# 0026 · Offices, incompatibilities and succession

Date: 2026-10-18 · Status: Accepted

## Context

Specification v3.1 section 2: five ministries (Economy, Defense, Foreign Affairs, Health, Development) and a
Central Bank governor, appointed and removed by the president; ministers are nationals of civil level ≥ 10
with no party required, the governor of level ≥ 15 and incompatible with any other office; nobody holds
incompatible national offices; promotion by succession vacates the previous office at once; the presidency
and vice presidency can never be vacant (atomic succession: vice president; ministers by highest civil XP;
members of Congress by highest XP; other nationals by highest XP; requirements nationality, level ≥ 10 and a
party; ties by account age; an exceptional deterministic rule when nobody is eligible); the president and
vice president cannot resign until Congress approves by simple majority; 72 hours of inactivity allow
removal by an absolute majority of all members of Congress; impeachment needs 2/3 of all members; ministers
earn 5 GOLD after completing a full month in office. D06 had an Interior minister that v3.1 does not have.

## Decisions

1. **One national office per person**, Congress included (unique index on `game.offices.user_id`; an
   appointment of anyone holding an office or a seat is refused with `office_incompatible`).
2. **The Interior ministry is gone.** Citizenship requests under review are decided by the president (D06's
   other paths, automatic mode and the 72-hour timeout, are unchanged).
3. **Succession** follows the specification: the vice president takes a vacant presidency; a vacant vice
   presidency (or both) goes to the first eligible minister, member of Congress or other national, in that
   order, most civil XP first, ties to the oldest account (`joined_at`). The governor counts as an «other
   national». The exception (PD-07) is the national with most civil XP. Succession runs when an office that
   was held becomes vacant; a country that never elected anyone stays without authorities until its first
   election. Every succession is logged in `game.succession_events`; successors' mandates have
   `elected = false` and do not count toward the term limit.
4. **A seat left during the term** goes to the next eligible candidate of the same list in the election that
   filled it; otherwise it stays vacant.
5. **Congress motions** (`game.congress_motions`) last 24 hours and are counted over the seats occupied when
   they open. Resignation: quorum (an absolute majority of members take part, abstentions included) and more
   yes than no; a tie rejects it (the vice president's tie-break arrives with bills, G4). Removal: yes from an
   absolute majority of members, only after 72 h without signing in (`auth.users.last_sign_in_at`).
   Impeachment: yes from 2/3 of members. One open motion per target and kind; votes are public.
6. **Locks.** Office holders cannot request another citizenship; taking an office cancels a pending request.
   The president and vice president cannot leave their party.
7. **Minister reward:** 5 GOLD for each full month completed in office, minted by the hourly job, once per
   month and mandate.
8. Motions are closed and ministers rewarded by the hourly `elections` job; no new cron.

## Consequences

- The web's Politics section has a Government tab: the cabinet, the president's appointments and removals,
  the player's own office, and Congress's motions with voting and proposals.
- Notifications of removal motions wait for the messages module.
- Rollback: header of `20261018090000_offices.sql`.

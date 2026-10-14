# 0033 · Battles and attacks

Date: 2026-10-25 · Status: Accepted

## Context

Specification v3.1 sections 6, 8, 11 and 12.5: a battle for one region has at most 9 rounds of 1 hour; the first
side to win 5 rounds wins; a tied round goes to the defender; one battle per region; 24 hours of cooldown for
ordinary war after a battle; the winning attacker annexes the region. Attacks need health > 0 and 10 energy and
spend exactly 10; weapons are equipped by hand per unit, Q1..Q5 last 1..5 attacks; damage
`floor((10 + F) × HP/100 × (1 + 0.2 Q) × (1 + 0.05 × min(n, 75)))`; the score is cumulative per side with no
depletable resistance; XP = `floor(damage × (1 + bonuses))`, enemy +50 % and the Defense minister's priority
battle +10 %, additive, for both civil and military XP; the injury by the energy left is applied after damage and
XP. Nationals and allies fight remotely; foreign fighters must be present in the region. A live scoreboard
(Realtime) is asked for.

## Decisions

1. **Rounds by clock.** Round k covers the k-th hour from the launch. Rounds close lazily: every attack and read
   settles the rounds whose hour is over, and the hourly job settles the rest, so annexation happens at most an
   hour late if nobody looks. A round's score is the sum of the attacks recorded in its hour.
2. **Locks.** Settling takes the battle row for update; an attack holds it for share while it is recorded, so a
   round cannot close under an attack being written, and attacks do not serialize each other.
3. **Eligibility.** A citizen never fights against their own country. Nationals of a side fight from anywhere;
   others only from the battle's region (`citizens.region_code`). Alliances arrive in W5 (`game.allied`).
4. **Weapons.** `equip_weapon` takes one unit from the inventory with `Q` uses; another can be equipped only when
   the uses are gone. An attack uses the equipped weapon automatically, then the player fights unarmed.
5. **Bonuses.** The enemy bonus applies when the attacker's own country designated the other side as enemy; the
   order bonus when the attacker's country made this its priority battle. One order per country; it ends with
   the battle.
6. **Live score** is read every 5 seconds by the battle page. Realtime channels need public tables, which the
   security model does not allow; a broadcast through an Edge Function can replace polling later.
7. **Annexation** changes the region's owner and logs it in `game.region_owner_changes` (W4 reads it to restore
   occupied regions).

## Consequences

- The Military section gets Battles: the list, the president's launch and authorizations, and each battle with
  its live score, rounds, ranking, attacks and weapon.
- Rollback: header of `20261025090000_battles.sql`.

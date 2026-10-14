# 0035 · Diplomacy, travel and presence

Date: 2026-10-27 · Status: Accepted

## Context

Specification v3.1 section 6: nationals and allies fight remotely; foreign non-allied fighters must be present in
the region; alliances last until legally ended and need laws of both nations; breaking relations expels
ambassadors and ends bilateral (not multilateral) treaties; embargoes restrict direct trade and products
originating in the sanctioned nation, with arms and economic embargoes separate; peace requires a law. Travel cost
and time are pending (PD-03); at zero health a player cannot travel. Section 7: care policies for allies.

## Decisions

1. **Alliances.** Each nation passes an `alliance` law; the second reciprocal approval forms the alliance. Pending
   approvals are public. Only bilateral alliances exist (no multilateral treaties yet).
2. **Broken relations** (`break_relations` law) end the alliance between the two and block a new one while they
   last. Ambassadors are not modeled beyond this state.
3. **Peace** (`peace` law) ends this country's designation of the other as enemy, cancels its pending war
   authorizations against it (the 50 GOLD return) and restores the relations it had broken. Peace does not stop
   a battle already under way.
4. **Embargoes** (`embargo`, `lift_embargo` with `economic` or `arms`) are enforced by triggers on offers and
   trades: in a market whose country embargoes the participant's citizenship or the goods' origin, and for
   citizens of an embargoing country in the embargoed market. Arms embargoes cover military goods. Triggers keep
   every path (citizens, companies, ministries) covered without rewriting the market functions.
5. **Allies** now fight remotely (`game.allied`) and are treated by «allies» hospitals.
6. **Travel** (`public.travel`) moves a citizen's region; it ships off (`travel_enabled = 0`) with a placeholder
   price of 0 until PD-03 decides price and time. Zero health blocks it.

## Consequences

- Laws gets five kinds of foreign policy; Government shows foreign relations; Battles shows presence and travel.
- Rollback: header of `20261027090000_diplomacy.sql`.

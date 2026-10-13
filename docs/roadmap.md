# Roadmap after specification v3.1

`docs/spec.md` (ADR 0014) regroups the work into stages. Modules D01–D12 are built; the rest of the GDD's
D13–D30 list is replaced by the work below. Each item is one branch (`feat/<code>-<name>`) with its plan,
migrations, functions, pgTAP tests first, screens, docs and acceptance criteria from the specification.

## Stage 1 · Economy vertical slice (realigns D02, D08–D12)

| Code | Scope | Acceptance |
| --- | --- | --- |
| R1 | UTC game day; health 0–100; civil XP and levels (100 × L², level 0, 1 GOLD per new level, once); military XP and rank ladder (Novice, then 15 ranks × I–V, +5 % per step, cap at 75); profile | Novice → Militia I at 100 military XP, second step at 400, General V at 562,500; a level reward is paid once |
| R2 | Ledger holds (escrow) with release and capture; mint and burn records; sign-up grant of 5 GOLD, 100 national currency and 10 Q1 food, exactly once | Locked money cannot be spent elsewhere; the grant is paid once |
| R3 | Goods catalog (3 generic raw materials, food, weapons and kits Q1–Q5), inventory lots with immutable origin, holders (citizen, company, later ministry and hospital), movement log | Stock never negative; origin survives every movement |
| R4 | Automatic food every 5 minutes, lowest sufficient quality, up to +10 per interval, computed on arrival without jobs | Intervals catch up after absence; nothing eaten at 100 energy |
| R5 | 15 resources per region; companies N1–N5 with costs and level requirements; extractors and manufacturers; paid shifts, second shifts by authorization, owner management shifts; production formulas with health and national resource bonus; foreign owners and construction surcharge | `floor(150 × eff × HP/100 × (1 + bonus))`; inputs debited match output; no production without inputs |
| R6 | Market orders: sell and buy, money and goods locked, partial fills, price-time matching, cancellation; export tax with existing VAT, tariff and fee; foreign market licenses (price pending, off) | Locked money exact after partial fills; taxes deducted on execution |
| R7 | Stage 1 demo screens: work, produce, sell, buy, consume; the end-to-end journey | A citizen works → produces a kit → sells → another buys → consumes; ledger consistent |

## Stage 2 · Government and finance

| Code | Scope |
| --- | --- |
| G1 | Parties (50 GOLD burned), membership, donations, party leaders' election (day 15) |
| G2 | Electoral calendar in UTC, candidacies, snapshot, voting, validation, presidential ticket (day 5), Congress by D'Hondt (day 25), seats `max(8, floor(A/50))`, election fees and rewards |
| G3 | Offices: president, vice president, five ministries, Central Bank governor; incompatibilities; atomic succession; resignation, inactivity removal, impeachment |
| G4 | Bills: initiative limits, 24-hour votes, quorum, majorities, budget escrow, atomic execution or approved-not-executed; decrees |
| G5 | Treasury and ministry accounts, allocations by law, public audit of institutional money; currency issuance by law |
| G6 | Central Bank: FX order books against GOLD, transfers to its Treasury, single-use authorizations to companies |

## Stage 3 · Health and military progression

| Code | Scope |
| --- | --- |
| H1 | Training centers Basic, Advanced and Elite N1–N5: sessions per UTC day, energy, fees, strength, civil XP, upgrades, injuries |
| H2 | Medical kits Q1–Q5 for personal use; injuries; zero-health restrictions |
| H3 | Public hospitals N1–N5 per region, stock of kits only, automatic quality choice, care policy, stock privacy (Health minister and president only) |

## Stage 4 · Conflict, diplomacy and persistent world

| Code | Scope |
| --- | --- |
| W1 | War authorization law with 50 GOLD escrow, launch by the president within 24 hours, refund on expiry, enemy country designation |
| W2 | Battles: 9 rounds of 1 hour, first to 5, tie to the defender, one battle per region, 24-hour cooldown, annexation |
| W3 | Attacks: damage formula, weapons with uses, XP with additive bonuses, injuries, priority battle order; live scoreboard (Realtime) |
| W4 | Resistance: 10 organizers, 2 GOLD burned each, rewards on victory |
| W5 | Diplomacy: alliances, relations, embargoes (economic and arms), peace; regional eligibility, travel and presence (prices pending) |
| W6 | Independence war at the start (sandbox until PD-02 is defined) |

## Stage 5 · Hardening and launch

| Code | Scope |
| --- | --- |
| L1 | Rate limits on every action, anti-abuse signals and alerts, multi-account detection |
| L2 | Outbox and notifications, structured logs and metrics, balance telemetry |
| L3 | Backups, restore drill, compensating ledger entries for incidents |
| L4 | Onboarding and tutorial (PD-15), daily missions, press and messages |
| L5 | Terms, privacy and moderation (PD-14), closed beta |

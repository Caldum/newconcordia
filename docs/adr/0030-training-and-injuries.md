# 0030 · Training centers, injuries and zero health

Date: 2026-10-22 · Status: Accepted

## Context

Specification v3.1 sections 6–8: personal training centers Basic, Advanced and Elite, one session per UTC day per
center; energy 10/15/20; fee 0/0.5/1.5 GOLD; strength per level N1–N5 Basic and Advanced 5/10/15/20/25, Elite
10–50; 1 civil XP per strength point; upgrades N2 5, N3 10, N4 20, N5 40 GOLD; training injuries by level
0.05 %–0.25 % for −5 HP, rolled after strength and XP are granted. Personal kits Q1–Q5 (R7) work at zero health.
Training is idempotent per UTC day, center and player, with one charge per session.

## Decisions

1. **Centers are personal**, three per player, created at N1 on first use; upgrades and fees go to the sink
   (burned): the specification names no recipient.
2. **Sessions** are one row per player, center and game day (primary key), so a second session is refused and
   the charge happens once. Order: energy, fee, strength and civil XP, then the injury roll.
3. **Dice.** `game.random()` is the single source of chance; tests pin it with `game.fixed_random` (API requests
   never can), like `game.now()`.
4. **Injuries** are applied by `game.injure`, never below zero, and logged in `game.injuries` with their cause;
   attacks (W3) reuse it.
5. **Zero health** blocks training (and, in W3, attacking); personal kits still heal at zero. Travel at zero
   health arrives with W5.
6. H2's personal kits shipped in R7 (ADR 0023); this module completes H2 with injuries and the zero-health rule.

## Consequences

- A Military section in the game navigation, starting with the training page (centers and injuries).
- Rollback: header of `20261022090000_training_and_injuries.sql`.

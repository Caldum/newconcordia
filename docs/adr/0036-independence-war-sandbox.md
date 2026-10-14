# 0036 · Independence war sandbox

Date: 2026-10-28 · Status: Accepted

## Context

Specification v3.1 section 6: an NPC independence war at the start, up to 7 days or until a damage target is met
early; only national citizens' damage counts for the permanent Liberating Hero title and provisional
administration; the constitutional government forms before regular war; the hero's exact powers are PENDING.
Section 13, PD-02: requirements, damage target and powers of the Liberating Hero are pending; only a preparatory
or sandbox mode, no definitive founding.

## Decisions

1. **Sandbox, off.** `independence_war_enabled = 0` by default. With it on, an admin opens a country's war with a
   damage target of their choice (no target is invented); the action is audited.
2. **Attacks** are the ordinary attack against the NPC: 10 energy, the damage formula with weapon and rank, civil
   and military XP equal to the damage (no enemy or order bonus applies), injuries after the gains. Only nationals
   of the country may attack.
3. **End.** Reaching the target wins it at once; otherwise the hourly job closes it after 7 days as expired.
4. **Hero.** The national with most damage receives the permanent `liberating_hero` title (ties to the earliest to
   reach it). Provisional administration powers are not implemented until PD-02.

## Consequences

- The battles page shows the country's independence war and the player's titles; the admin page can open one.
- Stage 4 is complete.
- Rollback: header of `20261028090000_independence_war.sql`.

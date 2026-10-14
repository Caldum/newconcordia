# 0038 · Notifications and balance telemetry

Date: 2026-10-30 · Status: Accepted

## Context

Specification v3.1 sections 12.7 and 14 ask for an outbox, metrics and balance telemetry (GOLD issuance and burn
ratios); PD-11 accepts inflation risk with telemetry. The GDD (D25, D26) asks for automatic news of battles, laws
and conquests and notifications of battles, votes and citizenship; «opening a vote notifies every citizen of the
country»; «a conquest publishes an automatic news item in the conquered country».

## Decisions

1. **Outbox by triggers.** Notifications are written by triggers in the same transaction as their event, so an
   event and its notice never diverge. `delivered_at` lets a future e-mail worker deliver them.
2. **Audiences.** A notification targets one player or a whole country. Country notices are one row per
   country (no fan-out); a citizen sees those since they became a citizen. Reading state is one timestamp per
   player.
3. **Events now:** injuries, offices taken, citizenship decisions (player); battles started and finished — the
   automatic news of a conquest —, bills presented, motions opened, war authorizations, voting of national
   elections (country); bills closed (proposer).
4. **Telemetry.** The hourly job takes yesterday's snapshot per currency once: minted, burned (from supply
   changes), money in hands and held. Admins read it. Prices, XP per attack and other metrics stay queryable from
   their tables.
5. Structured logs of the Worker and request correlation stay with the platform (Cloudflare, Supabase logs).

## Consequences

- A Notices link with the unread count; the notices page; the economy table in the admin page.
- Rollback: header of `20261030090000_notifications.sql`.

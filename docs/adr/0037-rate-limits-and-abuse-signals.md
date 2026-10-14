# 0037 · Rate limits and abuse signals

Date: 2026-10-29 · Status: Accepted

## Context

Specification v3.1 sections 12.6 and 12.7: limits per IP, account and device; protection against double spending,
duplicated orders, replay, reward farming, multi-account abuse, self-trading and manipulation — detect and alert,
never change confirmed rules silently; alerts on negative balances, inconsistent reservations, several holders of
one office or repeated rewards; devices, IPs and sensitive metadata never published. PD-11 accepts inflation risk
with telemetry and anti-fraud, no caps without authorization.

## Decisions

1. **One limit for every action.** PostgREST's pre-request hook (`pgrst.db_pre_request` on the authenticator
   role) runs `public.check_request` before each request. Write requests of a signed-in player count per minute;
   past `rate_limit_writes_per_minute` (60) the request gets HTTP 429 with `rate_limited`. Reads run in read-only
   transactions and are not counted; visitors are not counted (Supabase limits anonymous traffic by IP).
   Double spending, duplicates and replay were already prevented by idempotency keys and locks.
2. **Signals, not sanctions.** An hourly scan records signals once (unique kind and reference): accounts sharing
   an address in 7 days (`auth.sessions.ip`), trades between them, large transfers between citizens, holds whose
   escrow does not match, currencies that do not sum to zero. Several holders of an office and repeated rewards are
   already impossible by unique indexes and ledger keys.
3. **Privacy.** Signals name accounts, never addresses; only admins read them, and reviewing one is audited.
4. Device fingerprints are not collected.

## Consequences

- The admin page lists open signals; every screen explains a 429 with a shared message.
- If the hook misbehaves, `alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';`
  removes it at once.
- Rollback: header of `20261029090000_anti_abuse.sql`.

# L1 · Rate limits, anti-abuse signals, multi-account detection

**Acceptance (roadmap L1):** rate limits on every action, anti-abuse signals and alerts, multi-account detection.

## Design (ADR 0037)

- Migration `20261029090000_anti_abuse.sql`: `game.request_counters`, `public.check_request` as PostgREST's
  pre-request hook; `game.abuse_signals`, `game.shared_address_pairs`, `game.scan_abuse` in the hourly job;
  public `admin_list_abuse_signals`, `admin_review_abuse_signal`.
- Native bootstrap: `auth.sessions` with `ip`.
- Web: shared `rate_limited` copy in `ActionFeedback`; the abuse section in the admin page.

## Tests

- pgTAP `320_anti_abuse.test.sql` (16): the limit per player and minute, a new minute, visitors not counted,
  signals for a shared address and a large transfer recorded once, counters cleaned, admins only, no addresses
  shown, the review audited.

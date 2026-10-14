# L2 · Outbox, notifications and balance telemetry

**Acceptance (roadmap L2):** outbox and notifications, structured logs and metrics, balance telemetry.

## Design (ADR 0038)

- Migration `20261030090000_notifications.sql`: `game.notifications`, `game.notification_reads`, `game.notify`
  and eight event triggers; `game.economy_snapshots`, `game.take_economy_snapshot` in the hourly job; public
  `list_my_notifications`, `count_unread_notifications`, `mark_notifications_seen`, `admin_economy_snapshots`.
- Web: Notices in the navigation and `/notifications`; the economy section in the admin page.

## Tests

- pgTAP `330_notifications.test.sql` (13): player and country notices from their events, unread count and marking,
  the defender's citizens hear of a battle and its end, one row per country, the outbox, new citizens start
  clean, the daily snapshot taken once, admins only.
- Vitest: the notices page and the unread count.

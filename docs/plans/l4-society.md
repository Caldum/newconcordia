# L4 · Onboarding, daily missions, press and messages

**Acceptance (roadmap L4):** onboarding and tutorial (PD-15), daily missions, press and messages.

## Design (ADR 0040)

- Migration `20261101090000_society.sql`: `game.mission_claims`, `game.mission_progress`, `game.newspapers`,
  `game.articles`, `game.article_reads`, `game.messages`; public `get_my_missions`, `claim_daily_missions`,
  `get_my_first_steps`, `found_newspaper`, `publish_article`, `list_articles`, `read_article`,
  `get_my_newspaper`, `send_message`, `list_conversations`, `list_messages`.
- Web: missions and first steps on the home screen; `/press` and `/messages` (Society).

## Tests

- pgTAP `350_society.test.sql` (27): newspapers and articles, unique names, idempotent publishing, missions'
  progress, the claim once a day, the 7-day streak paying 4 GOLD, rewards as system mints, the first-steps
  checklist, messages and their privacy, unread and read, the ledger.
- Vitest: the press page (reading, founding).

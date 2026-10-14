# L5 · Terms, privacy and moderation (PD-14), closed beta

**Acceptance (roadmap L5):** players accept the terms and privacy in force; reports and moderation of what players
publish; an invitation-only closed beta that can be switched on.

## Design (ADR 0044)

- Migration `20261105090000_terms_moderation_beta.sql`: params; `game.legal_acceptances`, `game.reports`,
  `game.beta_invites`, messages' `hidden_at` and `hidden_by`; `game.beta_allows`, `game.set_hidden`,
  `game.create_citizen` with the beta check; public `get_legal_versions`, `get_my_legal_status`, `accept_legal`,
  `report_content`, `admin_list_reports`, `admin_resolve_report`, `admin_unhide`, `get_beta_status`,
  `admin_list_beta_invites`, `admin_invite_beta`, `admin_revoke_beta_invite`, `admin_set_closed_beta`;
  `list_messages` and `list_conversations` without hidden text.
- Web: `features/legal` (the gate), `/terms`, `/privacy`, `features/moderation` (report button, beta notice), reports
  on articles and received messages, the admin's reports and beta sections, the sign-up notice.

## Tests

- pgTAP `390_terms_moderation_beta.test.sql` (34): acceptance by version, reports and their rules, the daily
  limit, moderators only, hiding and its audit, hidden articles and messages, showing again, the closed beta.
- Vitest: the acceptance gate, the terms page, reporting an article, moderation and the beta in admin, the sign-up
  notice.

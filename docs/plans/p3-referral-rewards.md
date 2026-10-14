# P3 · Referral rewards

**Acceptance (owner's request, 2026-11-03):** a referral panel; players earn 10% of the gold their referrals buy or
generate for 30 days and have 30 more days to claim it before it expires.

## Design (ADR 0043)

- Migration `20261104090000_referral_rewards.sql`: params, the `referral_bonus` mint reason,
  `game.referral_reward_kinds`, `game.referral_claims`, `game.referral_gold`, `game.referral_due`; public
  `list_my_referral_rewards`, `claim_referral_rewards`; an index on holds by owner.
- Web: `/referrals` (summary with claiming, the invitation link, each referral), linked from the profile.

## Tests

- pgTAP `380_referral_rewards.test.sql` (19): system pay and net purchases count, gifts do not; the share, its
  windows; claiming once, only the difference, as a mint, recorded; privacy; the 30-day windows and expiry; net
  purchases never below zero.
- Vitest: the referral panel (totals, rows, claiming).

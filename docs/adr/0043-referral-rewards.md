# 0043 · Referral rewards

Date: 2026-11-03 · Status: Accepted · Replaces point 5 of ADR 0041 (referrals unpaid)

## Context

The owner decided that players earn 10% of the gold their referrals buy or generate during 30 days, and have 30 more
days to claim it before it expires, with a panel to follow it. Money is created only by law or an explicit system
reward; this is one.

## Decisions

1. **What counts**: the GOLD a referral gets from their joining day for 30 days (`referral_earning_days`) from the
   system (levels, elections, resistance, daily missions and streaks: `game.referral_reward_kinds`), plus the GOLD
   they buy on the GOLD market **net of what they sell there** in the same window, never below zero. Transfers from
   players, the sign-up grant and other referral bonuses do not count. Netting the market makes buying and selling in
   a loop worthless; counting gross purchases would let two accounts mint GOLD without limit.
2. **The share** is `referral_reward_percent` (10) % of that, rounded down to the hundredth. It is recomputed from
   the ledger at every read, so it follows late corrections.
3. **Claiming** pays, per referral, the share minus what was already claimed, as a `referral_bonus` system mint, and
   records it in `game.referral_claims`. The ledger key carries the total claimed after the payment, so a retry pays
   nothing twice. A referrer may claim at any time until 30 days after the earning window ends
   (`referral_claim_days`); after that the unclaimed rest expires.
4. **The panel** (`/referrals`) shows the totals (claimable now, earned, claimed), the next expiry, the invitation
   link, and per referral the GOLD that counted, the share, what was claimed and until when.

## Consequences

- Rewards are paid only when claimed; expired shares were never minted.
- Rollback: header of `20261104090000_referral_rewards.sql`.

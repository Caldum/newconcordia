# 0044 · Terms acceptance, moderation and closed beta

Date: 2026-11-03 · Status: Accepted

## Context

Roadmap L5 and specification PD-14: terms and conditions, moderation, privacy and user age are a product and legal
pending item; texts, policies and report flows must be ready before a public beta. GDD section 7: content
moderation and reports. The legal texts and the minimum age are the owner's decisions (ADR 0006).

## Decisions

1. **Acceptance by version.** The versions in force are `terms_version` and `privacy_version`. Every player accepts
   them before playing (a screen in place of the game, with links to both texts); each acceptance is kept per
   version in `game.legal_acceptances`. Raising a version asks everyone again. The web shows the game if the status
   cannot be read: the record lives in the database.
2. **Texts.** `/terms` and `/privacy` are public pages. Until the owner sends the reviewed texts they show a short
   draft that states only what the game does (one account per person, fair play, what is public, what is stored and
   with which providers), marked as a draft. The minimum age is not set (PD-14).
3. **Reports.** A citizen reports an article, a message they received (reporting shows it to moderators) or a
   citizen by name, with a reason (spam, abuse, hate, cheating, other) and optional details; one open report per
   target and reporter, and up to `reports_max_per_day` (20) a day.
4. **Moderation.** Admins see open reports with what was reported, and dismiss them or hide the article or message;
   the decision closes every open report on that target and goes in the admin log. Hidden content is kept, hidden
   messages keep their place without text, and an admin can show it again (logged).
5. **Closed beta.** `closed_beta` is off. When on, `game.create_citizen` (every sign-up path) only creates citizens
   for admins and invited emails (`game.beta_invites`); others get `beta_closed`. The sign-up shows a notice while
   it is on. Admins invite, withdraw unused invitations and switch it, all audited.

## Consequences

- Replacing the draft texts is a copy change plus raising the version parameter.
- An email sign-up refused by the closed beta fails at Supabase with a generic error; the notice above the form
  explains why.
- Rollback: header of `20261105090000_terms_moderation_beta.sql`.

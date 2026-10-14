# 0041 · Profile, side panel, pictures, friends, referrals and regiments

Date: 2026-11-02 · Status: Accepted · Point 5 replaced by ADR 0043

## Context

The owner asked for a side panel with the player's picture, name, message and notice icons with badges, the
energy out of its maximum, gold in bars and the national money by its name; a profile with picture, name and
level, achievements, friends, referrals, location, citizenship, whether the citizen is new, the day they were
born in Concordia, the national rank, the party (with picture) and the regiment (with picture); and editing the
profile: description and picture, then email and password. The specification is silent on all of it. GDD:
military units with a leader (section 4), friends (section 7), achievements and medals (D27). Money is issued
only by law or an explicit system reward.

## Decisions

1. **Pictures live in Supabase Storage**, in one public bucket `pictures` (300 KB per file, WebP, PNG or
   JPEG). The browser cuts the centered square and shrinks it to 256 × 256 WebP before uploading. A player may
   write only under `citizens/<their id>/`, or under `parties/<id>/` and `regiments/<id>/` of what they lead
   (`public.can_store_picture`, used by the storage policies); every file gets a new UUID name. A function
   (`set_my_avatar`, `set_party_emblem`, `set_regiment_emblem`) then records which uploaded picture is in use,
   after checking it exists in that folder. The web client keeps skipping supabase-js (ADR 0009): an upload is
   one `fetch` to the Storage endpoint with the player's session. Old files stay in the bucket; cleaning them is
   left for later.
2. **The national money is named after the real currency** of the country (ISO 4217 through `Intl`): «38.450
   pesos argentinos». It stays one Credit per country in the ledger; only its name on the side panel changes.
   Countries without a currency of their own fall back to «Crédito». Gold is counted in «lingotes».
3. **Regiments** are military units of one country: founding is free, one regiment per citizen, the founder
   leads. When the leader leaves, the oldest member takes command; with nobody left it is dissolved (kept for
   the record). Changing citizenship leaves the regiment. They have no military effect yet.
4. **Friends** need a request and its acceptance; asking someone who already asked you accepts. Up to 500
   friends and requests (`friends_max`). Both events notify.
5. **Referrals** are recorded, not paid: an invitation link `/sign-up?ref=<name>` is kept in the browser and
   claimed once the citizen exists, within 72 hours of joining (`referral_window_hours`), only naming an older
   citizen. No reward until the owner decides one.
6. **Achievements** are read from the player's state (first workday, first battle, founded a company, Liberating
   Hero…), 14 of them, with the date when it is known. Nothing is paid for them.
7. **National rank** is the place among the citizens of their country by experience. **New citizen** means
   inside the 7-day adaptation period of their citizenship; after it the profile says full rights.
8. **Email and password** change through Supabase Auth: a new email is confirmed from the new address; a new
   password closes the sessions on other devices, as the recovery flow does.

## Consequences

- Every game screen shows the side panel; the bar keeps the sections, the language and signing out. Notices
  left the bar for the bell in the panel.
- The storage policies open writing to the bucket for signed-in players, limited to their folders: the owner
  should review them before production (CLAUDE.md, permission changes).
- Rollback: header of `20261102090000_profiles.sql`.

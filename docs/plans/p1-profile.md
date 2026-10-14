# P1 · Profile, side panel, friends, referrals and regiments

**Acceptance (owner's request, 2026-11-02):** a side panel with picture, name, message and notice badges, energy
out of the maximum, gold in bars and the national money by name; a profile with picture, name, level,
achievements, friends, referrals, location, citizenship, new-citizen status, birth in Concordia, national rank,
party and regiment with pictures; editing the description and picture, the email and the password.

## Design (ADR 0041)

- Migration `20261102090000_profiles.sql`: bucket `pictures` and its policies, `public.can_store_picture`;
  `game.citizens` + `bio`, `avatar_path`, `referred_by_user_id`; `game.parties` + `emblem_path`;
  `game.regiments`, `game.regiment_members`, `game.friendships`; public `set_my_bio`, `set_my_avatar`,
  `set_party_emblem`, `set_regiment_emblem`, `get_my_profile_details`, `list_my_achievements`,
  `count_unread_messages`, `set_my_referrer`, `list_my_referrals`, `request_friend`, `answer_friend`,
  `remove_friend`, `list_my_friends`, `found_regiment`, `join_regiment`, `leave_regiment`, `list_regiments`,
  `get_my_regiment`.
- Native test database: a Storage shim in `supabase/native/bootstrap.sql`.
- Web: `features/shell/Sidebar*`, `features/profile/{Avatar, PictureField, pictures, referral, api, queries}`,
  `features/world/currency`, `features/regiments`; `/profile` rebuilt, `/profile/edit`,
  `/profile/edit/security`, `/regiments`; the party picture for its leader.

## Tests

- pgTAP `360_profiles.test.sql` (40): picture folders and the storage policy, recording a picture, the
  description limit, the party picture only for its leader, regiments (unique names, one each, the country,
  succession, dissolving, leaving on a citizenship change), friends (request, accept by asking back, nothing to
  answer, notification), referrals (once, within 72 hours, an older citizen), profile details, achievements and
  unread messages.
- Vitest: currency names, picture cropping and paths, referral links; the side panel, the profile, editing it,
  regiments.

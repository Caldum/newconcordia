# War live · The independence war screen and the war simulator

**Acceptance (owner's request):** Argentina's liberation war with simulated players that train, work and fight, and
an interactive war screen that shows the fighting in real time.

## Design (ADR 0046)

- Migration `20261107090000_independence_live.sql`: `independence_feed`, `independence_pulse`,
  `get_my_independence`, index on strikes by war and time.
- Web: `/battles/independence` (`pages/independence/`), pure rules in `features/war/live.ts`, `countryOutline` in
  the map geometry, `useTick`, a link from the battles page.
- `supabase/scripts/simulate-war.js`: bots as referrals of `SIM_REFERRER`, the war opened, companies, jobs,
  training, shifts and strikes.

## Tests

- pgTAP `410_independence_live.test.sql` (10): the feed order and limits, visitors, the pulse per minute and its
  window, the player's share and place.
- Vitest: progress, countdown, pulse filling, new strikes and burst keys; the outline; the screen (board, feed,
  share, heroes, five strikes with five keys, a burst stopped by energy, no war).

# D06 · Citizenship

> Updated by `docs/brief.md` section 3 (immediate citizenship, adaptation period, waitlist).

**Acceptance test (GDD):** an approved request grants citizenship; another without an answer is approved on
its own at 72 hours.

## Design

- **Immediate citizenship:** the citizen created at sign-up (D05) gets a number in its country
  (`ARG-003413`, consecutive per country) and lives in the capital region (a new `capital_region_code` per
  country). `joined_at` starts the adaptation; `citizen_since` the current citizenship.
- **Adaptation:** `game.war_damage_factor(user)` is 0.5 during the first 7 days of the account;
  `game.can_vote_in_elections(user)` needs 7 days in the current citizenship. D16 and D19 call them.
- **Waitlist:** «Otro país» at sign-up lists the countries not in play. The player waits for one and starts in
  a country in play; when it opens, asking for its citizenship is approved at once (they keep everything).
  The place in line and the count are public numbers. Emailing the list when a country opens belongs to D07
  (activation) and D26 (notifications).
- **Changes:** requested from the destination. Its `citizenship_mode` decides: `automatic` approves at once,
  `review` waits for its president or Interior minister (`game.offices`, filled by D19 and D20). The hourly
  `citizenship_timeouts` job approves requests unanswered for 72 hours. One pending request at a time; one
  change every 30 days; on approval the player leaves every office, gets a new number and moves to the new
  capital.
- **Screens:** sign-up gains «Otro país» (CountryNotPlayable), `/citizenship` shows the document, the first
  week, the waitlist and the change status (and the welcome after confirming the email), `/citizenship/change`
  (ChangeCitizenship) and `/citizenship/requests` for officials (CitizenshipRequests).

## Tests

- pgTAP with a pinned clock: numbering, capital, adaptation boundaries, waitlist rules and place, every
  request rule (pending, same country, too soon, not in play, not allowed), approval by the minister, the
  72-hour job before and after the limit, automatic mode, waitlist move, cancellation.
- Vitest for the new screens and the sign-up waitlist.
- Playwright: the minister approves through the interface; a request is approved by the job after 72 hours;
  the welcome after confirming the email; axe on every new screen.

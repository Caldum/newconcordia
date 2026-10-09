## What changes

<!-- D module and a two- or three-sentence summary. -->

## Plan

<!-- Link to docs/plans/ or the steps in a short list. -->

## Tests

- [ ] pgTAP for every new function and policy, with abuse cases
- [ ] Vitest for hooks and components
- [ ] Playwright with axe on every new screen
- [ ] GDD acceptance test for this module

## Review

- [ ] Forward-only migrations with a way back, reviewed by squawk
- [ ] No new table without RLS; no direct write privilege for `anon` or `authenticated`
- [ ] Copy follows `docs/voice.md` in Spanish and English; no keyboard shortcuts
- [ ] New dependencies justified
- [ ] `docs/progress.md` updated

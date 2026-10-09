# Atlas in code

**Goal:** `packages/atlas` with the tokens, base styles and the components of brief section 6, each with
example states and accessibility tests, so every screen is rebuilt from them.

## Decisions

- `tokens.css` is generated from `docs/design/atlas/tokens.json` (the only source of values); a test fails
  on drift. Type widths (`font-stretch`) live in prose in tokens.json, so the generator declares them.
- Icons, flags and logos are generated as data from their sources (kit SVGs, `flags.py`, flag-icons) by a
  strict parser; React renders them as elements, never through `innerHTML`.
- Components carry no copy: every text comes from the app's i18n catalogs.
- No barrel file: each component is its own entry point (`@concordia/atlas/Button`).
- Example states live in a gallery app (`pnpm gallery`), the "stories" of the brief, without Storybook.
- Tests: Vitest + Testing Library + axe in jsdom per component; Playwright on the gallery for color
  contrast in a real browser, 360 px without horizontal scroll, keyboard use and visible focus.
- Fonts: Fontsource packages (SIL OFL 1.1), Latin subsets only, `font-display: swap`.

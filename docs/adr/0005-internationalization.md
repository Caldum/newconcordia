# 0005 · Internationalization: typed catalogs for Spanish and English

Date: 2026-10-09 · Status: Accepted

## Context

The owner asked for the web to support several languages, starting with Spanish and English. Spanish is the
language of the design and of the reviewed copy (`docs/voice.md`). The initial JavaScript budget is 170 kB.

## Options

1. `react-i18next` (+ ICU plugin): mature, runtime of ~15–25 kB, keys are strings checked only by tooling.
2. FormatJS / `react-intl`: ICU messages, ~20 kB, extraction tooling.
3. Lingui: compiles catalogs at build time, small runtime, but needs a Babel or SWC macro that does not fit
   the Vite 8 (Oxc) pipeline without extra plugins.
4. Typed catalogs of our own: each screen exports its messages for every locale as plain objects; the
   English object must have the same shape as the Spanish one (a missing key or a wrong interpolation
   signature is a type error). Plurals and numbers use the platform `Intl` APIs.

## Decision

Option 4.

- `apps/web/src/i18n/`: the locale list (`es`, `en`), detection, the provider and the formatting helpers.
- Each screen keeps `messages.ts` with `defineMessages({ es: {...}, en: {...} })`. Values are strings or
  functions for interpolation and plurals (using `Intl.PluralRules`).
- Locale resolution: the player's saved choice (local storage now; the account setting when it exists),
  then the first match in `navigator.languages`, then Spanish.
- `<html lang>` always matches the active locale, and the document title is translated.
- Numbers, dates and percentages go through `Intl` helpers with `useGrouping: 'always'` (Spanish needs
  «1.840», which `Intl` would print as «1840» by default).
- The database never returns interface text. RPC errors are stable codes (for example
  `already_worked_today`) that each screen maps to its catalog.
- Country names are translated in the catalog by ISO code. Region names are proper names and stay as they
  are on the map in every language.
- URL paths are English and the same for every language.

## Consequences

- No runtime dependency and full type safety; adding a third language means adding an object per catalog
  and the compiler lists what is missing.
- No translation management platform for now. If translators outside the team join, the catalogs can be
  exported to a standard format (ICU JSON) with a small script; that decision gets its own ADR.

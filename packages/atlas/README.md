# @concordia/atlas

The Atlas design system in code: tokens, base styles and the components of brief section 6. The source of
truth for every value is `docs/design/atlas/` (tokens, brand manual and one README per component).

```tsx
import '@concordia/atlas/styles.css'; // once, at the app root: fonts, tokens and base styles
import { Button } from '@concordia/atlas/Button';
import { CountryPicker } from '@concordia/atlas/CountryPicker';
```

Each component has its own entry point (no barrel file), so the app only bundles what it imports.

## Components

| Component | File | Notes |
| --- | --- | --- |
| Button | `Button.tsx` | `variant` primary, war, secondary, ghost, light, outline-light; `size` large; `buttonClassName()` for links |
| Status | `Status.tsx` | Chip with a word; `live` adds the pulsing dot |
| Scoreboard | `Scoreboard.tsx` | Battle score on ink, with a spoken summary |
| Silhouette | `Silhouette.tsx` | Country or region geometry; battle split, highlighted region, inactive outline |
| Track | `Track.tsx` | `SplitTrack` (battle damage), `EnergyMeter`, `ProgressMeter` (role `meter`) |
| Field | `Field.tsx` | Label, hint, error and success tied to the input |
| CountryPicker | `CountryPicker.tsx` | Search plus a flag grid as a radio group, with «Otro país» |
| Option | `Option.tsx` | `OptionGroup`: large single-choice options |
| Segmented | `Segmented.tsx` | `Segmented` (tabs that switch the view) and `Switch` |
| Note | `Note.tsx` | `Note` (in the flow; errors are alerts), `Toast` and `ToastRegion` (polite live region) |
| Steps | `Steps.tsx` | Ordered steps with `aria-current="step"` |
| Panel | `Panel.tsx` | `Panel` (land, ink, nation, map), `PanelHeader`, `PanelBody` |
| Stage | `Stage.tsx` | Ink stage with the 13-color `CountryStripe` |
| CountryBar | `CountryBar.tsx` | Top bar in the player's color, `CountryBarNav`, `ResourceChip` |
| Document | `Document.tsx` | Citizenship document with its single entrance animation |
| SectionHeader | `SectionHeader.tsx` | Section title with its plate (the only illustration of the screen) |
| Icon, Flag, Brand | `Icon.tsx`, `Flag.tsx`, `Brand.tsx` | Generated from the kit sources; `GoldIcon` and `EnergyIcon` in `GameIcons.tsx` |

Components carry no copy of their own: every visible or spoken text comes from the caller, so the app's
i18n catalogs (Spanish and English) stay the only place for copy.

## Generated files

| File | Source | Command |
| --- | --- | --- |
| `src/tokens.css` | `docs/design/atlas/tokens.json` | `pnpm tokens` |
| `src/icons.generated.ts`, `flags.generated.ts`, `logos.generated.ts` | `docs/design/assets/*`, `docs/design/tools/flags.py`, lipis/flag-icons (MIT) | `pnpm assets` |

Tests fail when a generated file drifts from its source. SVG sources go through a strict parser that rejects
scripts, event handlers and text, and React renders them as elements (no `innerHTML`), with ids prefixed per
instance so a flag can appear twice on a page.

## Tests

```bash
pnpm test            # Vitest + Testing Library + axe (jsdom) for every component
pnpm test:coverage   # 90 % floor
pnpm gallery         # the example states of every component at http://localhost:5173
pnpm e2e             # Playwright on the gallery: axe WCAG 2.2 AA with color contrast, 360 px, keyboard
```

Fonts: Archivo (variable, weight and width) and EB Garamond italic 500, Latin subsets, SIL OFL 1.1.

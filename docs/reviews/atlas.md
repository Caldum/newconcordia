# Atlas review

Review of `feat/atlas` against `docs/plans/atlas.md` and brief section 6, following `requesting-code-review`
and `differential-review`. Size: medium; strategy: focused on the parser, rendering of generated SVG and the
keyboard widgets.

## Risk triage

| Area | Risk | Notes |
| --- | --- | --- |
| `scripts/svg.js` + `SvgNodes.tsx` | Medium (rendering third-party SVG) | Build-time parser rejects `<script>`, `<foreignObject>`, `<style>`, text and `on*` attributes; output is data rendered with `createElement`. No `dangerouslySetInnerHTML` anywhere. |
| Roving radio / tabs | Medium (keyboard access) | WAI-ARIA radio group and tabs patterns; tested in jsdom and in a real browser. |
| Fonts | Low | OFL 1.1 is a permissive font license (bundling allowed). |

## Findings

- Fixed during review: `text-faint` on `sea` failed contrast in the gallery (Atlas allows it only on
  `land`; the gallery now shows Steps on a panel, as the screens do). `title-1` and the Document fields
  overflowed at 360 px; large type now steps down below 720 px and the Document grid wraps.
- Critical: none. Important: none.
- Minor (accepted): `jsx-a11y/interactive-supports-focus` is disabled on the three composite widgets with a
  justification: focus belongs to their options (roving tabindex), as WAI-ARIA prescribes.

## Coverage

68 unit tests (95 % statements, 91 % branches) and 4 gallery e2e tests.

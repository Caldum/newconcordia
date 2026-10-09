Concordia Atlas is the visual system of Concordia, a strategy game in the browser where players work, vote
and fight for real regions. The interface is drawn like an atlas: the sea is the background, land is the
panels, and each country tints what belongs to it.

Token, class and component names are in English (ADR 0004). Quoted interface copy is Spanish, the source
language of the game.

## Principles

1. **The game first, then the interface.** Every screen opens with something that only exists in Concordia:
   a live battle, a region, a country. Never a generic illustration or a sales headline.
2. **Understood at a glance.** Match data (energy, scoreboard, round time) reads without searching:
   `score`, `figure` and tabular figures.
3. **Color never informs alone.** Every state carries a word or an icon; every country, its name. Gains
   carry a + sign.
4. **One protagonist per screen.** A stage, a scoreboard or a document; everything else in a neutral tone.
5. **Accessible from any input.** Everything is reachable with Tab, everything touchable measures at least
   `touch-min` and focus is always visible. There are no keyboard shortcuts: every action is a button with
   its verb.

## Voice and copy

- Neutral Spanish with *tú*: «Elige tu país», «Entra a la batalla», «¿Ya tienes cuenta?». No *voseo* or
  regionalisms: «aquí», «dinero», «combustible». Short sentences and clear verbs. English copy follows the
  same rules (`docs/voice.md`, section 4).
- Capital letter only at the start of the sentence and in proper names. Never all caps.
- Buttons start with an infinitive verb that says what happens: «Crear mi ciudadano», «Entrar a combatir».
  The notice repeats the verb in the past tense: «Compraste 10 raciones».
- Errors say what happened and how to continue, without apologizing: «Falta el dominio, por ejemplo
  camila@gmail.com».
- Numbers follow the locale: in Spanish, a period for thousands and a comma for decimals (38.450, 36,96,
  58 %). The currencies are called Oro and Crédito (Gold and Credit), capitalized.
- No emoji. No exclamation marks except for a real achievement.
- It must not sound AI-written: state the fact or the action and nothing else. No filler contrasts, no runs
  of fragments, no sales words, no dashes as connectors, no rhetorical questions and no chatbot filler.

## Color

- Background `sea`; panels `land`; text `ink` and `text-muted`. `text-faint` only for metadata on `land`.
- `nation` is the color of the player's country (light blue for Argentina) and changes per player: it tints
  the bar, their territory and the welcome. Text on it: `on-nation`.
- `war` is the only action red: the combat button and Live. One per screen.
- `positive`, `warning` and `info` are states; they are used with their `-tint` background and their `-text`.
- The 13 `country-*` colors are used on maps, silhouettes, legends and the brand stripe. Never as the
  background of small text.
- Contrast: all interface text meets 4.5:1 on its background; control borders (`line-control`) and focus, 3:1.

## Typography

- **Archivo** for everything that is not a place. Titles at 800 with 112 to 122 % width (`font-stretch`),
  figures at 800 and 124 %, tabular, like a sports scoreboard.
- **EB Garamond italic** only for place names (countries, regions, provinces, oceans), as in an atlas. Never
  to emphasize a word inside a sentence.
- Scale: `display` 76, `title-1` 44, `title-2` 23, `title-3` 17, `body-l` 18, `body` 16, `label` and
  `support` 14, `chip` 13. No interface text below 14 px except chips.

## Shape, space and depth

- Small radii with a purpose: `radius-xs` tracks, `radius-s` chips and avatars, `radius-m` controls,
  `radius-l` panels, `radius-xl` stages.
- Panels have no shadow: only `panel-border`. The `floating` shadow is for what floats over the map and
  `document` for the citizenship document.
- Spacing from `space-1` (4 px) to `space-10` (88 px). Panels with `space-6` of padding and `space-5`
  between them. Content up to `page-max`, with `space-7` of margin.
- Surfaces by content: `land` for everyday content, `ink` for decisions and scoreboards, `nation` for what
  belongs to the player, `sea-deep` for the map. See the Panel component.

## Motion

- The only thing that moves on its own is the Live dot.
- Responses to an action last 150 ms entering and up to 300 ms leaving; nothing goes past 500 ms.
- The citizenship document enters once, when the email is confirmed.
- With `prefers-reduced-motion` everything stays still.

## Input and accessibility

- Adaptive desktop only: content up to 1320 px that reflows into columns as the window shrinks. Entry
  screens split into stage and form.
- Focus: a 3 px ring in `info` with a white halo (`focus`), visible on land, ink and nation.
- Touch: 44 px minimum, 56 px for the primary button and Hit.

## Iconography

- Our own stroke icons, 1.8 px on a 24 grid, round caps and joins, in `ink` or `currentColor`. Sizes 14, 16,
  18, 20 and 24.
- Always next to a word, except in icon-only buttons, which carry `aria-label`.
- The Gold and energy icons are colored: a coin in `gold` with a `gold-border` ring, a bolt in `energy`.
- Country and region silhouettes (assets/silhouettes) are the game's imagery on Entry, Home and the
  country cards. Their files carry each country's color.

## Illustrations

- Seven flat 16:9 plates, one per section: economy, market, banks, war, politics, press and resources
  (assets/illustrations). They only go in the SectionHeader component, one per screen.
- Simple shapes without gradients or textures, without people and without text. Ground in `ink`,
  background in the section's tint and accents from the Atlas palette; the `war` red only on the war plate.
- Each plate includes something from Concordia: a region outline, the awning with the 13 colors or a front line.
- They never replace data: if a screen has a scoreboard or a map, it has no plate.

## Brand

- Mark: a circle divided into eight regions with irregular borders, like a political map seen from above.
  Seven regions are in national colors and one in `war` red: the disputed region, because in Concordia
  there always is one. Inside the game that region can take the player's `nation` color.
- Versions (assets/logos): `concordia-mark` with white borders for light backgrounds and `nation`;
  `concordia-mark-on-ink` with borders in `ink`; `concordia-app-icon` on an `ink` square with a 14/64 radius
  for the app and favicon.
- In the bar it sits on a 38 px white square. Minimum size 20 px; below that, use the app icon.
- Logotype: «Concordia» in Archivo 800 at 125 % width, in `ink` or in white on `ink`, to the right of the mark
  with a gap equal to a third of its width. It is not distorted, not recolored region by region and has no
  shadow.
- The 13-color national stripe closes stages and color bands.

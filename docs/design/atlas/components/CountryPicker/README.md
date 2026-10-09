# CountryPicker

Choosing the country at sign-up or when changing citizenship. It is a `land-soft` container with a panel
border that groups a search box and a grid of flags with the name below. It is a `radiogroup`: Tab enters
and leaves it, arrows move inside, and Enter or Space chooses.

- Each option carries the country's flag at 52 × 39 px, with a thin border so white does not get lost on `land`.
- Selected: a 2 px border in `ink` and a `land-soft` background.
- The search box filters by name; it becomes necessary when more countries are in play.
- At the end, «Otro país» shows the countries not yet in play and leads to the «Dónde empezar» step.
- On choosing, the stage on the left updates with the chosen country.
- In single-column lists (for example, «Dónde empezar»), the flag goes at 48 × 36 px to the left of the name.

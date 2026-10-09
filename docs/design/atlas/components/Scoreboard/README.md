# Scoreboard

A battle's scoreboard: the two countries as place names, their damage percentages in `score-xl` and the
silhouette of the disputed region in the center, filled with each side's color by damage.

- It sits on `ink`. The player's own country in `nation-on-ink`, the rival in `war-on-ink` (or its national
  color lightened).
- Under each number, its role in words («Defiende su región», «Ataca por mar»).
- What the caller provides: the two countries, the first one's percentage, the region silhouette and the roles.

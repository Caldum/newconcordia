# P2 · Location and travel

**Acceptance (owner's request, 2026-11-03):** keep the region where each character is and let them travel between
regions, at 0.0001 GOLD per real kilometre charged in the national currency at the 6-hour market average (500 per
GOLD without it), instantly.

## Design (ADR 0042)

- `data/map/scripts/region_centroids.mjs`: the centroid of each of the 78 regions.
- Migration `20261103090000_travel.sql`: regions' `latitude` and `longitude`; `game.region_distance_km`,
  `game.gold_rate`, `game.travel_price`; `game.travel_events`; `public.travel` replaced, `get_travel_terms`
  replaced, `list_travel_destinations`; travel opened.
- Web: `features/travel`, `/travel`, the location on the side panel, the battles' travel panel linking there.

## Tests

- pgTAP `370_travel.test.sql` (18): centroids, distances, the fallback rate, prices, destinations nearest first, a
  trip paid once and burned, its record, the market rate and its 6-hour window, insufficient funds.
  `300_diplomacy` now expects travel open.
- Vitest: the travel screen (location, rate, distance, price, travelling, closed) and the side panel's location.

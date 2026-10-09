# D03 · World: countries, regions and owners

**Acceptance test (GDD):** the database returns 13 active countries and 78 regions, each with its owner.

## Design

- Fixed region codes come from `REGION_ORDER` in `data/map/scripts/regions_map.py`: country code plus the
  position in the GDD list (`ARG-05` is Cuyo). The TopoJSON carries them as shape ids, so the map and the
  database share them.
- `data/map/world.json` is the single data file for the database: 250 countries (ISO codes, Spanish and
  English names, official names of the 13 in play, colors) and the 78 regions with their provinces.
  English names and ISO alpha-2 come from Natural Earth admin 0.
- `game.countries` lists every country; `is_active` marks the 13 in play, and a check requires a color and
  an official name for them. `game.regions` holds the home country, the current owner (both foreign keys)
  and `is_enabled` for disputed territories (D07). Ownership history arrives with conquest (D18).
- Reference data ships in a generated migration (it must exist in every environment), not in `seed.sql`.
- Public reads: `public.list_countries()` and `public.list_regions()`, callable by anyone (the map is public).

## Tests

- Python: codes, counts per country, names in both languages, every output in sync with its sources.
- pgTAP: acceptance test, counts per country, fixed codes, constraints, public read, players cannot write.

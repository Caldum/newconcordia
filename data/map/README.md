# Concordia map and world data

| File | What it is | Produced by |
| --- | --- | --- |
| `world-regions.json` | TopoJSON. Objects: `regions` (one shape per region of a country in play, with its fixed code as `id`, and one per country not in play, with its ISO code as `id`) and `countries` (name, color, in play) | `build_regions.py`, then `build_world_data.py` |
| `world.json` | Countries (code, ISO alpha-2, names in Spanish and English, official names, color, in play) and the 78 regions (code, country, name, provinces) | `build_world_data.py` |
| `countries-natural-earth.json` | ISO alpha-2 and English names per country, extracted from Natural Earth | `extract_natural_earth.py` |
| `../../supabase/migrations/*_world_data.sql` | The migration that loads `world.json` into the database | `build_world_seed.py` |

## Region codes

`scripts/regions_map.py` holds `REGION_ORDER`, the regions of each country in the order of the game design
document. A region's code is its country code and its position: `ARG-05` is Cuyo. Codes never change: a new
region takes the next number, and a removed one keeps its number unused. The map, the database and the game
all use these codes.

## Rebuilding

```bash
cd data/map/scripts
python3 -I build_regions.py <admin1.geojson> <admin0.geojson> ../world-regions.json   # geometry (rarely)
python3 -I extract_natural_earth.py <ne_50m_admin_0_countries.geojson> ../countries-natural-earth.json
python3 -I build_world_data.py      # ids on the map + world.json
python3 -I -m unittest discover     # checks codes, counts, names and that every output is in sync
```

The seed migration is generated once with `build_world_seed.py`; after it has been applied, changes to the
world go in a new migration.

Sources: Natural Earth (public domain), `nvkelso/natural-earth-vector` at commit ca96624:
`geojson/ne_10m_admin_1_states_provinces.geojson` and `geojson/ne_50m_admin_0_countries.geojson`.

`map.js` and `concordia-map.html` are the landing prototype with the SVG map (d3-geo): the visual reference
for D04. Its interface copy is Spanish.

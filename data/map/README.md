# Concordia map

- `world-regions.json`: the generated TopoJSON (version published in the «Mapa de Concordia» artifact).
  Objects: `regions` (one polygon per region of an active country and one per inactive country) and
  `countries` (name, color and whether the country is in play).
- `scripts/regions_map.py`: active countries, colors and the grouping of provinces into regions. It is the
  source for seeding the regions table (D03).
- `scripts/build_regions.py`: generates the TopoJSON. Usage:
  `python3 -I build_regions.py <admin1.geojson> <admin0.geojson> <output.json> [tolerance]`.
- Source: Natural Earth (public domain), repository `nvkelso/natural-earth-vector`, files
  `geojson/ne_10m_admin_1_states_provinces.geojson` and `geojson/ne_50m_admin_0_countries.geojson`
  (commit ca96624).
- `map.js` and `concordia-map.html`: landing prototype with the SVG map (d3-geo). Visual reference for D04;
  its interface copy is Spanish.

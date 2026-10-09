# Mapa de Concordia

- `world-regions.json`: TopoJSON generado (versión publicada en el artifact «Mapa de Concordia»).
- `scripts/regions_map.py`: países activos, colores y la agrupación de provincias en regiones con código fijo. Es la fuente para sembrar la tabla de regiones (D03).
- `scripts/build_regions.py`: genera el TopoJSON. Uso: `python3 -I build_regions.py <admin1.geojson> <admin0.geojson> <salida.json> [tolerancia]`.
- Fuente: Natural Earth (dominio público), repositorio `nvkelso/natural-earth-vector`, archivos `geojson/ne_10m_admin_1_states_provinces.geojson` y `geojson/ne_50m_admin_0_countries.geojson` (commit ca96624).
- `build_topo.py`, `preview*.py` y `build_page.py` son versiones previas y utilidades de vista previa.
- `mapa.js` y `mapa-concordia.html`: prototipo de la landing con el mapa en SVG (d3-geo).

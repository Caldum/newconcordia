"""Builds the world data shared by the map and the database.

- world-regions.json: each shape gets its fixed `id` (region code such as ARG-05, or the country code for
  countries not in play), so the map and the database name regions the same way.
- world.json: countries (code, ISO alpha-2, names in Spanish and English, color, in play) and the 78
  regions of the countries in play (code, country, name, provinces). The world migration is generated
  from it (scripts/build_world_seed.py).

Usage: python3 -I build_world_data.py   (reads and rewrites the files next to this folder)
"""

import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from regions_map import ACTIVE, COLORS, REGION_ORDER, region_code  # noqa: E402

MAP_DIR = Path(__file__).resolve().parent.parent

# Map shapes Natural Earth admin 0 does not list (bases, small territories), named for both languages.
EXTRA_TERRITORIES = {
    "CLP": ("Isla Clipperton", "Clipperton Island", None),
    "CSI": ("Islas del Mar del Coral", "Coral Sea Islands", None),
    "ESB": ("Dhekelia", "Dhekelia", None),
    "GIB": ("Gibraltar", "Gibraltar", "GI"),
    "KAB": ("Baikonur", "Baikonur", None),
    "PGA": ("Islas Spratly", "Spratly Islands", None),
    "UMI": ("Islas Ultramarinas de Estados Unidos", "U.S. Minor Outlying Islands", "UM"),
    "USG": ("Base naval de Guantánamo", "Guantanamo Bay Naval Base", None),
    "WSB": ("Acrotiri", "Akrotiri", None),
}

# Names used in the game for the countries in play: the short name in each language and the official
# name printed on the citizenship document.
ACTIVE_NAMES = {
    "ARG": ("Argentina", "Argentina", "República Argentina", "Argentine Republic"),
    "BRA": ("Brasil", "Brazil", "República Federativa del Brasil", "Federative Republic of Brazil"),
    "CHL": ("Chile", "Chile", "República de Chile", "Republic of Chile"),
    "PRY": ("Paraguay", "Paraguay", "República del Paraguay", "Republic of Paraguay"),
    "MEX": ("México", "Mexico", "Estados Unidos Mexicanos", "United Mexican States"),
    "USA": ("Estados Unidos", "United States", "Estados Unidos de América", "United States of America"),
    "CAN": ("Canadá", "Canada", "Canadá", "Canada"),
    "ESP": ("España", "Spain", "Reino de España", "Kingdom of Spain"),
    "ITA": ("Italia", "Italy", "República Italiana", "Italian Republic"),
    "PRT": ("Portugal", "Portugal", "República Portuguesa", "Portuguese Republic"),
    "DEU": ("Alemania", "Germany", "República Federal de Alemania", "Federal Republic of Germany"),
    "FRA": ("Francia", "France", "República Francesa", "French Republic"),
    "GBR": ("Reino Unido", "United Kingdom", "Reino Unido de Gran Bretaña e Irlanda del Norte",
            "United Kingdom of Great Britain and Northern Ireland"),
}


def build(topo, natural_earth):
    """Returns (topology with ids, world data). Pure: it does not touch the files."""
    topo = copy.deepcopy(topo)
    regions = []
    for geometry in topo["objects"]["regions"]["geometries"]:
        props = geometry["properties"]
        if "n" in props:
            code = region_code(props["c"], props["n"])
            regions.append({"code": code, "country": props["c"], "name": props["n"],
                            "provinces": sorted(props.get("p", []))})
        else:
            code = props["c"]
        geometry["id"] = code

    countries = []
    for code in sorted(topo["countries"]):
        countries.append(country_entry(code, natural_earth))

    regions.sort(key=lambda region: region["code"])
    expected = sorted(region_code(c, n) for c, names in REGION_ORDER.items() for n in names)
    if [region["code"] for region in regions] != expected:
        raise ValueError("The map regions do not match REGION_ORDER")
    return topo, {"countries": countries, "regions": regions}


def country_entry(code, natural_earth):
    if code in ACTIVE_NAMES:
        name_es, name_en, official_es, official_en = ACTIVE_NAMES[code]
        iso2 = natural_earth[code]["iso2"]
    elif code in natural_earth:
        source = natural_earth[code]
        name_es, name_en, iso2 = source["name_es"], source["name_en"], source["iso2"]
        official_es = official_en = None
    else:
        name_es, name_en, iso2 = EXTRA_TERRITORIES[code]
        official_es = official_en = None
    return {
        "code": code,
        "iso2": iso2,
        "name_es": name_es,
        "name_en": name_en,
        "official_name_es": official_es,
        "official_name_en": official_en,
        "color": COLORS.get(code),
        "active": code in ACTIVE,
    }


def main():
    topo_path = MAP_DIR / "world-regions.json"
    topo, world = build(
        json.loads(topo_path.read_text()),
        json.loads((MAP_DIR / "countries-natural-earth.json").read_text()),
    )
    topo_path.write_text(json.dumps(topo, ensure_ascii=False, separators=(",", ":")))
    (MAP_DIR / "world.json").write_text(json.dumps(world, ensure_ascii=False, indent=1) + "\n")
    print("countries:", len(world["countries"]), "regions:", len(world["regions"]))


if __name__ == "__main__":
    main()

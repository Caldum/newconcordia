"""Extracts the country codes and names Concordia needs from Natural Earth admin 0.

Usage: python3 -I extract_natural_earth.py <ne_50m_admin_0_countries.geojson> <output.json>
Source: nvkelso/natural-earth-vector, geojson/ne_50m_admin_0_countries.geojson (commit ca96624).
"""

import json
import sys


def extract(admin0):
    countries = {}
    for feature in admin0["features"]:
        props = feature["properties"]
        iso2 = props.get("ISO_A2_EH") or props.get("ISO_A2")
        entry = {
            "iso2": iso2 if iso2 and iso2 != "-99" else None,
            "name_en": props.get("NAME_EN") or props.get("NAME"),
            "name_es": props.get("NAME_ES") or props.get("NAME"),
        }
        for code in (props.get("ADM0_A3"), props.get("SOV_A3")):
            if code and code not in countries:
                countries[code] = entry
    return dict(sorted(countries.items()))


if __name__ == "__main__":
    source, output = sys.argv[1], sys.argv[2]
    with open(source, encoding="utf-8") as handle:
        result = extract(json.load(handle))
    with open(output, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    print("countries:", len(result))

"""Writes the migration that loads data/map/world.json into game.countries and game.regions.

Usage: python3 -I build_world_seed.py
Migrations are immutable once applied: later changes to the world go in a new migration.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORLD = ROOT / "data/map/world.json"
MIGRATION = ROOT / "supabase/migrations/20261009151037_world_data.sql"


def sql_text(value):
    return "null" if value is None else "'" + str(value).replace("'", "''") + "'"


def sql_array(values):
    return "array[" + ", ".join(sql_text(v) for v in values) + "]::text[]"


def render(world):
    lines = [
        "-- D03 · Reference data of the world, generated from data/map/world.json by",
        "-- data/map/scripts/build_world_seed.py. Do not edit: write a new migration to change the world.",
        "--",
        "-- Rollback: delete from game.regions; delete from game.countries;",
        "",
        "set local lock_timeout = '5s';",
        "set local statement_timeout = '60s';",
        "",
        "insert into game.countries",
        "  (code, iso2, name_es, name_en, official_name_es, official_name_en, color, is_active)",
        "values",
    ]
    rows = [
        "  (" + ", ".join([
            sql_text(c["code"]), sql_text(c["iso2"]), sql_text(c["name_es"]), sql_text(c["name_en"]),
            sql_text(c["official_name_es"]), sql_text(c["official_name_en"]), sql_text(c["color"]),
            "true" if c["active"] else "false",
        ]) + ")"
        for c in world["countries"]
    ]
    lines.append(",\n".join(rows) + ";")
    lines += [
        "",
        "insert into game.regions (code, home_country_code, owner_country_code, name, provinces)",
        "values",
    ]
    rows = [
        "  (" + ", ".join([
            sql_text(r["code"]), sql_text(r["country"]), sql_text(r["country"]), sql_text(r["name"]),
            sql_array(r["provinces"]),
        ]) + ")"
        for r in world["regions"]
    ]
    lines.append(",\n".join(rows) + ";")
    return "\n".join(lines) + "\n"


def main():
    MIGRATION.write_text(render(json.loads(WORLD.read_text())))
    print("wrote", MIGRATION.relative_to(ROOT))


if __name__ == "__main__":
    main()

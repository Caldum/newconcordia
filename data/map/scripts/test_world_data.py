"""Tests for the world data the game seeds and the map draws (run: python3 -I -m unittest discover)."""

import json
import re
import unittest
from collections import Counter
from pathlib import Path

import build_world_data
import regions_map

MAP_DIR = Path(__file__).resolve().parent.parent

# Regions per country, from the game design document (module 2).
EXPECTED_REGIONS = {
    "BRA": 12, "USA": 9, "MEX": 7, "ESP": 7, "ARG": 6, "CAN": 6, "FRA": 6,
    "CHL": 5, "ITA": 5, "DEU": 5, "GBR": 4, "PRY": 3, "PRT": 3,
}


class RegionCodesTest(unittest.TestCase):
    def test_thirteen_active_countries_with_seventy_eight_regions(self):
        self.assertEqual(set(regions_map.ACTIVE), set(EXPECTED_REGIONS))
        counts = {country: len(names) for country, names in regions_map.REGION_ORDER.items()}
        self.assertEqual(counts, EXPECTED_REGIONS)
        self.assertEqual(sum(counts.values()), 78)

    def test_codes_are_fixed_unique_and_well_formed(self):
        codes = [regions_map.region_code(c, n) for c, names in regions_map.REGION_ORDER.items() for n in names]
        self.assertEqual(len(set(codes)), 78)
        for code in codes:
            self.assertRegex(code, r"^[A-Z]{3}-\d{2}$")
        self.assertEqual(regions_map.region_code("ARG", "Buenos Aires"), "ARG-01")
        self.assertEqual(regions_map.region_code("ARG", "Cuyo"), "ARG-05")
        self.assertEqual(regions_map.region_code("GBR", "Irlanda del Norte"), "GBR-04")

    def test_unknown_region_has_no_code(self):
        with self.assertRaises(KeyError):
            regions_map.region_code("ARG", "Mendoza")

    def test_order_matches_the_province_grouping(self):
        grouped = {**regions_map.BY_NAME, **regions_map.BY_POSTAL, **regions_map.BY_REGION_FIELD}
        for country, names in regions_map.REGION_ORDER.items():
            if country in grouped:
                self.assertEqual(set(names), set(grouped[country]), country)


class WorldDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.topo = json.loads((MAP_DIR / "world-regions.json").read_text())
        cls.world = json.loads((MAP_DIR / "world.json").read_text())

    def test_world_json_is_in_sync_with_its_sources(self):
        rebuilt_topo, rebuilt_world = build_world_data.build(
            json.loads((MAP_DIR / "world-regions.json").read_text()),
            json.loads((MAP_DIR / "countries-natural-earth.json").read_text()),
        )
        self.assertEqual(rebuilt_world, self.world)
        self.assertEqual(rebuilt_topo, self.topo)

    def test_every_map_shape_carries_its_code(self):
        ids = [geometry["id"] for geometry in self.topo["objects"]["regions"]["geometries"]]
        self.assertEqual(len(ids), len(set(ids)))
        region_ids = [i for i in ids if "-" in i]
        self.assertEqual(len(region_ids), 78)
        for geometry in self.topo["objects"]["regions"]["geometries"]:
            props = geometry["properties"]
            expected = regions_map.region_code(props["c"], props["n"]) if "n" in props else props["c"]
            self.assertEqual(geometry["id"], expected)

    def test_countries_have_names_in_both_languages(self):
        countries = self.world["countries"]
        self.assertEqual(sum(1 for c in countries if c["active"]), 13)
        for country in countries:
            self.assertRegex(country["code"], r"^[A-Z]{3}$")
            self.assertTrue(country["name_es"], country["code"])
            self.assertTrue(country["name_en"], country["code"])
        by_code = {c["code"]: c for c in countries}
        self.assertEqual(by_code["ESP"]["name_es"], "España")
        self.assertEqual(by_code["ESP"]["name_en"], "Spain")
        self.assertEqual(by_code["ARG"]["color"], "#6CACE4")
        self.assertEqual(by_code["ARG"]["official_name_es"], "República Argentina")

    def test_regions_reference_active_countries(self):
        active = {c["code"] for c in self.world["countries"] if c["active"]}
        regions = self.world["regions"]
        self.assertEqual(len(regions), 78)
        self.assertEqual(Counter(r["country"] for r in regions), Counter(EXPECTED_REGIONS))
        self.assertTrue(all(r["country"] in active for r in regions))
        cuyo = next(r for r in regions if r["code"] == "ARG-05")
        self.assertEqual(cuyo["name"], "Cuyo")
        self.assertIn("Mendoza", cuyo["provinces"])


class WorldSeedTest(unittest.TestCase):
    def test_seed_migration_matches_world_json(self):
        import build_world_seed

        world = json.loads((MAP_DIR / "world.json").read_text())
        self.assertEqual(build_world_seed.MIGRATION.read_text(), build_world_seed.render(world))

    def test_quotes_are_escaped(self):
        import build_world_seed

        self.assertEqual(build_world_seed.sql_text("Côte d'Ivoire"), "'Côte d''Ivoire'")
        self.assertEqual(build_world_seed.sql_text(None), "null")


if __name__ == "__main__":
    unittest.main()

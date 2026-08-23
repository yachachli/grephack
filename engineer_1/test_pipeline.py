import json
import math
import unittest
from pathlib import Path

from engineer_1.pipeline import OUTPUT, run


class PipelineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = run()

    def load(self, name):
        return json.loads((Path(OUTPUT) / name).read_text(encoding="utf-8"))

    def test_expected_source_scale(self):
        counts = self.report["counts"]
        self.assertGreaterEqual(counts["subblocks"], 250)
        self.assertGreaterEqual(counts["parent_blocks"], 210)
        self.assertGreaterEqual(counts["harvest_events"], 150)
        self.assertGreaterEqual(counts["brix_observations"], 3000)
        self.assertGreaterEqual(counts["crop_estimate_observations"], 450)

    def test_status_master_acreage(self):
        acreage = self.report["coverage"]["managed_acres_from_status_master"]
        self.assertAlmostEqual(acreage, 6944.52, places=1)

    def test_ids_are_unique(self):
        for filename, key in (
            ("blocks.json", "subblock_id"),
            ("harvest_events.json", "event_id"),
            ("brix_observations.json", "observation_id"),
            ("crop_estimates.json", "observation_id"),
            ("harvest_plan.json", "plan_id"),
        ):
            records = self.load(filename)
            identifiers = [record[key] for record in records]
            self.assertEqual(len(identifiers), len(set(identifiers)), filename)

    def test_status_math_is_consistent(self):
        statuses = self.load("block_status.json")
        for status in statuses:
            tons = status["estimated_tons_remaining"]
            loads = status["estimated_loads_remaining"]
            if tons is not None and loads is not None:
                self.assertAlmostEqual(loads, tons / 23.5, places=2)
                self.assertEqual(status["required_trucks_one_trip"], math.ceil(loads))

    def test_backend_ready_candidates_have_required_fields(self):
        candidates = self.load("backend_block_candidates.json")
        for candidate in candidates:
            if candidate["apiReady"]:
                self.assertIsNotNone(candidate["estimatedTons"])
                self.assertIsNotNone(candidate["harvestWindowStart"])
                self.assertIsNotNone(candidate["harvestWindowEnd"])
                self.assertEqual(candidate["blockers"], [])


if __name__ == "__main__":
    unittest.main()

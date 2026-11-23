"""Card ids stay put across regenerations, and a shared id is retired."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

import generate_lessons as lessons


def activity(card_id, base_card_id, index):
    return {
        "cardId": card_id,
        "baseCardId": base_card_id,
        "activityIndex": index,
        "type": "multiple_choice",
    }


class CardIdStabilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.output = self.root / "lessons.json"
        self.legacy = self.root / "legacyCardIds.json"
        self.addCleanup(self.temp.cleanup)

    def stabilize(self, generated):
        return lessons.stabilize_card_ids(
            "cajun",
            generated,
            str(self.output),
            legacy_map_path=str(self.legacy),
        )

    def write_lessons(self, generated):
        self.output.write_text(
            json.dumps(generated, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def test_both_copies_of_a_repeated_id_are_renamed_and_mapped(self):
        shared = "cajun:u03_w0003:mc:step14"
        generated = [
            {"id": "cajun_u03_l01", "activities": [activity(shared, "cajun:u03_w0003:mc", 14)]},
            {"id": "cajun_u03_l02", "activities": [activity(shared, "cajun:u03_w0003:mc", 14)]},
            {"id": "cajun_u03_l03", "activities": [activity("cajun:kept:step01", "cajun:kept", 1)]},
        ]

        self.stabilize(generated)

        self.assertEqual(
            generated[0]["activities"][0]["cardId"],
            "cajun:u03_w0003:mc:step14::cajun_u03_l01",
        )
        self.assertEqual(
            generated[1]["activities"][0]["cardId"],
            "cajun:u03_w0003:mc:step14::cajun_u03_l02",
        )
        self.assertEqual(generated[2]["activities"][0]["cardId"], "cajun:kept:step01")
        legacy = json.loads(self.legacy.read_text(encoding="utf-8"))
        self.assertEqual(legacy["cajun"][shared], {
            "cajun_u03_l01": f"{shared}::cajun_u03_l01",
            "cajun_u03_l02": f"{shared}::cajun_u03_l02",
        })
        self.assertEqual(legacy["kreole"], {})

    def test_second_run_reuses_ids_for_the_same_lesson_step_and_base(self):
        shared = "cajun:u03_w0003:mc:step14"
        first = [
            {"id": "cajun_u03_l01", "activities": [activity(shared, "cajun:u03_w0003:mc", 14)]},
            {"id": "cajun_u03_l02", "activities": [activity(shared, "cajun:u03_w0003:mc", 14)]},
        ]
        self.stabilize(first)
        self.write_lessons(first)
        first_ids = [item["activities"][0]["cardId"] for item in first]

        # A fresh generation would emit the bare id again.
        second = [
            {"id": "cajun_u03_l01", "activities": [activity(shared, "cajun:u03_w0003:mc", 14)]},
            {"id": "cajun_u03_l02", "activities": [activity(shared, "cajun:u03_w0003:mc", 14)]},
        ]
        self.stabilize(second)

        self.assertEqual([item["activities"][0]["cardId"] for item in second], first_ids)
        self.assertEqual(second[0]["activities"][0]["baseCardId"], "cajun:u03_w0003:mc")

    def test_a_hand_set_id_survives_regeneration(self):
        existing = [{
            "id": "cajun_u01_l01",
            "activities": [activity("sentinel-id", "cajun:u01_w0001:intro", 1)],
        }]
        self.write_lessons(existing)
        generated = [{
            "id": "cajun_u01_l01",
            "activities": [activity("cajun:u01_w0001:intro:step01", "cajun:u01_w0001:intro", 1)],
        }]

        self.stabilize(generated)

        self.assertEqual(generated[0]["activities"][0]["cardId"], "sentinel-id")

    def test_a_retired_id_is_renamed_instead_of_reused(self):
        shared = "cajun:u03_w0003:mc:step14"
        self.legacy.write_text(json.dumps({
            "version": 1,
            "cajun": {
                shared: {
                    "cajun_u03_l01": f"{shared}::cajun_u03_l01",
                    "cajun_u03_l02": f"{shared}::cajun_u03_l02",
                }
            },
            "kreole": {},
        }), encoding="utf-8")
        generated = [{
            "id": "cajun_u03_l09",
            "activities": [activity(shared, "cajun:u03_w0003:mc", 3)],
        }]

        self.stabilize(generated)

        self.assertEqual(generated[0]["activities"][0]["cardId"], f"{shared}::cajun_u03_l09")
        legacy = json.loads(self.legacy.read_text(encoding="utf-8"))
        self.assertEqual(legacy["cajun"][shared]["cajun_u03_l09"], f"{shared}::cajun_u03_l09")

    def test_malformed_existing_lessons_are_not_overwritten(self):
        self.output.write_text("INVALID JSON", encoding="utf-8")
        generated = [{
            "id": "cajun_u01_l01",
            "activities": [activity("cajun:u01_w0001:intro:step01", "cajun:u01_w0001:intro", 1)],
        }]

        with self.assertRaises(json.JSONDecodeError):
            self.stabilize(generated)

        self.assertEqual(self.output.read_text(encoding="utf-8"), "INVALID JSON")


class GeneratorRunTests(unittest.TestCase):
    def test_two_runs_with_no_csv_change_keep_the_same_ids(self):
        root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, root)
        (root / "assets/audio/cajun").mkdir(parents=True)
        (root / "src/data").mkdir(parents=True)
        (root / "assets/audio/cajun/hello.mp3").touch()
        (root / "cajun.csv").write_text(textwrap.dedent("""\
            id,unit,english,variant_text,audioKey
            u01_w0001,u01,hello,bonjour,hello
        """), encoding="utf-8")
        script = Path(__file__).with_name("generate_lessons.py")
        code = (
            "import generate_lessons as lessons\n"
            "lessons.build_lessons('cajun', 'cajun.csv', 'src/data/cajunLessons.json')\n"
        )

        def card_ids():
            lessons_json = json.loads((root / "src/data/cajunLessons.json").read_text(encoding="utf-8"))
            return [
                activity["cardId"]
                for lesson in lessons_json
                for activity in lesson["activities"]
            ]

        env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONPATH": str(script.parent)}
        subprocess.run([sys.executable, "-c", code], cwd=root, env=env, check=True)
        first = card_ids()
        self.assertTrue(first)
        self.assertEqual(len(first), len(set(first)))

        # Prove reuse, not just a deterministic rebuild: pin one id.
        lessons_json = json.loads((root / "src/data/cajunLessons.json").read_text(encoding="utf-8"))
        lessons_json[0]["activities"][0]["cardId"] = "sentinel-id"
        (root / "src/data/cajunLessons.json").write_text(
            json.dumps(lessons_json, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        subprocess.run([sys.executable, "-c", code], cwd=root, env=env, check=True)
        second = card_ids()
        self.assertEqual(second[0], "sentinel-id")
        self.assertEqual(second[1:], first[1:])


if __name__ == "__main__":
    unittest.main()

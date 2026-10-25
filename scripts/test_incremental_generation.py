"""Regression tests for preserving existing lesson IDs as new audio arrives."""
import csv
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

import generate_lessons as lessons
import generate_audio_manifest as manifest


class IncrementalGenerationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.previous_dir = os.getcwd()
        os.chdir(self.temp.name)
        self.addCleanup(self._restore)
        Path("src/data").mkdir(parents=True)
        Path("assets/audio/cajun").mkdir(parents=True)
        Path("assets/audio/kreole").mkdir(parents=True)
        self.rows = [
            {"id": "u01_w0001", "unit": "u01", "english": "hello", "variant_text": "bonjour", "audioKey": "old_audio"},
            {"id": "u01_w0002", "unit": "u01", "english": "goodbye", "variant_text": "à la revoyure", "audioKey": "new_audio"},
            {"id": "u01_w0003", "unit": "u01", "english": "thank you", "variant_text": "merci", "audioKey": "later_audio"},
        ]
        self._write_csv("cajun", self.rows)
        self._write_csv("kreole", [
            {"id": "u01_w0001", "unit": "u01", "english": "hello", "variant_text": "bonjou", "audioKey": "kreole_audio"},
        ])
        Path("assets/audio/cajun/old_audio.mp3").touch()
        Path("assets/audio/kreole/kreole_audio.mp3").touch()
        self.original = [
            {
                "id": "cajun_u01_l01", "language": "cajun", "unit": "u01", "unitTitle": "Greetings",
                "lessonNumberInUnit": 1, "lessonTitle": "Part 1", "type": "core", "wordCount": 1,
                "words": [{"rowId": "u01_w0001", "english": "hello", "target": "bonjour", "audioKey": "old_audio"}],
                "activities": [{"cardId": "cajun:u01_w0001:intro:step01", "rowId": "u01_w0001", "type": "intro_card"}],
                "baseXp": 40,
            },
            {
                "id": "cajun_u01_review", "language": "cajun", "unit": "u01", "unitTitle": "Greetings",
                "lessonNumberInUnit": 2, "lessonTitle": "Review", "type": "review", "wordCount": 1,
                "words": [{"rowId": "u01_w0001", "english": "hello", "target": "bonjour", "audioKey": "old_audio"}],
                "activities": [{"cardId": "cajun:u01_w0001:typing:step01", "rowId": "u01_w0001", "type": "typing"}],
                "baseXp": 50,
            },
        ]
        Path("src/data/cajunLessons.json").write_text(json.dumps(self.original, ensure_ascii=False), encoding="utf-8")

    def _restore(self):
        os.chdir(self.previous_dir)
        self.temp.cleanup()

    def _write_csv(self, language, rows):
        with open(f"{language}.csv", "w", encoding="utf-8", newline="") as target:
            writer = csv.DictWriter(target, fieldnames=["id", "unit", "english", "variant_text", "audioKey"])
            writer.writeheader()
            writer.writerows(rows)

    def _run(self, dry_run=False):
        lessons.build_lessons("cajun", "cajun.csv", "src/data/cajunLessons.json", dry_run=dry_run)

    def _data(self):
        return json.loads(Path("src/data/cajunLessons.json").read_text(encoding="utf-8"))

    def _hash(self, path):
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()

    def test_no_mp3_means_no_lesson_changes_or_invalid_manifest_require(self):
        before = self._hash("src/data/cajunLessons.json")
        self._run()
        self.assertEqual(self._hash("src/data/cajunLessons.json"), before)
        manifest.main()
        body = Path("src/data/audioManifest.js").read_text(encoding="utf-8")
        self.assertIn("old_audio.mp3", body)
        self.assertIn("kreole_audio.mp3", body)
        self.assertNotIn("new_audio.mp3", body)
        self.assertNotIn("later_audio.mp3", body)

    def test_append_only_newly_recorded_words_keeps_older_ids_and_reviews(self):
        Path("assets/audio/cajun/new_audio.mp3").touch()
        before_records = {lesson["id"]: lesson for lesson in self.original}
        self._run()
        after = self._data()
        self.assertEqual(len(after), 4)
        self.assertEqual(after[:2], self.original)
        self.assertEqual(
            [record["id"] for record in after[2:]],
            ["cajun_u01_l02", "cajun_u01_review_add01"]
        )
        self.assertEqual([lesson["lessonNumberInUnit"] for lesson in after], [1, 2, 3, 4])
        self.assertEqual([word["rowId"] for word in after[2]["words"]], ["u01_w0002"])
        self.assertEqual([word["rowId"] for word in after[3]["words"]], ["u01_w0002"])
        self.assertTrue(after[2]["activities"])
        self.assertTrue(after[3]["activities"])
        self.assertEqual({k: next(l for l in after if l["id"] == k)
                          for k in before_records}, before_records)
        for lesson in after[2:]:
            self.assertEqual(len({a["cardId"] for a in lesson["activities"]}), len(lesson["activities"]))

        manifest.main()
        after_hashes = [self._hash("src/data/cajunLessons.json"), self._hash("src/data/audioManifest.js")]
        self._run()
        manifest.main()
        self.assertEqual(after_hashes, [self._hash("src/data/cajunLessons.json"), self._hash("src/data/audioManifest.js")])

        Path("assets/audio/cajun/later_audio.mp3").touch()
        self._run()
        updated = self._data()
        self.assertEqual(updated[:4], after)
        self.assertEqual([l["id"] for l in updated[4:]], ["cajun_u01_l03", "cajun_u01_review_add02"])
        self.assertEqual([w["rowId"] for w in updated[-2]["words"]], ["u01_w0003"])

    def test_dry_run_does_not_change_existing_lessons(self):
        Path("assets/audio/cajun/new_audio.mp3").touch()
        h = self._hash("src/data/cajunLessons.json")
        self._run(dry_run=True)
        self.assertEqual(self._hash("src/data/cajunLessons.json"), h)
        self.assertEqual(self._data(), self.original)

    def test_malformed_existing_lessons_are_not_overwritten(self):
        Path("assets/audio/cajun/new_audio.mp3").touch()
        Path("src/data/cajunLessons.json").write_text("INVALID JSON", encoding="utf-8")
        with self.assertRaises(json.JSONDecodeError):
            self._run()
        self.assertEqual(Path("src/data/cajunLessons.json").read_text(), "INVALID JSON")

    def test_manifest_retains_previously_used_audio_removed_from_csv(self):
        manifest.main()
        self.rows[0]["audioKey"] = ""
        self._write_csv("cajun", self.rows)
        manifest.main()
        self.assertIn("old_audio.mp3", Path("src/data/audioManifest.js").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()

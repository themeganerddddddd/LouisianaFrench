#!/usr/bin/env python3
import os
import random
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

import generate_lessons as gen


def word_row(
    row_id,
    english,
    target,
    extra_details="",
    context_badge="",
    english_alt_response="",
    variant_alt_response=""
):
    return {
        "id": row_id,
        "english": english,
        "variant_text": target,
        "audioKey": f"{row_id}_lf",
        "extra_details": extra_details,
        "context_badge": context_badge,
        "english_alt_response": english_alt_response,
        "variant_alt_response": variant_alt_response
    }


class SelectUniqueGlossRowsTests(unittest.TestCase):
    def test_keeps_one_row_per_english_gloss(self):
        rows = [
            word_row("w1", "they are", "ils sont"),
            word_row("w2", "they are", "eux-autres est"),
            word_row("w3", "They are cousins.", "Ils sont cousins."),
            word_row("w4", "They are Catholic.", "Eux-autres est catholiques."),
            word_row("w5", "hello", "bonjour")
        ]

        selected = gen.select_unique_gloss_rows(rows)

        self.assertEqual(
            [row["id"] for row in selected],
            ["w1", "w3", "w4", "w5"]
        )

    def test_skips_duplicate_targets(self):
        rows = [
            word_row("w1", "hello", "bonjour"),
            word_row("w2", "hi", "Bonjour"),
            word_row("w3", "thanks", "merci"),
            word_row("w4", "please", "s'il vous plaît"),
            word_row("w5", "goodbye", "au revoir")
        ]

        selected = gen.select_unique_gloss_rows(rows)

        self.assertEqual(
            [row["id"] for row in selected],
            ["w1", "w3", "w4", "w5"]
        )

    def test_fills_from_later_rows_after_preferred(self):
        preferred = [
            word_row("w1", "they are", "ils sont"),
            word_row("w2", "they are", "eux-autres est"),
            word_row("w3", "They are cousins.", "Ils sont cousins."),
            word_row("w4", "They are Catholic.", "Eux-autres est catholiques.")
        ]
        fill = [
            word_row("w5", "they have", "ils ont"),
            word_row("w6", "goodbye", "au revoir")
        ]

        selected = gen.select_unique_gloss_rows(
            preferred,
            fill
        )

        self.assertEqual(
            [row["id"] for row in selected],
            ["w1", "w3", "w4", "w5"]
        )

    def test_skips_duplicate_row_ids_in_fill(self):
        preferred = [
            word_row("w1", "hello", "bonjour"),
            word_row("w2", "thanks", "merci"),
            word_row("w3", "please", "s'il vous plaît"),
            word_row("w4", "goodbye", "au revoir")
        ]
        fill = [
            word_row("w1", "hello again", "salut")
        ]

        selected = gen.select_unique_gloss_rows(
            preferred,
            fill
        )

        self.assertEqual(
            [row["id"] for row in selected],
            ["w1", "w2", "w3", "w4"]
        )

    def test_returns_none_when_four_unique_glosses_cannot_be_formed(self):
        rows = [
            word_row("w1", "they are", "ils sont"),
            word_row("w2", "they are", "eux-autres est"),
            word_row("w3", "They are cousins.", "Ils sont cousins.")
        ]

        self.assertIsNone(
            gen.select_unique_gloss_rows(rows)
        )


class MakeMatchPairsTests(unittest.TestCase):
    def setUp(self):
        random.seed(0)

    def test_builds_four_unique_pairs_from_duplicate_english(self):
        preferred = [
            word_row("w1", "they are", "ils sont"),
            word_row("w2", "They Are", "eusse est"),
            word_row("w3", "They are cousins.", "Ils sont cousins."),
            word_row("w4", "They are Catholic.", "Eux-autres est catholiques.")
        ]
        fill = [
            word_row("u05_w0001", "I like it", "Ça me plaît")
        ]

        activity = gen.make_match_pairs(
            "cajun",
            preferred,
            fill
        )

        lefts = [pair["left"] for pair in activity["pairs"]]
        rights = [pair["right"] for pair in activity["pairs"]]

        self.assertEqual(len(activity["pairs"]), 4)
        self.assertEqual(len(set(left.casefold() for left in lefts)), 4)
        self.assertEqual(len(set(right.casefold() for right in rights)), 4)
        self.assertIn("I like it", lefts)
        self.assertNotIn("eusse est", rights)

    def test_returns_none_when_fill_cannot_complete_four_pairs(self):
        preferred = [
            word_row("w1", "they are", "ils sont"),
            word_row("w2", "they are", "eux-autres est")
        ]

        self.assertIsNone(
            gen.make_match_pairs(
                "cajun",
                preferred
            )
        )

    def test_attaches_metadata_from_selected_rows_only(self):
        preferred = [
            word_row("w1", "they are", "ils sont"),
            word_row("w2", "they are", "eux-autres est"),
            word_row("w3", "They are cousins.", "Ils sont cousins."),
            word_row("w4", "They are Catholic.", "Eux-autres est catholiques.")
        ]
        fill = [
            word_row(
                "u05_w0001",
                "I like it",
                "Ça me plaît",
                extra_details="Selected fill note"
            ),
            word_row(
                "u05_w0002",
                "unused fill",
                "pas utilisé",
                extra_details="Should not appear"
            )
        ]

        activity = gen.make_match_pairs(
            "cajun",
            preferred,
            fill
        )

        self.assertEqual(
            activity["extraDetails"],
            "Selected fill note"
        )


if __name__ == "__main__":
    unittest.main()

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


class SameMeaningLessonTests(unittest.TestCase):
    def setUp(self):
        random.seed(0)

    def test_isolates_configured_same_meaning_groups(self):
        rows = [
            word_row(f"u06_w{number:04d}", f"word {number}", f"mot {number}")
            for number in range(1, 18)
        ]

        rows[0]["english"] = "they are"
        rows[1]["english"] = "they are"
        rows[2]["english"] = "they are"
        rows[7]["english"] = "they have"
        rows[8]["english"] = "they have"
        rows[9]["english"] = "they have"
        rows[14]["english"] = "they want"
        rows[15]["english"] = "they want"
        rows[16]["english"] = "they want"

        chunks = gen.build_lesson_chunks(
            "cajun",
            "u06",
            rows,
            5
        )

        self.assertEqual(
            [[row["id"] for row in chunk] for chunk in chunks],
            [
                ["u06_w0001", "u06_w0002", "u06_w0003"],
                ["u06_w0004", "u06_w0005", "u06_w0006", "u06_w0007"],
                ["u06_w0008", "u06_w0009", "u06_w0010"],
                ["u06_w0011", "u06_w0012", "u06_w0013", "u06_w0014"],
                ["u06_w0015", "u06_w0016", "u06_w0017"],
            ]
        )

    def test_ambiguous_english_only_uses_listening_quizzes(self):
        rows = [
            word_row("u06_w0001", "they are", "ils sont"),
            word_row("u06_w0002", "they are", "eux-autres est"),
            word_row("u06_w0003", "they are", "eusse est"),
        ]
        unit_ctx = gen.build_unit_lookups(rows)

        self.assertEqual(
            gen.available_quiz_types_for_row(
                rows[0],
                False,
                unit_ctx
            ),
            ["listening_target"]
        )

    def test_select_multiple_accepts_all_same_meaning_forms(self):
        rows = [
            word_row("u06_w0001", "they are", "ils sont"),
            word_row("u06_w0002", "they are", "eux-autres est"),
            word_row("u06_w0003", "they are", "eusse est"),
            word_row("u06_w0004", "They are cousins.", "Ils sont cousins."),
        ]
        unit_ctx = gen.build_unit_lookups(rows)

        activity = gen.make_select_multiple(
            "cajun",
            rows[:3],
            unit_ctx
        )

        self.assertEqual(activity["type"], "select_multiple")
        self.assertEqual(
            set(activity["answers"]),
            {"ils sont", "eux-autres est", "eusse est"}
        )
        self.assertIn("Ils sont cousins.", activity["options"])


class SentenceBuilderTokenTests(unittest.TestCase):
    def test_keeps_contraction_as_one_word_and_drops_period(self):
        self.assertEqual(
            gen.tokenize_phrase("Ça c'est mon cousin."),
            ["Ça", "c'est", "mon", "cousin"]
        )

    def test_drops_comma_chip(self):
        self.assertEqual(
            gen.tokenize_phrase("Sô lamézon, li nouvo"),
            ["Sô", "lamézon", "li", "nouvo"]
        )

    def test_drops_exclamation_question_and_ellipsis(self):
        self.assertEqual(
            gen.tokenize_phrase("Ça va beaucoup bien!"),
            ["Ça", "va", "beaucoup", "bien"]
        )
        self.assertEqual(
            gen.tokenize_phrase(
                "Vous-autres est frère et sœur?"
            ),
            [
                "Vous-autres",
                "est",
                "frère",
                "et",
                "sœur"
            ]
        )
        self.assertEqual(
            gen.tokenize_phrase("Mon 'tit nom c’est…"),
            ["Mon", "'tit", "nom", "c’est"]
        )

    def test_keeps_hyphenated_form_as_one_chip(self):
        self.assertEqual(
            gen.tokenize_phrase("Vous-autres est frère"),
            ["Vous-autres", "est", "frère"]
        )

    def test_sentence_build_uses_space_split_tokens(self):
        row = word_row(
            "u02_w0009",
            "That’s my cousin.",
            "Ça c'est mon cousin."
        )

        activity = gen.make_sentence_build(
            "cajun",
            row
        )

        self.assertEqual(
            activity["words"],
            ["Ça", "c'est", "mon", "cousin"]
        )
        self.assertEqual(
            activity["answerTokens"],
            ["Ça", "c'est", "mon", "cousin"]
        )
        self.assertEqual(
            activity["answer"],
            "Ça c'est mon cousin."
        )


class SentenceBuilderEligibilityTests(unittest.TestCase):
    def test_does_not_build_sentences_shorter_than_four_words(self):
        row = word_row(
            "u01_w0001",
            "How are things?",
            "Comment les affaires?"
        )

        self.assertIsNone(
            gen.make_sentence_build(
                "cajun",
                row
            )
        )

    def test_allows_four_word_sentence_builder(self):
        row = word_row(
            "u01_w0002",
            "We are good friends.",
            "On est bons amis."
        )

        activity = gen.make_sentence_build(
            "cajun",
            row
        )

        self.assertIsNotNone(activity)
        self.assertEqual(
            activity["type"],
            "sentence_build"
        )


class LongSentenceTests(unittest.TestCase):
    def test_counts_hyphenated_terms_as_one_word(self):
        self.assertEqual(
            gen.count_phrase_words(
                "On veut parler avec nos grands-parents."
            ),
            6
        )

    def test_guarantees_sentence_builder_for_six_word_sentence(self):
        row = word_row(
            "u05_w0024",
            "We want to speak with our grandparents.",
            "On veut parler avec nos grands-parents."
        )
        activities = [
            gen.make_intro_card("cajun", row)
        ]

        result = gen.ensure_long_sentence_builders(
            "cajun",
            activities,
            [row]
        )

        self.assertTrue(
            any(
                activity["type"] == "sentence_build"
                and activity["rowId"] == "u05_w0024"
                for activity in result
            )
        )


class VariantAlternativeMetadataTests(unittest.TestCase):
    def test_alt_variant_text_alias_is_preserved_for_spelling_acceptance(self):
        row = word_row("w1", "to go", "alé")
        row.pop("variant_alt_response")
        row["alt_variant_text"] = "ale"

        activity = gen.make_typing("cajun", row)

        self.assertEqual(activity["variantAltResponse"], "ale")


if __name__ == "__main__":
    unittest.main()

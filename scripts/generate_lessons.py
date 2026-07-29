import csv
import json
import random
import re
from collections import defaultdict, deque

CAJUN_CSV = "cajun.csv"
KREOLE_CSV = "kreole.csv"

OUTPUT_CAJUN = "src/data/cajunLessons.json"
OUTPUT_KREOLE = "src/data/kreoleLessons.json"

LESSON_CHUNK_SIZE = 5
MAX_ACTIVITIES_PER_LESSON = 15
RANDOM_SEED = 42

# After a word is introduced, it must be quizzed within this many
# subsequent activities.
MAX_DISTANCE_AFTER_INTRO = 3

random.seed(RANDOM_SEED)

UNIT_TITLE_FALLBACKS = {
    "u01": "Greetings & Check-ins",
    "u02": "Names & Introductions",
    "u03": "To Be & To Have",
    "u04": "Wanting & Being Able",
    "u05": "Doing & Everyday Actions",
}

UNIT_TITLE_FALLBACKS_KREOLE = {
    "u01": "Pronouns & Greetings",
    "u02": "Check-ins & Well-being",
    "u03": "Names & Introductions",
    "u04": "Common Verbs",
    "u05": "Everyday Nouns",
}


def clean(value):
    return str(value or "").strip()


def tokenize_phrase(text):
    return re.findall(r"\w+|[^\w\s]", clean(text), flags=re.UNICODE)


def sort_rows_by_id(rows):
    def key_fn(row):
        row_id = clean(row.get("id"))
        match = re.match(r"u(\d+)_w(\d+)", row_id)
        if match:
            return (int(match.group(1)), int(match.group(2)))
        return (9999, row_id)
    return sorted(rows, key=key_fn)


def chunk_list(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]


def build_card_id(language, row_id, suffix):
    return f"{language}:{row_id}:{suffix}"


def lesson_part_name(chunk_rows, index):
    english_terms = [clean(r.get("english")) for r in chunk_rows if clean(r.get("english"))]
    english_terms = english_terms[:3]
    if not english_terms:
        return f"Part {index}"
    return f"Part {index} — {', '.join(english_terms)}"


def safe_sample(pool, correct, n=3):
    pool = [p for p in pool if p != correct]
    random.shuffle(pool)
    picked = pool[:n]
    picked.append(correct)
    random.shuffle(picked)
    return picked


def attach_row_metadata(activity, row):
    """Copy optional CSV display metadata onto generated activities."""
    extra_details = clean(row.get("extra_details", ""))
    context_badge = clean(row.get("context_badge", ""))
    english_alt_response = clean(row.get("english_alt_response", ""))
    variant_alt_response = clean(row.get("variant_alt_response", ""))

    if extra_details:
        activity["extraDetails"] = extra_details

    if context_badge:
        activity["contextBadge"] = context_badge

    if english_alt_response:
        activity["englishAltResponse"] = english_alt_response

    if variant_alt_response:
        activity["variantAltResponse"] = variant_alt_response

    return activity


def make_intro_card(language, row):
    row_id = clean(row.get("id"))
    english = clean(row.get("english"))
    target = clean(row.get("variant_text"))
    audio_key = clean(row.get("audioKey"))

    return attach_row_metadata({
        "cardId": build_card_id(language, row_id, "intro"),
        "rowId": row_id,
        "audioKey": audio_key or None,
        "type": "intro_card",
        "prompt": "Listen and learn",
        "english": english,
        "target": target,
        "answer": target,
        "answerDisplay": target
    }, row)


def build_unit_lookups(unit_rows):
    target_pool = [clean(r["variant_text"]) for r in unit_rows if clean(r["variant_text"])]
    english_pool = [clean(r["english"]) for r in unit_rows if clean(r["english"])]

    target_to_audio = {
        clean(r["variant_text"]): clean(r.get("audioKey")) or None
        for r in unit_rows
        if clean(r.get("variant_text"))
    }

    id_to_row = {
        clean(r.get("id")): r
        for r in unit_rows
        if clean(r.get("id"))
    }

    return {
        "target_pool": target_pool,
        "english_pool": english_pool,
        "target_to_audio": target_to_audio,
        "id_to_row": id_to_row,
    }


def make_multiple_choice(language, row, unit_ctx):
    row_id = clean(row.get("id"))
    english = clean(row.get("english"))
    target = clean(row.get("variant_text"))
    audio_key = clean(row.get("audioKey"))

    options = safe_sample(unit_ctx["target_pool"], target, 3)

    return attach_row_metadata({
        "cardId": build_card_id(language, row_id, "mc"),
        "rowId": row_id,
        "audioKey": audio_key or None,
        "type": "multiple_choice",
        "prompt": f"Choose the match for '{english}'",
        "options": options,
        "optionAudioMap": {opt: unit_ctx["target_to_audio"].get(opt) for opt in options},
        "answer": target,
        "answerDisplay": target,
        "english": english,
        "target": target
    }, row)


def make_listening_target(language, row, unit_ctx):
    row_id = clean(row.get("id"))
    english = clean(row.get("english"))
    target = clean(row.get("variant_text"))
    audio_key = clean(row.get("audioKey"))

    if not audio_key:
        return None

    options = safe_sample(unit_ctx["target_pool"], target, 3)

    return attach_row_metadata({
        "cardId": build_card_id(language, row_id, "listening_target"),
        "rowId": row_id,
        "audioKey": audio_key,
        "type": "listening_target_choice",
        "prompt": "Listen and choose the word",
        "options": options,
        "optionAudioMap": {opt: unit_ctx["target_to_audio"].get(opt) for opt in options},
        "answer": target,
        "answerDisplay": target,
        "english": english,
        "target": target
    }, row)


def make_typing(language, row):
    row_id = clean(row.get("id"))
    english = clean(row.get("english"))
    target = clean(row.get("variant_text"))
    audio_key = clean(row.get("audioKey"))

    return attach_row_metadata({
        "cardId": build_card_id(language, row_id, "typing"),
        "rowId": row_id,
        "audioKey": audio_key or None,
        "type": "typing",
        "prompt": f"Type: '{english}'",
        "answer": target,
        "answerDisplay": target,
        "english": english,
        "target": target
    }, row)


def make_sentence_build(language, row):
    row_id = clean(row.get("id"))
    english = clean(row.get("english"))
    target = clean(row.get("variant_text"))
    audio_key = clean(row.get("audioKey"))

    tokens = tokenize_phrase(target)
    if len(tokens) <= 1:
        return None

    return attach_row_metadata({
        "cardId": build_card_id(language, row_id, "build"),
        "rowId": row_id,
        "audioKey": audio_key or None,
        "type": "sentence_build",
        "prompt": f"Build: '{english}'",
        "words": tokens[:],
        "answerTokens": tokens[:],
        "answer": target,
        "answerDisplay": target,
        "english": english,
        "target": target
    }, row)


def make_match_pairs(language, rows):
    vocab_cards = []
    metadata_source_row = None

    for row in rows:
        row_id = clean(row.get("id"))
        english = clean(row.get("english"))
        target = clean(row.get("variant_text"))
        audio_key = clean(row.get("audioKey"))

        if not english or not target:
            continue

        if metadata_source_row is None and (
            clean(row.get("extra_details")) or
            clean(row.get("context_badge")) or
            clean(row.get("english_alt_response")) or
            clean(row.get("variant_alt_response"))
        ):
            metadata_source_row = row

        vocab_card = {
            "rowId": row_id,
            "english": english,
            "target": target,
            "audioKey": audio_key or None
        }

        extra_details = clean(row.get("extra_details", ""))
        context_badge = clean(row.get("context_badge", ""))
        english_alt_response = clean(row.get("english_alt_response", ""))
        variant_alt_response = clean(row.get("variant_alt_response", ""))

        if extra_details:
            vocab_card["extraDetails"] = extra_details
        if context_badge:
            vocab_card["contextBadge"] = context_badge
        if english_alt_response:
            vocab_card["englishAltResponse"] = english_alt_response
        if variant_alt_response:
            vocab_card["variantAltResponse"] = variant_alt_response

        vocab_cards.append(vocab_card)

    if len(vocab_cards) < 4:
        return None

    pair_cards = random.sample(vocab_cards, 4)

    activity = {
        "cardId": f"{language}:match:{pair_cards[0]['rowId']}",
        "type": "match_pairs",
        "prompt": "Match the words",
        "pairs": [
            {
                "left": c["english"],
                "right": c["target"],
                "audioKey": c["audioKey"]
            }
            for c in pair_cards
        ],
        "answer": "All matched",
        "answerDisplay": "All matched"
    }

    if metadata_source_row is not None:
        activity = attach_row_metadata(activity, metadata_source_row)

    return activity


def available_quiz_types_for_row(row, is_first_chunk):
    target = clean(row.get("variant_text"))
    audio_key = clean(row.get("audioKey"))
    tokens = tokenize_phrase(target)

    quiz_types = ["multiple_choice"]

    if audio_key:
        quiz_types.append("listening_target")

    if not is_first_chunk:
        quiz_types.append("typing")
        if len(tokens) > 1:
            quiz_types.append("sentence_build")

    return quiz_types


def make_activity_from_type(language, row, unit_ctx, quiz_type):
    if quiz_type == "multiple_choice":
        return make_multiple_choice(language, row, unit_ctx)
    if quiz_type == "listening_target":
        return make_listening_target(language, row, unit_ctx)
    if quiz_type == "typing":
        return make_typing(language, row)
    if quiz_type == "sentence_build":
        return make_sentence_build(language, row)
    return None


def schedule_core_activities(language, chunk_rows, prior_rows_in_unit, unit_rows, is_first_chunk):
    """
    Build a lesson flow that:
    - introduces each chunk word
    - quizzes that word within 3 following activities
    - mixes in older words from same chunk / same unit
    - adds matching once enough words are introduced
    """
    unit_ctx = build_unit_lookups(unit_rows)

    activities = []
    vocab_cards = []

    introduced_queue = deque()
    seen_in_this_lesson = []
    prior_pool = list(prior_rows_in_unit)

    for row in chunk_rows:
        row_id = clean(row.get("id"))
        english = clean(row.get("english"))
        target = clean(row.get("variant_text"))
        audio_key = clean(row.get("audioKey"))

        if not english or not target:
            continue

        vocab_cards.append(row_to_vocab_card(row))

        activities.append(make_intro_card(language, row))
        seen_in_this_lesson.append(row)

        intro_item = {
            "row": row,
            "remaining_window": MAX_DISTANCE_AFTER_INTRO,
            "quizzed": False,
        }
        introduced_queue.append(intro_item)

        for _ in range(2):
            if len(activities) >= MAX_ACTIVITIES_PER_LESSON:
                break

            forced = None
            for item in introduced_queue:
                if not item["quizzed"]:
                    forced = item
                    break

            candidate_rows = []
            if forced is not None:
                candidate_rows.append(forced["row"])

            older_current = [r for r in seen_in_this_lesson if clean(r.get("id")) != clean(forced["row"].get("id"))] if forced else seen_in_this_lesson[:]
            if older_current:
                candidate_rows.extend(random.sample(older_current, min(len(older_current), 2)))

            if prior_pool:
                candidate_rows.extend(random.sample(prior_pool, min(len(prior_pool), 2)))

            dedup = {}
            for r in candidate_rows:
                dedup[clean(r.get("id"))] = r
            candidate_rows = list(dedup.values())

            if not candidate_rows:
                continue

            chosen_row = None
            if forced is not None and (forced["remaining_window"] <= 1 or random.random() < 0.6):
                chosen_row = forced["row"]
            else:
                chosen_row = random.choice(candidate_rows)

            available_types = available_quiz_types_for_row(chosen_row, is_first_chunk)

            if forced is not None and clean(chosen_row.get("id")) == clean(forced["row"].get("id")):
                if "listening_target" in available_types and random.random() < 0.5:
                    quiz_type = "listening_target"
                else:
                    quiz_type = "multiple_choice"
            else:
                quiz_type = random.choice(available_types)

            activity = make_activity_from_type(language, chosen_row, unit_ctx, quiz_type)
            if activity:
                activities.append(activity)

                for item in introduced_queue:
                    if clean(item["row"].get("id")) == clean(chosen_row.get("id")) and not item["quizzed"]:
                        item["quizzed"] = True
                        break

            for item in introduced_queue:
                if not item["quizzed"]:
                    item["remaining_window"] -= 1

        if len(seen_in_this_lesson) >= 4 and len(activities) < MAX_ACTIVITIES_PER_LESSON:
            if not any(a.get("type") == "match_pairs" for a in activities):
                match_rows = seen_in_this_lesson[-4:]
                match_activity = make_match_pairs(language, match_rows)
                if match_activity:
                    activities.append(match_activity)

        if len(activities) >= MAX_ACTIVITIES_PER_LESSON:
            break

    mixed_pool = chunk_rows + prior_pool
    while len(activities) < MAX_ACTIVITIES_PER_LESSON and mixed_pool:
        chosen_row = random.choice(mixed_pool)
        available_types = available_quiz_types_for_row(chosen_row, is_first_chunk=False)
        quiz_type = random.choice(available_types)
        activity = make_activity_from_type(language, chosen_row, unit_ctx, quiz_type)
        if activity:
            activities.append(activity)

        if len(activities) < MAX_ACTIVITIES_PER_LESSON and len(mixed_pool) >= 4:
            if not any(a.get("type") == "match_pairs" for a in activities) and random.random() < 0.25:
                match_rows = random.sample(mixed_pool, min(4, len(mixed_pool)))
                match_activity = make_match_pairs(language, match_rows)
                if match_activity:
                    activities.append(match_activity)

    return activities[:MAX_ACTIVITIES_PER_LESSON], vocab_cards


def make_review_activities(language, unit_rows):
    unit_ctx = build_unit_lookups(unit_rows)

    review_activities = []
    review_rows = sort_rows_by_id(unit_rows)

    candidate_rows = [r for r in review_rows if clean(r.get("english")) and clean(r.get("variant_text"))]
    random.shuffle(candidate_rows)

    for row in candidate_rows:
        if len(review_activities) >= MAX_ACTIVITIES_PER_LESSON:
            break

        quiz_types = ["multiple_choice"]
        if clean(row.get("audioKey")):
            quiz_types.append("listening_target")

        quiz_type = random.choice(quiz_types)
        activity = make_activity_from_type(language, row, unit_ctx, quiz_type)
        if activity:
            review_activities.append(activity)

    if len(candidate_rows) >= 4 and not any(a.get("type") == "match_pairs" for a in review_activities):
        match_activity = make_match_pairs(language, candidate_rows[:4])
        if match_activity and len(review_activities) < MAX_ACTIVITIES_PER_LESSON:
            review_activities.append(match_activity)

    return review_activities[:MAX_ACTIVITIES_PER_LESSON]


def row_to_vocab_card(row):
    card = {
        "rowId": clean(row.get("id")),
        "english": clean(row.get("english")),
        "target": clean(row.get("variant_text")),
        "audioKey": clean(row.get("audioKey")) or None
    }

    extra_details = clean(row.get("extra_details", ""))
    context_badge = clean(row.get("context_badge", ""))
    english_alt_response = clean(row.get("english_alt_response", ""))
    variant_alt_response = clean(row.get("variant_alt_response", ""))

    if extra_details:
        card["extraDetails"] = extra_details

    if context_badge:
        card["contextBadge"] = context_badge

    if english_alt_response:
        card["englishAltResponse"] = english_alt_response

    if variant_alt_response:
        card["variantAltResponse"] = variant_alt_response

    return card


def build_lessons(language, csv_path, output_path):
    grouped = defaultdict(list)

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            unit = clean(row.get("unit"))
            if not unit:
                continue
            grouped[unit].append(row)

    ordered_units = sorted(grouped.keys())
    all_lessons = []

    title_map = UNIT_TITLE_FALLBACKS if language == "cajun" else UNIT_TITLE_FALLBACKS_KREOLE

    for unit in ordered_units:
        unit_rows = sort_rows_by_id(grouped[unit])
        unit_title = title_map.get(unit, f"Unit {unit.replace('u', '')}")
        unit_chunks = chunk_list(unit_rows, LESSON_CHUNK_SIZE)

        prior_rows_in_unit = []

        for chunk_index, chunk_rows in enumerate(unit_chunks, start=1):
            is_first_chunk = chunk_index == 1

            activities, vocab_cards = schedule_core_activities(
                language=language,
                chunk_rows=chunk_rows,
                prior_rows_in_unit=prior_rows_in_unit,
                unit_rows=unit_rows,
                is_first_chunk=is_first_chunk
            )

            lesson_id = f"{language}_{unit}_l{str(chunk_index).zfill(2)}"
            lesson_title = lesson_part_name(chunk_rows, chunk_index)

            all_lessons.append({
                "id": lesson_id,
                "language": language,
                "unit": unit,
                "unitTitle": unit_title,
                "lessonNumberInUnit": chunk_index,
                "lessonTitle": lesson_title,
                "type": "core",
                "wordCount": len(vocab_cards),
                "words": vocab_cards,
                "activities": activities,
                "baseXp": 40
            })

            prior_rows_in_unit.extend(chunk_rows)

        review_id = f"{language}_{unit}_review"
        all_lessons.append({
            "id": review_id,
            "language": language,
            "unit": unit,
            "unitTitle": unit_title,
            "lessonNumberInUnit": len(unit_chunks) + 1,
            "lessonTitle": "Review",
            "type": "review",
            "wordCount": len(unit_rows),
            "words": [
                row_to_vocab_card(r)
                for r in unit_rows
                if clean(r.get("english")) and clean(r.get("variant_text"))
            ],
            "activities": make_review_activities(language, unit_rows),
            "baseXp": 50
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_lessons, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(all_lessons)} lessons to {output_path}")


if __name__ == "__main__":
    build_lessons("cajun", CAJUN_CSV, OUTPUT_CAJUN)
    build_lessons("kreole", KREOLE_CSV, OUTPUT_KREOLE)
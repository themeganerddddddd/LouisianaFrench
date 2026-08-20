import csv
import json
import os
import random
import re
from collections import defaultdict, deque

CAJUN_CSV = "cajun.csv"
KREOLE_CSV = "kreole.csv"

OUTPUT_CAJUN = "src/data/cajunLessons.json"
OUTPUT_KREOLE = "src/data/kreoleLessons.json"

AUDIO_DIRS = {
    "cajun": "assets/audio/cajun",
    "kreole": "assets/audio/kreole",
}

DEFAULT_LESSON_CHUNK_SIZE = 5
KREOLE_LESSON_CHUNK_SIZE = 6
MAX_ACTIVITIES_PER_LESSON = 15
RANDOM_SEED = 42

# After a word is introduced, it must be quizzed within this many
# subsequent activities.
MAX_DISTANCE_AFTER_INTRO = 3

random.seed(RANDOM_SEED)

UNIT_TITLE_FALLBACKS = {
    "u01": "Greetings & Goodbyes",
    "u02": "Family & Where You’re From",
    "u03": "Describing People",
    "u04": "Needs & Feelings",
    "u05": "Likes, Wants & Activities",
    "u06": "Talking About Others",
    "u07": "Daily Life & Weather",
}

UNIT_TITLE_FALLBACKS_KREOLE = {
    "u01": "Greetings & Check-ins",
    "u02": "Pronouns & People",
    "u03": "Common Verbs",
    "u04": "Descriptions & Everyday Words",
    "u05": "School & Simple Questions",
    "u06": "Question Words",
    "u07": "Needs, Abilities & Actions",
    "u08": "Possessives",
    "u09": "Object Pronouns",
    "u10": "Family, People & Pets",
    "u11": "This, That & the Weather",
}


def clean(value):
    return str(value or "").strip()


def row_has_playable_audio(row, language):
    """
    Only allow a CSV row into generated lessons when:
    1. it has an audioKey, and
    2. the matching MP3 actually exists on disk.
    """
    audio_key = clean(row.get("audioKey"))

    if not audio_key:
        return False

    audio_path = os.path.join(
        AUDIO_DIRS[language],
        f"{audio_key}.mp3"
    )

    return os.path.isfile(audio_path)


def get_lesson_chunk_size(language):
    if language == "kreole":
        return KREOLE_LESSON_CHUNK_SIZE

    return DEFAULT_LESSON_CHUNK_SIZE


def tokenize_phrase(text):
    return re.findall(
        r"\w+|[^\w\s]",
        clean(text),
        flags=re.UNICODE
    )


def sort_rows_by_id(rows):
    def key_fn(row):
        row_id = clean(row.get("id"))
        match = re.match(r"u(\d+)_w(\d+)", row_id)

        if match:
            return (
                int(match.group(1)),
                int(match.group(2))
            )

        return (9999, row_id)

    return sorted(rows, key=key_fn)


def chunk_list(items, size):
    return [
        items[i:i + size]
        for i in range(0, len(items), size)
    ]


def build_card_id(language, row_id, suffix):
    return f"{language}:{row_id}:{suffix}"


def activity_row_id(activity):
    return clean(
        (activity or {}).get("rowId")
    )


def activity_type(activity):
    return clean(
        (activity or {}).get("type")
    )


def finalize_lesson_activity_ids(
    lesson_id,
    activities
):
    """
    Give every activity a unique cardId inside the lesson.

    This prevents React from reusing previous question state
    when the same word/type appears again later in the lesson.
    """

    finalized = []

    for index, activity in enumerate(
        activities,
        start=1
    ):
        if not activity:
            continue

        cloned = dict(activity)

        base_card_id = (
            clean(cloned.get("cardId"))
            or f"{lesson_id}:activity"
        )

        cloned["baseCardId"] = base_card_id

        cloned["cardId"] = (
            f"{base_card_id}:"
            f"step{str(index).zfill(2)}"
        )

        cloned["activityIndex"] = index

        finalized.append(cloned)

    return finalized


def lesson_part_name(
    chunk_rows,
    index
):
    english_terms = [
        clean(r.get("english"))
        for r in chunk_rows
        if clean(r.get("english"))
    ]

    english_terms = english_terms[:3]

    if not english_terms:
        return f"Part {index}"

    return (
        f"Part {index} — "
        f"{', '.join(english_terms)}"
    )


def safe_sample(
    pool,
    correct,
    n=3
):
    pool = [
        p
        for p in pool
        if p != correct
    ]

    random.shuffle(pool)

    picked = pool[:n]

    picked.append(correct)

    random.shuffle(picked)

    return picked


def attach_row_metadata(
    activity,
    row
):
    """
    Copy optional CSV display metadata
    onto generated activities.
    """

    extra_details = clean(
        row.get("extra_details", "")
    )

    context_badge = clean(
        row.get("context_badge", "")
    )

    english_alt_response = clean(
        row.get("english_alt_response", "")
    )

    variant_alt_response = clean(
        row.get("variant_alt_response", "")
    )

    if extra_details:
        activity["extraDetails"] = (
            extra_details
        )

    if context_badge:
        activity["contextBadge"] = (
            context_badge
        )

    if english_alt_response:
        activity["englishAltResponse"] = (
            english_alt_response
        )

    if variant_alt_response:
        activity["variantAltResponse"] = (
            variant_alt_response
        )

    return activity


def make_intro_card(
    language,
    row
):
    row_id = clean(
        row.get("id")
    )

    english = clean(
        row.get("english")
    )

    target = clean(
        row.get("variant_text")
    )

    audio_key = clean(
        row.get("audioKey")
    )

    return attach_row_metadata(
        {
            "cardId": build_card_id(
                language,
                row_id,
                "intro"
            ),
            "rowId": row_id,
            "audioKey": (
                audio_key or None
            ),
            "type": "intro_card",
            "prompt": "Listen and learn",
            "english": english,
            "target": target,
            "answer": target,
            "answerDisplay": target
        },
        row
    )


def build_unit_lookups(unit_rows):
    target_pool = [
        clean(r["variant_text"])
        for r in unit_rows
        if clean(r["variant_text"])
    ]

    english_pool = [
        clean(r["english"])
        for r in unit_rows
        if clean(r["english"])
    ]

    target_to_audio = {
        clean(r["variant_text"]):
        clean(r.get("audioKey")) or None

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


def make_multiple_choice(
    language,
    row,
    unit_ctx
):
    row_id = clean(
        row.get("id")
    )

    english = clean(
        row.get("english")
    )

    target = clean(
        row.get("variant_text")
    )

    audio_key = clean(
        row.get("audioKey")
    )

    options = safe_sample(
        unit_ctx["target_pool"],
        target,
        3
    )

    return attach_row_metadata(
        {
            "cardId": build_card_id(
                language,
                row_id,
                "mc"
            ),
            "rowId": row_id,
            "audioKey": (
                audio_key or None
            ),
            "type": "multiple_choice",
            "prompt": (
                f"Choose the match for "
                f"'{english}'"
            ),
            "options": options,
            "optionAudioMap": {
                opt:
                unit_ctx[
                    "target_to_audio"
                ].get(opt)

                for opt in options
            },
            "answer": target,
            "answerDisplay": target,
            "english": english,
            "target": target
        },
        row
    )


def make_listening_target(
    language,
    row,
    unit_ctx
):
    row_id = clean(
        row.get("id")
    )

    english = clean(
        row.get("english")
    )

    target = clean(
        row.get("variant_text")
    )

    audio_key = clean(
        row.get("audioKey")
    )

    if not audio_key:
        return None

    options = safe_sample(
        unit_ctx["target_pool"],
        target,
        3
    )

    return attach_row_metadata(
        {
            "cardId": build_card_id(
                language,
                row_id,
                "listening_target"
            ),
            "rowId": row_id,
            "audioKey": audio_key,
            "type": (
                "listening_target_choice"
            ),
            "prompt": (
                "Listen and choose the word"
            ),
            "options": options,
            "optionAudioMap": {
                opt:
                unit_ctx[
                    "target_to_audio"
                ].get(opt)

                for opt in options
            },
            "answer": target,
            "answerDisplay": target,
            "english": english,
            "target": target
        },
        row
    )


def make_typing(
    language,
    row
):
    row_id = clean(
        row.get("id")
    )

    english = clean(
        row.get("english")
    )

    target = clean(
        row.get("variant_text")
    )

    audio_key = clean(
        row.get("audioKey")
    )

    return attach_row_metadata(
        {
            "cardId": build_card_id(
                language,
                row_id,
                "typing"
            ),
            "rowId": row_id,
            "audioKey": (
                audio_key or None
            ),
            "type": "typing",
            "prompt": (
                f"Type: '{english}'"
            ),
            "answer": target,
            "answerDisplay": target,
            "english": english,
            "target": target
        },
        row
    )


def make_sentence_build(
    language,
    row
):
    row_id = clean(
        row.get("id")
    )

    english = clean(
        row.get("english")
    )

    target = clean(
        row.get("variant_text")
    )

    audio_key = clean(
        row.get("audioKey")
    )

    tokens = tokenize_phrase(target)

    if len(tokens) <= 1:
        return None

    return attach_row_metadata(
        {
            "cardId": build_card_id(
                language,
                row_id,
                "build"
            ),
            "rowId": row_id,
            "audioKey": (
                audio_key or None
            ),
            "type": "sentence_build",
            "prompt": (
                f"Build: '{english}'"
            ),
            "words": tokens[:],
            "answerTokens": tokens[:],
            "answer": target,
            "answerDisplay": target,
            "english": english,
            "target": target
        },
        row
    )


def make_match_pairs(
    language,
    rows
):
    vocab_cards = []

    metadata_source_row = None

    for row in rows:
        row_id = clean(
            row.get("id")
        )

        english = clean(
            row.get("english")
        )

        target = clean(
            row.get("variant_text")
        )

        audio_key = clean(
            row.get("audioKey")
        )

        if not english or not target:
            continue

        if (
            metadata_source_row is None
            and (
                clean(
                    row.get(
                        "extra_details"
                    )
                )
                or clean(
                    row.get(
                        "context_badge"
                    )
                )
                or clean(
                    row.get(
                        "english_alt_response"
                    )
                )
                or clean(
                    row.get(
                        "variant_alt_response"
                    )
                )
            )
        ):
            metadata_source_row = row

        vocab_card = {
            "rowId": row_id,
            "english": english,
            "target": target,
            "audioKey": (
                audio_key or None
            )
        }

        extra_details = clean(
            row.get(
                "extra_details",
                ""
            )
        )

        context_badge = clean(
            row.get(
                "context_badge",
                ""
            )
        )

        english_alt_response = clean(
            row.get(
                "english_alt_response",
                ""
            )
        )

        variant_alt_response = clean(
            row.get(
                "variant_alt_response",
                ""
            )
        )

        if extra_details:
            vocab_card[
                "extraDetails"
            ] = extra_details

        if context_badge:
            vocab_card[
                "contextBadge"
            ] = context_badge

        if english_alt_response:
            vocab_card[
                "englishAltResponse"
            ] = english_alt_response

        if variant_alt_response:
            vocab_card[
                "variantAltResponse"
            ] = variant_alt_response

        vocab_cards.append(
            vocab_card
        )

    if len(vocab_cards) < 4:
        return None

    pair_cards = random.sample(
        vocab_cards,
        4
    )

    activity = {
        "cardId": (
            f"{language}:match:"
            f"{pair_cards[0]['rowId']}"
        ),
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
        activity = attach_row_metadata(
            activity,
            metadata_source_row
        )

    return activity


def available_quiz_types_for_row(
    row,
    is_first_chunk
):
    target = clean(
        row.get("variant_text")
    )

    audio_key = clean(
        row.get("audioKey")
    )

    tokens = tokenize_phrase(target)

    quiz_types = [
        "multiple_choice"
    ]

    if audio_key:
        quiz_types.append(
            "listening_target"
        )

    if not is_first_chunk:
        quiz_types.append(
            "typing"
        )

        if len(tokens) > 1:
            quiz_types.append(
                "sentence_build"
            )

    return quiz_types


def make_activity_from_type(
    language,
    row,
    unit_ctx,
    quiz_type
):
    if quiz_type == "multiple_choice":
        return make_multiple_choice(
            language,
            row,
            unit_ctx
        )

    if quiz_type == "listening_target":
        return make_listening_target(
            language,
            row,
            unit_ctx
        )

    if quiz_type == "typing":
        return make_typing(
            language,
            row
        )

    if quiz_type == "sentence_build":
        return make_sentence_build(
            language,
            row
        )

    return None


def schedule_core_activities(
    language,
    chunk_rows,
    prior_rows_in_unit,
    unit_rows,
    is_first_chunk
):
    """
    Build a lesson flow that:

    - introduces each chunk word
    - quizzes that word soon after introduction
    - avoids putting the same word question back-to-back
    - mixes in older words from the same lesson / same unit
    - adds matching once enough words are introduced
    """

    unit_ctx = build_unit_lookups(
        unit_rows
    )

    activities = []
    vocab_cards = []

    introduced_queue = deque()

    seen_in_this_lesson = []

    prior_pool = list(
        prior_rows_in_unit
    )

    def dedupe_rows(rows):
        deduped = {}

        for candidate in rows:
            row_id = clean(
                candidate.get("id")
            )

            if not row_id:
                continue

            if (
                not clean(
                    candidate.get(
                        "english"
                    )
                )
                or not clean(
                    candidate.get(
                        "variant_text"
                    )
                )
            ):
                continue

            deduped[
                row_id
            ] = candidate

        return list(
            deduped.values()
        )

    def make_non_repeating_quiz(
        candidate_rows,
        first_chunk_mode,
        preferred_row=None
    ):
        rows = dedupe_rows(
            candidate_rows
        )

        if not rows:
            return None, None

        last_activity = (
            activities[-1]
            if activities
            else None
        )

        last_row_id = (
            activity_row_id(
                last_activity
            )
        )

        last_type = (
            activity_type(
                last_activity
            )
        )

        # It is okay to quiz the same row
        # immediately after an intro card.
        #
        # It is not okay to quiz the same row
        # immediately after another quiz.

        if (
            last_activity
            and last_type != "intro_card"
        ):
            non_repeating_rows = [
                row

                for row in rows

                if clean(
                    row.get("id")
                ) != last_row_id
            ]

            if non_repeating_rows:
                rows = (
                    non_repeating_rows
                )
            else:
                return None, None

        chosen_row = None

        if preferred_row is not None:
            preferred_id = clean(
                preferred_row.get("id")
            )

            matching_preferred_rows = [
                row

                for row in rows

                if clean(
                    row.get("id")
                ) == preferred_id
            ]

            if (
                matching_preferred_rows
                and random.random() < 0.7
            ):
                chosen_row = (
                    matching_preferred_rows[0]
                )

        if chosen_row is None:
            chosen_row = random.choice(
                rows
            )

        available_types = (
            available_quiz_types_for_row(
                chosen_row,
                first_chunk_mode
            )
        )

        # If the last activity somehow
        # has the same row, avoid repeating
        # the same exact question type too.

        if (
            clean(
                chosen_row.get("id")
            ) == last_row_id
        ):
            available_types = [
                quiz_type

                for quiz_type
                in available_types

                if quiz_type != last_type
            ]

        if not available_types:
            return None, None

        quiz_type = random.choice(
            available_types
        )

        activity = (
            make_activity_from_type(
                language,
                chosen_row,
                unit_ctx,
                quiz_type
            )
        )

        return (
            activity,
            chosen_row
        )

    for row in chunk_rows:
        english = clean(
            row.get("english")
        )

        target = clean(
            row.get("variant_text")
        )

        if not english or not target:
            continue

        vocab_cards.append(
            row_to_vocab_card(row)
        )

        activities.append(
            make_intro_card(
                language,
                row
            )
        )

        seen_in_this_lesson.append(
            row
        )

        intro_item = {
            "row": row,
            "remaining_window":
                MAX_DISTANCE_AFTER_INTRO,
            "quizzed": False,
        }

        introduced_queue.append(
            intro_item
        )

        for _ in range(2):
            if (
                len(activities)
                >= MAX_ACTIVITIES_PER_LESSON
            ):
                break

            forced = None

            for item in introduced_queue:
                if not item["quizzed"]:
                    forced = item
                    break

            candidate_rows = []

            if forced is not None:
                candidate_rows.append(
                    forced["row"]
                )

            if forced is not None:
                older_current = [
                    r

                    for r
                    in seen_in_this_lesson

                    if clean(
                        r.get("id")
                    )
                    != clean(
                        forced[
                            "row"
                        ].get("id")
                    )
                ]

            else:
                older_current = (
                    seen_in_this_lesson[:]
                )

            if older_current:
                candidate_rows.extend(
                    random.sample(
                        older_current,
                        min(
                            len(
                                older_current
                            ),
                            2
                        )
                    )
                )

            if prior_pool:
                candidate_rows.extend(
                    random.sample(
                        prior_pool,
                        min(
                            len(
                                prior_pool
                            ),
                            2
                        )
                    )
                )

            activity, chosen_row = (
                make_non_repeating_quiz(
                    candidate_rows=(
                        candidate_rows
                    ),
                    first_chunk_mode=(
                        is_first_chunk
                    ),
                    preferred_row=(
                        forced["row"]
                        if forced
                        is not None
                        else None
                    )
                )
            )

            # If the only possible next
            # question would be the exact
            # same word again, skip it and
            # introduce the next word.

            if (
                not activity
                or not chosen_row
            ):
                break

            activities.append(
                activity
            )

            for item in introduced_queue:
                if (
                    clean(
                        item[
                            "row"
                        ].get("id")
                    )
                    == clean(
                        chosen_row.get(
                            "id"
                        )
                    )
                    and not item[
                        "quizzed"
                    ]
                ):
                    item[
                        "quizzed"
                    ] = True

                    break

            for item in introduced_queue:
                if not item["quizzed"]:
                    item[
                        "remaining_window"
                    ] -= 1

        if (
            len(
                seen_in_this_lesson
            ) >= 4
            and len(
                activities
            ) < MAX_ACTIVITIES_PER_LESSON
        ):
            if not any(
                a.get("type")
                == "match_pairs"

                for a in activities
            ):
                match_rows = (
                    seen_in_this_lesson[
                        -4:
                    ]
                )

                match_activity = (
                    make_match_pairs(
                        language,
                        match_rows
                    )
                )

                if match_activity:
                    activities.append(
                        match_activity
                    )

        if (
            len(activities)
            >= MAX_ACTIVITIES_PER_LESSON
        ):
            break

    mixed_pool = (
        chunk_rows
        + prior_pool
    )

    attempts = 0

    while (
        len(activities)
        < MAX_ACTIVITIES_PER_LESSON
        and mixed_pool
        and attempts < 60
    ):
        attempts += 1

        activity, chosen_row = (
            make_non_repeating_quiz(
                candidate_rows=(
                    mixed_pool
                ),
                first_chunk_mode=False
            )
        )

        if not activity:
            break

        activities.append(
            activity
        )

        if (
            len(activities)
            < MAX_ACTIVITIES_PER_LESSON
            and len(mixed_pool) >= 4
        ):
            if (
                not any(
                    a.get("type")
                    == "match_pairs"

                    for a in activities
                )
                and random.random()
                < 0.25
            ):
                match_rows = (
                    random.sample(
                        mixed_pool,
                        min(
                            4,
                            len(
                                mixed_pool
                            )
                        )
                    )
                )

                match_activity = (
                    make_match_pairs(
                        language,
                        match_rows
                    )
                )

                if match_activity:
                    activities.append(
                        match_activity
                    )

    return (
        activities[
            :MAX_ACTIVITIES_PER_LESSON
        ],
        vocab_cards
    )


def make_review_activities(
    language,
    unit_rows
):
    unit_ctx = build_unit_lookups(
        unit_rows
    )

    review_activities = []

    review_rows = sort_rows_by_id(
        unit_rows
    )

    candidate_rows = [
        r

        for r in review_rows

        if (
            clean(
                r.get("english")
            )
            and clean(
                r.get("variant_text")
            )
        )
    ]

    random.shuffle(
        candidate_rows
    )

    last_row_id = ""

    for row in candidate_rows:
        if (
            len(review_activities)
            >= MAX_ACTIVITIES_PER_LESSON
        ):
            break

        row_id = clean(
            row.get("id")
        )

        if (
            row_id
            and row_id == last_row_id
        ):
            continue

        quiz_types = [
            "multiple_choice"
        ]

        if clean(
            row.get("audioKey")
        ):
            quiz_types.append(
                "listening_target"
            )

        quiz_type = random.choice(
            quiz_types
        )

        activity = (
            make_activity_from_type(
                language,
                row,
                unit_ctx,
                quiz_type
            )
        )

        if activity:
            review_activities.append(
                activity
            )

            last_row_id = row_id

    if (
        len(candidate_rows) >= 4
        and not any(
            a.get("type")
            == "match_pairs"

            for a in review_activities
        )
    ):
        match_activity = (
            make_match_pairs(
                language,
                candidate_rows[:4]
            )
        )

        if (
            match_activity
            and len(
                review_activities
            )
            < MAX_ACTIVITIES_PER_LESSON
        ):
            review_activities.append(
                match_activity
            )

    return review_activities[
        :MAX_ACTIVITIES_PER_LESSON
    ]


def row_to_vocab_card(row):
    card = {
        "rowId": clean(
            row.get("id")
        ),
        "english": clean(
            row.get("english")
        ),
        "target": clean(
            row.get("variant_text")
        ),
        "audioKey": (
            clean(
                row.get("audioKey")
            )
            or None
        )
    }

    extra_details = clean(
        row.get(
            "extra_details",
            ""
        )
    )

    context_badge = clean(
        row.get(
            "context_badge",
            ""
        )
    )

    english_alt_response = clean(
        row.get(
            "english_alt_response",
            ""
        )
    )

    variant_alt_response = clean(
        row.get(
            "variant_alt_response",
            ""
        )
    )

    if extra_details:
        card[
            "extraDetails"
        ] = extra_details

    if context_badge:
        card[
            "contextBadge"
        ] = context_badge

    if english_alt_response:
        card[
            "englishAltResponse"
        ] = english_alt_response

    if variant_alt_response:
        card[
            "variantAltResponse"
        ] = variant_alt_response

    return card


def build_lessons(
    language,
    csv_path,
    output_path
):
    grouped = defaultdict(list)

    skipped_no_audio_key = 0
    skipped_missing_file = 0

    with open(
        csv_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:
        reader = csv.DictReader(f)

        for row in reader:
            unit = clean(
                row.get("unit")
            )

            audio_key = clean(
                row.get("audioKey")
            )

            if not unit:
                continue

            # Do not create lesson content
            # from rows that have no audio key.
            if not audio_key:
                skipped_no_audio_key += 1
                continue

            # Do not create lesson content
            # unless the physical MP3 exists.
            if not row_has_playable_audio(
                row,
                language
            ):
                skipped_missing_file += 1

                print(
                    f"Skipping "
                    f"{clean(row.get('id')) or '<unknown row>'}: "
                    f"missing audio file "
                    f"{AUDIO_DIRS[language]}/"
                    f"{audio_key}.mp3"
                )

                continue

            row["unit"] = unit

            grouped[unit].append(
                row
            )

    ordered_units = sorted(
        grouped.keys()
    )

    all_lessons = []

    title_map = (
        UNIT_TITLE_FALLBACKS
        if language == "cajun"
        else UNIT_TITLE_FALLBACKS_KREOLE
    )

    lesson_chunk_size = (
        get_lesson_chunk_size(
            language
        )
    )

    for unit in ordered_units:
        unit_rows = sort_rows_by_id(
            grouped[unit]
        )

        # Safety check:
        # no rows means no unit.
        if not unit_rows:
            continue

        unit_title = title_map.get(
            unit,
            f"Unit {unit.replace('u', '')}"
        )

        unit_chunks = chunk_list(
            unit_rows,
            lesson_chunk_size
        )

        prior_rows_in_unit = []

        for (
            chunk_index,
            chunk_rows
        ) in enumerate(
            unit_chunks,
            start=1
        ):
            if not chunk_rows:
                continue

            is_first_chunk = (
                chunk_index == 1
            )

            (
                activities,
                vocab_cards
            ) = schedule_core_activities(
                language=language,
                chunk_rows=chunk_rows,
                prior_rows_in_unit=(
                    prior_rows_in_unit
                ),
                unit_rows=unit_rows,
                is_first_chunk=(
                    is_first_chunk
                )
            )

            # If filtering somehow produced
            # a chunk without usable words,
            # do not create a blank lesson.
            if not vocab_cards:
                continue

            lesson_id = (
                f"{language}_"
                f"{unit}_"
                f"l{str(chunk_index).zfill(2)}"
            )

            activities = (
                finalize_lesson_activity_ids(
                    lesson_id,
                    activities
                )
            )

            lesson_title = (
                lesson_part_name(
                    chunk_rows,
                    chunk_index
                )
            )

            all_lessons.append(
                {
                    "id": lesson_id,
                    "language": language,
                    "unit": unit,
                    "unitTitle": unit_title,
                    "lessonNumberInUnit":
                        chunk_index,
                    "lessonTitle":
                        lesson_title,
                    "type": "core",
                    "wordCount":
                        len(vocab_cards),
                    "words":
                        vocab_cards,
                    "activities":
                        activities,
                    "baseXp": 40
                }
            )

            prior_rows_in_unit.extend(
                chunk_rows
            )

        # Only make a review if the unit
        # actually contains playable rows.
        if not unit_rows:
            continue

        review_id = (
            f"{language}_"
            f"{unit}_review"
        )

        review_activities = (
            make_review_activities(
                language,
                unit_rows
            )
        )

        review_activities = (
            finalize_lesson_activity_ids(
                review_id,
                review_activities
            )
        )

        all_lessons.append(
            {
                "id": review_id,
                "language": language,
                "unit": unit,
                "unitTitle": unit_title,
                "lessonNumberInUnit":
                    len(unit_chunks) + 1,
                "lessonTitle": "Review",
                "type": "review",
                "wordCount":
                    len(unit_rows),
                "words": [
                    row_to_vocab_card(r)

                    for r in unit_rows

                    if (
                        clean(
                            r.get("english")
                        )
                        and clean(
                            r.get(
                                "variant_text"
                            )
                        )
                    )
                ],
                "activities":
                    review_activities,
                "baseXp": 50
            }
        )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            all_lessons,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"Wrote "
        f"{len(all_lessons)} "
        f"lessons to "
        f"{output_path}"
    )

    print(
        f"Skipped rows with "
        f"no audioKey: "
        f"{skipped_no_audio_key}"
    )

    print(
        f"Skipped rows whose "
        f"MP3 file is missing: "
        f"{skipped_missing_file}"
    )


if __name__ == "__main__":
    build_lessons(
        "cajun",
        CAJUN_CSV,
        OUTPUT_CAJUN
    )

    build_lessons(
        "kreole",
        KREOLE_CSV,
        OUTPUT_KREOLE
    )
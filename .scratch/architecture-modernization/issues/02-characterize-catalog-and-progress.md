# 02 - Characterize Catalog and Learner Progress

**What to build:** Maintainers receive deterministic behavior coverage for the current Catalog, Learner Progress, and spaced-repetition interfaces before their implementations change.

**Blocked by:** 01 - Establish the Expo test harness

**Status:** ready-for-agent

**Claimed by:** OpenCode ticket-02 agent (completed)

**Completed:** 2026-07-22

- [x] Both Languages, Unit and Lesson ordering, lookup, Word deduplication, and Activity projection are characterized.
- [x] Profile, Lesson completion, Word mastery, Card scheduling, weak and due selection, XP, streak, and Daily Review storage are characterized.
- [x] Time-dependent behavior uses fake time rather than the machine clock.
- [x] Missing, malformed, and partial state behavior is documented where the current interface supports it.
- [x] Known defects from the ledger are skipped or quarantined rather than asserted as desired behavior.

## Pull Request Shape

- Risk: Medium
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: characterize Catalog; characterize storage; characterize spaced repetition.

## Comments

Added three characterization test files against existing public module
interfaces only; zero production lines changed.

**Catalog (`src/data/__tests__/lessonLoader.test.js`, 15 tests):**
`getLessonsByLanguage` for both `cajun` and `kreole` bundles plus the current
any-other-value-falls-back-to-cajun behavior (characterized, not endorsed);
`getLessonById` lookup and unknown-id miss for both Languages; `getUnits`
ascending unit-code ordering, Unit-title annotation, and ascending
`lessonNumberInUnit` ordering within a Unit (verified against the real
5-core-plus-review `u01` shape); `getAllActivities` projection of
`lessonId`/`lessonTitle`/`unit`/`unitTitle` and full flatten-count parity
with the raw JSON; `getAllWords` dedup of a Word repeated across a core
Lesson and its review Lesson (confirmed the fixture actually repeats it
before asserting), uniqueness of every returned `rowId`, and ascending
`rowId` sort order. No giant/full-array snapshots were used.

**Learner Progress (`src/utils/__tests__/storage.test.js`, 25 tests):**
Language-selection defaults/persistence; Profile defaults and persistence,
plus a malformed-JSON case asserted as a rejected Promise (a safe,
documented interface behavior — not a crash, not blessed as desirable);
Lesson completion keying and timestamping under fake system time; Word
mastery status ladder (new -> learning -> strong -> mastered on repeated
correct answers), the current single-wrong-answer -> "learning" status
(documented as current behavior since it is not on the known-defects
ledger), and the correct-must-exceed-wrong condition for "mastered";
Review-state default; Daily Review log default/marking and `getTodayKey`
using a local `Date` constructor at a time safely inside the calendar day
(midday/late-evening local times, not UTC-boundary-adjacent) so the
assertion is not timezone-fragile; Leaderboard insert/upsert/sort; XP and
streak recording across first session, consecutive day, >1 day gap
(reset), same-day repeat (no double increment), a partial/legacy Profile
record missing `xp`/`streak`/`lastStudyDate` (documents current graceful
fallback), and Leaderboard sync.

**Spaced repetition (`src/utils/__tests__/spacedRepetition.test.js`, 12
tests):** `updateCardReview` first-review scheduling, the 1/3/ease-scaled
interval schedule on consecutive successes (quality 4 keeps easeFactor
constant at 2.5, giving a clean deterministic 1 -> 3 -> 8 interval
progression), ease-factor increase at quality 5, lapse reset behavior
(repetitions/interval reset, lapse counted), and persistence keyed by Card
id; `getDueReviewItems` excludes Cards with no review state at all,
includes only a Card whose `nextReviewAt` has passed while a longer-interval
Card in the same set stays excluded, excludes a future Card, and includes a
Card due exactly at the current time;
`getWeakItems` excludes no-state and no-lapse Cards and returns lapsed
Cards sorted descending by lapse count.

All time-dependent tests use `jest.useFakeTimers()` +
`jest.setSystemTime(new Date(y, m, d, h, ...))` (local constructor, no
timezone-sensitive UTC strings), and `AsyncStorage.clear()` runs in
`beforeEach` for both storage suites. Screens (`DailyReviewScreen`,
`MistakeReviewScreen`) were not touched or exercised; KD-01 (final Daily
Review mistake also recorded as correct) and KD-05 (Mistake Review does not
update Card/Word progress) are screen-level concerns with no surface in
these two modules, so nothing here quarantines or asserts them — they
remain fully open per the ledger. No private helper was exported from any
module to make a test possible.

**Deferred:** the ticket's "malformed/partial state" bullet is satisfied
narrowly and intentionally — only where the current interface already
returns a safe, defined result (a rejected Promise for malformed JSON, or a
graceful numeric fallback for a partial Profile record). A speculative
partial-`WordProgress`-record scenario (e.g. a hand-seeded record missing
`wrong`) was considered and deliberately left out: it isn't referenced by
the known-defects ledger, isn't reachable through any current public
caller, and asserting its outcome would risk fabricating a new
"discovered" defect rather than characterizing an intended contract. It is
called out here for maintainer awareness rather than silently omitted.

**Commands run:**
```
$ npx jest src/data/__tests__/lessonLoader.test.js --watchAll=false
Tests: 15 passed, 15 total

$ npx jest src/utils/__tests__/storage.test.js --watchAll=false
Tests: 25 passed, 25 total

$ npx jest src/utils/__tests__/spacedRepetition.test.js --watchAll=false
Tests: 12 passed, 12 total

$ npm run test
PASS src/data/__tests__/lessonLoader.test.js
PASS src/utils/__tests__/storage.test.js
PASS src/components/__tests__/ProgressHeader.test.js
PASS src/utils/__tests__/spacedRepetition.test.js
PASS src/constants/__tests__/unitTitles.test.js
Test Suites: 5 passed, 5 total
Tests:       55 passed, 55 total

$ npx tsc --noEmit
(only pre-existing errors under app/ and components/, the inactive
Expo Router starter path per KD-04; none introduced by this change)
```

These tests passed on first run (the harness and module interfaces already
existed from ticket 01); this PR records characterization of existing
behavior, not a red-to-green fix.

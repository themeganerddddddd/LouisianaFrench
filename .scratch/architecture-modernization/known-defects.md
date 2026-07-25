# Known-Defect Ledger

These behaviors are evidence-backed defects or unresolved contradictions. Characterization tests must not encode them as desired behavior. Each receives a focused regression test in its fix ticket.

## KD-01: Final Daily Review mistake is also recorded as correct

**Resolution:** open

- Evidence: `src/screens/DailyReviewScreen.js:86-98` records quality `2` and incorrect Word progress, then calls `handleCorrect()` on the final queue item.
- Risk: the same Card can immediately receive quality `5`, correct Word progress, and XP after a final wrong answer.
- Characterization rule: cover correct completion and non-final mistakes, but quarantine the final-wrong scenario until its regression fix.

## KD-02: Lesson completion links to an unregistered route

**Resolution:** open

- Evidence: `src/screens/LessonCompleteScreen.js:35-40` navigates to `Leaderboard`, while `App.js:46-55` does not register that route.
- Risk: the visible action can fail at runtime.
- Characterization rule: assert the registered route graph and mark this outgoing action as a known failing contract rather than desired behavior.

## KD-03: Leaderboard module has an invalid storage import

**Resolution:** open

- Evidence: `src/screens/LeaderboardScreen.js:3` imports `../src/utils/storage` even though it already lives under `src/screens/`.
- Risk: registering the route without correcting the import still fails.
- Characterization rule: do not activate this module in characterization. Decide whether Leaderboard is retained before its fix.

## KD-04: Three application paths compete for maintainer attention

**Resolution:** open

- Evidence: `index.js` registers `App.js`; active imports come from `src/screens/`, while Expo Router starter modules remain under `app/` and older screens remain under `screens/`.
- Risk: agents can edit an inactive implementation and believe the application changed.
- Characterization rule: test only the registered `App.js` path. Remove inactive paths in a separate mechanical pull request after coverage exists.

## KD-05: Mistake Review does not update Card or Word progress

**Resolution:** open

- Evidence: `src/screens/MistakeReviewScreen.js:25-39` awards XP when corrected but does not update spaced repetition or Word progress.
- Risk: a corrected mistake may leave Learner Progress inconsistent.
- Note: unresolved product rule, not yet proven a defect.
- Characterization rule: document current visible flow without asserting the missing persistence as desired; resolve the rule during learning session design.

## KD-06: Missing Lesson data can fail before the loading guard

**Resolution:** open

- Evidence: `src/screens/LessonRunner.js:67-79` reads `lesson.activities` in `init()` before the render guard checks `!lesson`.
- Risk: an unknown Lesson identity can throw instead of producing an intentional state.
- Characterization rule: quarantine the missing-Lesson scenario until expected behavior is selected and fixed.

## KD-07: Repository Audio generation instructions and inputs disagree

**Resolution:** open

- Evidence: `scripts/generate_lessons.py` reads `cajun.csv` and `kreole.csv`, while `scripts/generate_audio_manifest.py` expects differently named CSV files not present at the root.
- Risk: the documented generation flow may not run from a clean checkout.
- Characterization rule: validate current bundled Audio identities without treating either generation script as the future contract; both are retired by the SQLite migration.

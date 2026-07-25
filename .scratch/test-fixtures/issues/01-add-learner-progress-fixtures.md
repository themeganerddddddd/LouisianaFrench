# 01 - Add Learner Progress fixtures

**What to build:** Learner Progress and spaced-repetition tests use reusable, explicit fixtures for Profiles, Words, Cards, persisted state, and local-calendar dates without changing application behavior or weakening completed characterization.

**Blocked by:** Architecture modernization ticket 02 - Characterize Catalog and Learner Progress

**Status:** ready-for-agent

**Claimed by:** OpenCode

**Completed:** 2026-07-24

- [x] Clock fixtures provide fresh stable dates for same-day, consecutive-day, gap-day, past-due, due-now, and future-due scenarios.
- [x] Immutable Learner Progress fixtures cover Profiles, completed Lessons, Word mastery states, Daily Review, and leaderboard records.
- [x] A focused Card builder covers valid due, future, clean, and weak Card variations without arbitrary nested overrides.
- [x] A test-only AsyncStorage seed helper centralizes serialization and raw keys for malformed or legacy-state scenarios.
- [x] Ordinary valid state continues to enter through public module interfaces where practical.
- [x] Storage and spaced-repetition assertions remain behaviorally equivalent to completed ticket 02.
- [x] Known defects are not encoded as fixture expectations.
- [x] Focused and full test suites pass without production changes.

## Pull Request Shape

- Risk: Low; tests and test support only
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: add clock and Learner Progress fixtures; migrate storage tests; migrate spaced-repetition tests.

## Comments

Added fresh local-time clock factories, frozen Learner Progress records, a
flat Card review-state builder, and test-only serialized/raw AsyncStorage seed
helpers. Migrated the 25 storage and 12 spaced-repetition characterization
tests through their existing module interfaces without production changes.

Verification on 2026-07-24:

```text
npx jest src/utils/__tests__/storage.test.js --watchAll=false
Tests: 25 passed, 25 total

npx jest src/utils/__tests__/spacedRepetition.test.js --watchAll=false
Tests: 12 passed, 12 total

npm run test
Test Suites: 5 passed, 5 total
Tests: 55 passed, 55 total

git diff --check
Passed
```

`npx tsc --noEmit` continues to report only the documented pre-existing
inactive Expo Router starter-path errors under `app/` and `components/`; no
changed or added file appears in the diagnostics. Standards and spec review
completed with no remaining findings.

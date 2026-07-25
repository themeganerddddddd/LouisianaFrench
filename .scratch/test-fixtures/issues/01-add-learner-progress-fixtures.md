# 01 - Add Learner Progress fixtures

**What to build:** Learner Progress and spaced-repetition tests use reusable, explicit fixtures for Profiles, Words, Cards, persisted state, and local-calendar dates without changing application behavior or weakening completed characterization.

**Blocked by:** Architecture modernization ticket 02 - Characterize Catalog and Learner Progress

**Status:** ready-for-agent

- [ ] Clock fixtures provide fresh stable dates for same-day, consecutive-day, gap-day, past-due, due-now, and future-due scenarios.
- [ ] Immutable Learner Progress fixtures cover Profiles, completed Lessons, Word mastery states, Daily Review, and leaderboard records.
- [ ] A focused Card builder covers valid due, future, clean, and weak Card variations without arbitrary nested overrides.
- [ ] A test-only AsyncStorage seed helper centralizes serialization and raw keys for malformed or legacy-state scenarios.
- [ ] Ordinary valid state continues to enter through public module interfaces where practical.
- [ ] Storage and spaced-repetition assertions remain behaviorally equivalent to completed ticket 02.
- [ ] Known defects are not encoded as fixture expectations.
- [ ] Focused and full test suites pass without production changes.

## Pull Request Shape

- Risk: Low; tests and test support only
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: add clock and Learner Progress fixtures; migrate storage tests; migrate spaced-repetition tests.

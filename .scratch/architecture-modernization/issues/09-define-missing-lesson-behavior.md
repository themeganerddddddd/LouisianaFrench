# 09 - Handle unavailable Lessons intentionally

**What to build:** A learner who reaches an unknown or unavailable Lesson receives a deliberate recoverable outcome instead of a failure while reading Lesson activities.

**Blocked by:** 04 - Add required tests and lint CI

**Status:** completed

**Claimed by:** agent/fix-missing-lesson-crash

**Completed:** 2026-07-26

- [ ] The expected unavailable-Lesson behavior is specified through the Lesson screen interface.
- [ ] A regression test goes red on the current failure path.
- [ ] Initialization never reads Activities from an absent Lesson.
- [ ] The learner can recover to a valid screen.
- [ ] Existing Lesson behavior remains green.
- [ ] KD-06 is marked resolved after verification.

After a human selects the recoverable outcome, record it under `## Comments` and change `Status:` to `ready-for-agent`.

## Pull Request Shape

- Risk: Low
- Complexity: S
- Production change budget: under 75 lines
- Suggested commits: specify unavailable behavior; implement minimal handling; resolve ledger entry.

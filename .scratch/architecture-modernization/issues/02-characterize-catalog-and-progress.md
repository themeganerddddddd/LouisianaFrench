# 02 - Characterize Catalog and Learner Progress

**What to build:** Maintainers receive deterministic behavior coverage for the current Catalog, Learner Progress, and spaced-repetition interfaces before their implementations change.

**Blocked by:** 01 - Establish the Expo test harness

**Status:** ready-for-agent

- [ ] Both Languages, Unit and Lesson ordering, lookup, Word deduplication, and Activity projection are characterized.
- [ ] Profile, Lesson completion, Word mastery, Card scheduling, weak and due selection, XP, streak, and Daily Review storage are characterized.
- [ ] Time-dependent behavior uses fake time rather than the machine clock.
- [ ] Missing, malformed, and partial state behavior is documented where the current interface supports it.
- [ ] Known defects from the ledger are skipped or quarantined rather than asserted as desired behavior.

## Pull Request Shape

- Risk: Medium
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: characterize Catalog; characterize storage; characterize spaced repetition.

# 05 - Add accessible and deterministic testability

**What to build:** Learners receive meaningful accessibility semantics, while tests receive stable selectors, controlled time, and controlled randomness for critical behavior.

**Blocked by:** 04 - Add required tests and lint CI

**Status:** ready-for-agent

- [ ] Critical controls expose meaningful accessibility roles, names, and states.
- [ ] Tests prefer accessibility semantics over implementation hierarchy or visual coordinates.
- [ ] Date, timer, streak, and review behavior can run deterministically in tests.
- [ ] Word-bank and matching order can run deterministically in tests without changing production randomness expectations.
- [ ] Existing behavior remains green and new production seams are no wider than demonstrated variation requires.
- [ ] Production changes include rendered or module regression coverage.

## Pull Request Shape

- Risk: Medium
- Complexity: M
- Production change budget: under 200 lines
- Suggested commits: add accessibility semantics; add clock control; add randomness control.

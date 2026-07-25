# 03 - Characterize Activities, screens, and navigation

**What to build:** Maintainers receive rendered behavior coverage for every active Activity type, active screen, and registered navigation path without changing application behavior.

**Blocked by:** Test-fixtures ticket 01 - Add Learner Progress fixtures; test-fixtures ticket 03 - Add compact Catalog fixtures

**Status:** ready-for-agent

- [ ] Every supported Activity type covers initial state, correct answer, first wrong answer, retry, final wrong continuation, hint or answer feedback, and relevant Audio controls.
- [ ] Rendered and navigation tests use reusable Catalog and Learner Progress fixtures rather than ad hoc inline application state.
- [ ] Loading, Language selection, Home, Lesson, Daily Review, Mistake Review, completion, Dictionary, and Advanced behavior are characterized where active.
- [ ] The real navigation graph is exercised, not only mocked navigation calls.
- [ ] Inactive Expo Router and legacy screen paths are explicitly excluded from the test surface.
- [ ] Ledger defects are represented as known failing contracts or skipped regression specifications, not passing expectations.

## Pull Request Shape

- Risk: Medium
- Complexity: L; split Activities and screens into separate pull requests if review exceeds 30 minutes
- Production change budget: 0 lines
- Suggested commits: characterize Activities; characterize screens; characterize route graph.

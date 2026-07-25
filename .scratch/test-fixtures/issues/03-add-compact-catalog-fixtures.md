# 03 - Add compact Catalog fixtures

**What to build:** Catalog behavior tests run against a compact reusable fixture for both Languages, while separate validation tests continue checking the real bundled Catalog shipped to learners.

**Blocked by:** 02 - Localize the Catalog source

**Status:** ready-for-agent

- [ ] Compact immutable fixtures cover both Languages, ordered Units and Lessons, core and review Lessons, and every supported Activity type.
- [ ] Fixtures include duplicate Words for deduplication, stable identities, Unicode and apostrophes, and present and missing Audio.
- [ ] Catalog ordering, lookup, Activity projection, Word deduplication, and sorting tests use the compact fixture.
- [ ] Separate bundled-Catalog tests verify non-empty Languages, anchor Lesson lookup, identity and ordering invariants, supported Activity types, Unicode, and Audio identities.
- [ ] Full production JSON equality and incidental production counts are removed only after equivalent behavior and shipped-data validation are green.
- [ ] Known defects and unapproved fallback behavior do not become canonical fixture expectations.
- [ ] Tests use the Catalog module interface rather than private helpers.
- [ ] Focused and full test suites pass.

## Pull Request Shape

- Risk: Low; test fixtures and test migration
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: add compact Catalog fixtures; migrate behavior tests; add bundled-Catalog validation; remove redundant production-data coupling.

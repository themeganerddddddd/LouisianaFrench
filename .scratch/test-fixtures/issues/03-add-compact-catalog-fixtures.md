# 03 - Add compact Catalog fixtures

**What to build:** Catalog behavior tests run against a compact reusable fixture for both Languages, while separate validation tests continue checking the real bundled Catalog shipped to learners.

**Blocked by:** 02 - Localize the Catalog source

**Status:** ready-for-agent

**Claimed by:** OpenCode

**Completed:** 2026-07-25

- [x] Compact immutable fixtures cover both Languages, ordered Units and Lessons, core and review Lessons, and every supported Activity type.
- [x] Fixtures include duplicate Words for deduplication, stable identities, Unicode and apostrophes, and present and missing Audio.
- [x] Catalog ordering, lookup, Activity projection, Word deduplication, and sorting tests use the compact fixture.
- [x] Separate bundled-Catalog tests verify non-empty Languages, anchor Lesson lookup, identity and ordering invariants, supported Activity types, Unicode, and Audio identities.
- [x] Full production JSON equality and incidental production counts are removed only after equivalent behavior and shipped-data validation are green.
- [x] Known defects and unapproved fallback behavior do not become canonical fixture expectations.
- [x] Tests use the Catalog module interface rather than private helpers.
- [x] Focused and full test suites pass.

## Pull Request Shape

- Risk: Low; test fixtures and test migration
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: add compact Catalog fixtures; migrate behavior tests; add bundled-Catalog validation; remove redundant production-data coupling.

## Comments

Added a deeply immutable compact Catalog fixture with out-of-order Units and
Lessons for Cajun French and Kouri-Vini. Migrated ordering, lookup, Activity
projection, Word deduplication, and sorting behavior to `createCatalog`, and
split shipped-data validation into `bundledCatalog.test.js`. The bundled suite
uses the existing Catalog interface without full JSON equality or incidental
production counts. No production code changed.

Verification on 2026-07-25:

```text
npx jest src/data/__tests__/catalog.test.js src/data/__tests__/bundledCatalog.test.js --watchAll=false
Test Suites: 2 passed, 2 total
Tests: 19 passed, 19 total

npm test
Test Suites: 6 passed, 6 total
Tests: 59 passed, 59 total

npx eslint src/test/fixtures/catalog/compactCatalog.js
Passed

npx eslint src/data/__tests__/catalog.test.js src/data/__tests__/bundledCatalog.test.js --global describe --global it --global expect
Passed

npm run build
Exported: dist

git diff --check
Passed
```

At initial verification, repository-wide `npm run lint` and `npx tsc --noEmit`
failed on the documented inactive Expo Router starter paths and missing
Jest-global lint configuration. Ticket 02 also lacked a `Completed` date, so
this ticket remained claimed despite its acceptance criteria and test suites
passing.

The lint tooling and unused Expo Router starter files were subsequently
repaired outside this ticket. `npm run lint`, `npm test`, and `npm run build`
now pass, ticket 02 is complete, and this ticket is no longer blocked.

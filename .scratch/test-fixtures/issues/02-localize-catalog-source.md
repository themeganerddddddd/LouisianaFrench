# 02 - Localize the Catalog source

**What to build:** Catalog acquisition sits behind the smallest internal seam so behavior tests can supply compact Catalog data while production callers continue using the unchanged Catalog interface and bundled JSON behavior.

**Blocked by:** Architecture modernization ticket 02 - Characterize Catalog and Learner Progress

**Status:** ready-for-agent

**Claimed by:** OpenCode

- [x] Existing Catalog exports and caller behavior remain unchanged.
- [x] Bundled JSON acquisition and Language selection gain locality inside the Catalog implementation.
- [x] Existing Catalog characterization passes before and after the change.
- [x] Fixture substitution cannot leak between tests through global module state or Jest caches.
- [x] Unknown Language behavior remains characterized rather than changed.
- [x] No private transformation helper becomes part of the test surface.
- [x] No SQLite implementation, generalized adapter registry, or dependency container is introduced.
- [x] Production changes remain under 250 lines and include tests in the same pull request.

## Pull Request Shape

- Risk: Medium; internal production refactor with no intended behavior change
- Complexity: M
- Production change budget: under 150 lines
- Suggested commits: strengthen Catalog parity assertions; localize bundled Catalog acquisition; verify unchanged public behavior.

## Comments

Added a `createCatalog` module interface that closes over one supplied Lesson
source and returns the existing five Catalog operations. `lessonLoader.js`
constructs the production instance from the bundled JSON and retains its
existing named exports and unknown-Language fallback. Independent instances
replace mutable global substitution, so fixture sources cannot leak through
module state or Jest caches. No transformation helper is exposed.

Verification on 2026-07-25:

```text
npx jest src/data/__tests__/lessonLoader.test.js --watchAll=false (before)
Tests: 15 passed, 15 total

npx jest src/data/__tests__/catalog.test.js src/data/__tests__/lessonLoader.test.js --watchAll=false
Tests: 17 passed, 17 total

npm test
Test Suites: 6 passed, 6 total
Tests: 57 passed, 57 total

npm run build
Exported: dist

npx eslint src/data/catalog.js src/data/lessonLoader.js
Passed with temporarily installed lint tooling

npx eslint src/data/__tests__/catalog.test.js --global describe --global it --global expect
Passed with temporarily installed lint tooling

git diff --check
Passed
```

The required repository-wide `npm run lint` gate is already failing on `main`:
CI run `30162771215` reports `eslint: not found` because lint dependencies are
absent from the lockfile. Supplying temporary lint tooling additionally reveals
pre-existing inactive starter-path and Jest-global configuration errors; no
changed production or test file has a focused lint finding. `npx tsc --noEmit`
continues to report only the documented inactive Expo Router starter-path
errors under `app/` and `components/`. The ticket remains claimed without a
`Completed` date until the required lint gate is repaired.

An adversarial review found no functional defects, regressions, leakage
hazards, scope creep, or ticket violations. Compact reusable data and broader
fixture behavior coverage remain deferred to ticket 03.

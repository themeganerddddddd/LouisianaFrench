# 01 - Establish the Expo test harness

**What to build:** A maintainer can install dependencies from a clean checkout and run one deterministic behavior test through an existing module interface using Expo-supported Jest and React Native Testing Library tooling.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

**Claimed by:** OpenCode ticket-01 agent (completed)

**Completed:** 2026-07-22

- [x] A non-watch test command exits successfully from a clean checkout.
- [x] Jest uses the Expo-supported preset and React 19-compatible rendered testing tools.
- [x] Shared test setup can isolate native dependencies without changing production behavior.
- [x] At least one narrow existing behavior proves the harness works.
- [x] No private helper is exported solely to make the test possible.

## Pull Request Shape

- Risk: Low
- Complexity: S
- Production change budget: 0 lines
- Suggested commits: install tooling; add deterministic setup; prove one existing interface.

## Comments

Implemented the Expo-supported Jest harness and proved it with an existing
Catalog interface behavior (`getUnitTitle` from `src/constants/unitTitles.js`),
called through its module interface only.

**Tooling installed (devDependencies):**
- `jest-expo@^54.0.17` (matches installed `expo@~54.0.0` / SDK 54)
- `jest@^29.7.0` (version jest-expo 54.x is built against)
- `@testing-library/react-native@^13.3.3` (peers on `react-test-renderer >=18.2.0`, compatible with React 19.1.0)
- `react-test-renderer@^19.1.0` (pinned to match the installed `react@19.1.0`, avoiding an ERESOLVE conflict with npm auto-resolving a newer `react-test-renderer` that requires `react@^19.2.8`)

**Config added:**
- `package.json` `"jest"` block: `preset: "jest-expo"`, `setupFilesAfterEnv: ["<rootDir>/jest.setup.js"]`.
- `package.json` `"scripts.test"`: `"jest --watchAll=false"` (deterministic, non-watch).
- `jest.setup.js`: mocks `@react-native-async-storage/async-storage` via the package's own official jest mock (`@react-native-async-storage/async-storage/jest/async-storage-mock`). This is the minimal, non-speculative native-dependency isolation point for future module/rendered tests; it changes no production code.

**Proof test added:**
- `src/constants/__tests__/unitTitles.test.js` — exercises `getUnitTitle` (already exported) for a known unit code and an unknown-unit fallback. No private helper was exported to make this possible.
- `src/components/__tests__/ProgressHeader.test.js` — renders the existing `ProgressHeader` interface with React Native Testing Library, proving the React 19 rendered-test stack works.

**Red before tooling existed:**
```
$ npx --no-install jest src/constants/__tests__/unitTitles.test.js
npm error npx canceled due to missing packages and no YES option: ["jest@30.4.2"]
```
This confirms the test (and any test command) could not run at all before jest tooling was installed/configured.

**Green after tooling + config:**
```
$ npx jest src/constants/__tests__/unitTitles.test.js --watchAll=false
PASS src/constants/__tests__/unitTitles.test.js
  getUnitTitle
    ✓ returns the configured title for a known Cajun French unit
    ✓ falls back to a generated title for an unknown unit code

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

**Clean-install verification:**
```
$ npm ci && npm run test
Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```

`react-test-renderer` is pinned exactly to `19.1.0` so future lockfile refreshes cannot drift away from the installed React version.

**Full deterministic command:**
```
$ npm run test
> jest --watchAll=false
PASS src/constants/__tests__/unitTitles.test.js
  getUnitTitle
    ✓ returns the configured title for a known Cajun French unit (1 ms)
    ✓ falls back to a generated title for an unknown unit code (1 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

**Lint:** No lint script exists yet and `eslint` is not installed in `node_modules`, even though `eslint.config.js` is committed (it references `eslint-config-expo`). Lint was not runnable and no lint tooling was installed as part of this ticket, per its zero-production-change / narrow scope. This is a gap for a future ticket to close, not a blocker for this one.

**Note on inactive paths:** `npx tsc --noEmit` shows pre-existing errors confined to the inactive Expo Router starter path (`app/`, `components/`), matching KD-04. These predate this change and are out of scope here.

# Delivery Plan

This plan keeps every pull request independently reviewable and green. Characterization comes before fixes. Production changes always carry tests, and no pull request should exceed roughly 250 changed production lines without being split.

## Pull Request Graph

```text
PR 1 Agent setup
  -> PR 2 Test harness
      -> PR 3 Characterization
          -> PR 4 Required CI
              -> reusable fixture effort
              -> PR 5A Testability
                  -> PR 5B Maestro foundation
              -> PR 6 Defect fixes
                  -> PR 7 Active-path cleanup
                      -> TypeScript decision gate -> PR 8 Deepen Catalog
                      -> Catalog authoring decision
PR 8 Deepen Catalog + Catalog authoring decision + compact Catalog fixtures
  -> PR 9 SQLite adapter and parity
      -> PR 10 SQLite cutover and legacy removal
```

Learning-session rule decisions after defect fixes also open a parallel deepening track:

```text
PR 6 Defect fixes
  -> PR 7 Active-path cleanup
      -> learning-session rule decision
          -> deepen learning session
              -> deepen Learner Progress

PR 5B Maestro foundation + PR 7 Active-path cleanup
  -> deepen Activity and Audio behavior

Stable Maestro evidence + resolved critical defects
  -> promote eligible native merge gates
```

The learning session, Learner Progress, activity rendering, and Audio deepening efforts are separate tickets and may proceed when their blocking edges clear. They do not need to wait for SQLite unless they touch the same module interface concurrently.

## PR 1: Configure Agent Collaboration

**Goal:** Make repository intent, domain language, decisions, and the local ticket frontier durable for people and agents.

**Dependencies:** None

**Risk:** Low; documentation only

**Complexity:** S

**Expected production lines:** 0

**Files:** Repository agent instructions, domain glossary, agent workflow docs, ADRs, modernization spec, ticket files, and deferred TypeScript brief.

**Checks:** Markdown links and tracker consistency; no production files changed.

**Acceptance:** A fresh agent can identify the active spec, unblocked ticket, canonical domain terms, testing principle, and accepted storage direction without searching conversation history.

**Rollback:** Revert documentation files; no runtime effect.

**Commits:**

1. `docs: configure local agent workflow`
2. `docs: define learning domain language and decisions`
3. `docs: specify test-first architecture modernization`
4. `docs: add modernization tickets and TypeScript follow-up`

## PR 2: Establish the Test Harness

**Goal:** Run one deterministic behavior test locally using Expo-supported tooling without changing application behavior.

**Dependencies:** PR 1

**Risk:** Low; development tooling only

**Complexity:** S

**Expected production lines:** 0

**Likely files:** Package manifest and lockfile, Jest configuration and setup, initial fixture and test support files, ignore rules.

**Tests:** One narrow existing behavior through an existing module interface; test command runs once and exits.

**Acceptance:** Clean checkout plus `npm ci` can run deterministic tests; React 19-compatible React Native Testing Library is used; no production implementation is exported solely for testing.

**Rollback:** Revert tooling and tests; application bundle is unchanged.

**Commits:**

1. `test: install Expo Jest tooling`
2. `test: add deterministic test setup`
3. `test: prove the harness through an existing interface`

## PR 3: Characterize the Existing Application

**Goal:** Protect current intended behavior at the confirmed seams before any defect fix or module deepening.

**Dependencies:** PR 2

**Risk:** Medium; broad test additions can accidentally bless defects

**Complexity:** L, split into PR 3A-3D if review exceeds 30 minutes

**Expected production lines:** 0

**Likely test areas:** Catalog behavior, Learner Progress and spaced repetition, all Activity types, active screens, and the real navigation graph.

**Tests:** Behavior matrices from the spec; fake timers and seeded data where current interfaces permit; known-defect scenarios skipped with ledger references rather than asserted as correct.

**Acceptance:** Every active module interface has baseline behavioral coverage; every supported Activity type has rendered coverage; inactive paths are excluded; the known-defect ledger and tests agree.

**Rollback:** Revert individual characterization commits; no runtime behavior changes.

**Commits:**

1. `test: characterize Catalog behavior`
2. `test: characterize Learner Progress behavior`
3. `test: characterize Activity behavior`
4. `test: characterize active screens`
5. `test: characterize navigation contracts`

## PR 4: Add Required GitHub Actions Checks

**Goal:** Block unsafe pull requests with stable test and lint checks.

**Dependencies:** PR 3

**Risk:** Low to medium; bad workflow configuration can block merges

**Complexity:** S

**Expected production lines:** 0

**Likely files:** One GitHub Actions workflow, package scripts, and contributor documentation.

**Checks:** Pull requests and `main` pushes run `npm ci`, lint, and deterministic Jest tests with minimal permissions, npm caching, and concurrency cancellation.

**Acceptance:** Workflow job names are stable for branch protection; no secrets are needed; a superseded branch run cancels; failures expose useful logs or artifacts.

**Rollback:** Revert the workflow or temporarily remove required-check configuration in GitHub.

**Commits:**

1. `build: add deterministic quality scripts`
2. `ci: require tests and lint on pull requests`
3. `docs: document required merge checks`

## PR 5A: Add Accessible, Deterministic Testability

**Goal:** Give rendered and native tests stable accessibility semantics, a controlled clock, and controlled randomness without changing intended learning behavior.

**Dependencies:** PR 4

**Risk:** Medium; production testability seams must remain narrow

**Complexity:** M

**Expected production lines:** Under 200, all covered by module or rendered tests

**Likely files:** Critical active screens and Activity rendering, plus focused clock and randomness implementation.

**Tests:** Accessibility roles, names, and states; deterministic dates, timers, streaks, review schedules, word banks, and pair ordering.

**Acceptance:** Tests avoid visual coordinates and wall-clock dependence; no speculative framework is introduced.

**Rollback:** Revert each accessibility, clock, or randomness change with its tests.

**Commits:**

1. `test: add accessible semantics to critical interactions`
2. `test: make clock behavior deterministic`
3. `test: make randomized activities reproducible`

## PR 5B: Establish Native Maestro Journeys

**Goal:** Exercise the installed application on iOS and Android without immediately making native infrastructure a merge blocker.

**Dependencies:** PR 5A

**Risk:** Medium; native builds and timing can be flaky

**Complexity:** L, split by platform if needed

**Expected production lines:** Under 150, limited to deterministic native fixture support with tests

**Likely files:** Maestro flow files, EAS or local test-build configuration, deterministic fixture support, and a non-blocking workflow.

**Tests:** First launch, both Languages, core Lesson completion, mistake path, Daily Review, Dictionary, restart persistence, and active routes.

**Acceptance:** Critical flows pass locally on both native platforms; scheduled/manual CI retains screenshots and logs; no untrusted fork requires secrets; promotion criteria are documented.

**Rollback:** Disable the non-blocking workflow while retaining module and rendered gates.

**Commits:**

1. `test: add deterministic native test state`
2. `test: add core Maestro journeys`
3. `ci: run native journeys outside required checks`

## PR 6: Fix Known Defects Under Regression Tests

**Goal:** Resolve one documented defect per green commit without combining unrelated behavior changes.

**Dependencies:** PR 4; PR 5A is preferred but not required for module-level defects

**Risk:** Medium; behavior changes affect Learner Progress and navigation

**Complexity:** M; split into separate pull requests if more than two defects are selected

**Expected production lines:** Under 200 per pull request

**Likely files:** Daily Review, navigation registration or Lesson completion, Leaderboard if retained, missing-Lesson behavior, and their tests.

**Tests:** Red regression first for each ledger item, then the smallest fix.

**Acceptance:** Fixed scenarios leave the ledger as resolved, all characterization remains green, and no known defect is silently redefined.

**Rollback:** Revert the individual defect commit; commits are intentionally independent.

**Commits:**

1. `test: reproduce final Daily Review mistake defect`
2. `fix: record final Daily Review result once`
3. `test: reproduce invalid completion route`
4. `fix: make completion navigation valid`
5. `test: specify missing Lesson behavior`
6. `fix: handle unavailable Lessons intentionally`

## PR 7: Remove Inactive Application Paths

**Goal:** Leave one navigable implementation so agents cannot edit dead starter or legacy modules.

**Dependencies:** PR 3 and relevant route fixes from PR 6

**Risk:** Low after entry-path verification

**Complexity:** S

**Expected production lines:** Primarily deletions

**Likely files:** Expo Router starter directory, top-level legacy screens, starter-only modules, and configuration references proven unused.

**Tests:** Existing active-path and route tests remain unchanged and green; native smoke flow starts successfully.

**Acceptance:** `index.js` to `App.js` is the sole application path; no active import references removed files; deletion makes complexity vanish rather than move.

**Rollback:** Revert deletion commit.

**Commits:**

1. `chore: remove inactive legacy screens`
2. `chore: remove inactive Expo Router starter`
3. `test: verify the sole application entry path`

## Decision Gate: TypeScript Migration

Complete the exploration in `.scratch/typescript-migration/spec.md` before substantial new Catalog implementation. Decide whether to migrate high-leverage interfaces before SQLite, alongside vertical SQLite slices, or after cutover. Do not perform a repository-wide conversion mixed with behavior changes.

## Decision Gate: Catalog Authoring

Decide how maintainers create, review, validate, and release the canonical bundled SQLite Catalog before building its schema and database builder. The decision must preserve meaningful review even though the shipped database is binary.

## PR 8: Deepen the Catalog Module

**Goal:** Increase Catalog depth so callers depend on domain behavior rather than embedded JSON and synchronous whole-Catalog assumptions.

**Dependencies:** PR 7 and TypeScript decision gate

**Risk:** Medium; affects Home, Dictionary, Lessons, and Daily Review

**Complexity:** L, split by caller migration if needed

**Expected production lines:** Under 250 per pull request

**Likely files:** Catalog implementation, narrow caller adaptations, shared Catalog behavior suite, and fixtures.

**Tests:** Existing JSON adapter passes the complete Catalog behavior suite before and after deepening.

**Acceptance:** Storage format and record assembly have locality inside the Catalog module; callers do not know JSON imports, SQL concerns, or fallback representation; no speculative generalized framework is introduced.

**Rollback:** Revert caller migrations and module deepening together; existing JSON remains active.

**Commits:**

1. `test: define the Catalog behavior contract`
2. `refactor: concentrate Catalog assembly`
3. `refactor: move Catalog callers to the deepened seam`

## PR 9: Add the Bundled SQLite Catalog Adapter

**Goal:** Prove SQLite can provide the same Catalog behavior while JSON remains the active fallback during migration.

**Dependencies:** PR 8 and the Catalog authoring decision gate

**Risk:** High; introduces native persistence and schema decisions

**Complexity:** L, likely multiple pull requests for schema, builder, and native adapter

**Expected production lines:** Under 250 per pull request

**Likely files:** SQLite dependency and configuration, schema and builder, bundled database asset, SQLite adapter, validation, parity and native integration tests.

**Tests:** Shared adapter suite, fresh open, schema version, Unicode, ordering, relationships, validation, idempotence, transaction failure, and both native platforms.

**Acceptance:** SQLite and JSON agree on domain behavior; the database is bundled and opens offline; Audio identities validate; no screen learns SQL or schema details; Learner Progress is untouched.

**Rollback:** Keep JSON as the selected adapter and revert native configuration if necessary.

**Commits:**

1. `build: add Expo SQLite support`
2. `test: specify Catalog schema behavior`
3. `feat: build the bundled Catalog database`
4. `feat: add the SQLite Catalog adapter`
5. `test: prove JSON and SQLite parity`

## PR 10: Cut Over and Retire Generated Catalog Inputs

**Goal:** Make bundled SQLite canonical and delete migration-only Catalog implementations after release confidence.

**Dependencies:** PR 9 and stable native end-to-end results

**Risk:** High but reversible for one release if JSON is retained temporarily

**Complexity:** M

**Expected production lines:** Mostly deletions

**Likely files:** Adapter selection, bundled assets, generation scripts, CSV and JSON artifacts, documentation, CI Catalog validation.

**Tests:** Full required checks, both native Maestro platforms, Catalog validation, restart, and Learner Progress preservation.

**Acceptance:** SQLite is the sole Catalog implementation; CSV and generated JSON are removed; clean checkout and release builds contain a valid database; all critical journeys pass.

**Rollback:** Revert adapter selection during the compatibility window; after legacy deletion, revert the pull request as a whole.

**Commits:**

1. `feat: select the SQLite Catalog adapter`
2. `ci: validate the bundled Catalog`
3. `chore: remove CSV and generated JSON Catalog inputs`
4. `docs: document SQLite Catalog maintenance`

## Definition of Done

- Required test and lint checks protect `main`.
- Characterization and defect fixes remain distinct in history.
- Every active module interface has behavior coverage.
- Maestro critical journeys pass on iOS and Android before release.
- Known defects are resolved or explicitly retained as unresolved decisions.
- The active application has one entry and one screen path.
- SQLite is bundled, canonical, validated, and hidden behind the Catalog seam.
- Learner Progress survives Catalog cutover and remains separate behind AsyncStorage.
- CSV and generated JSON Catalog implementations are removed.
- TypeScript migration has an approved, separately ticketed strategy.
- Catalog authoring and release workflow is approved before SQLite construction.
- Learning session, Learner Progress, Activity, and Audio behavior have the intended depth and test surfaces.
- Stable native checks protect pull requests at the documented cadence, and both native platforms protect releases.
- Local specs and tickets accurately reflect completion and blocking edges.

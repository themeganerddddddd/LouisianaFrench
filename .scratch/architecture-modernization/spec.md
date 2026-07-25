# Architecture Modernization

## Problem Statement

The application has no automated tests or merge checks, so changes made by people or coding agents can regress core learning journeys without fast feedback. Important learning behavior is spread across screens and persistence helpers, the Catalog is generated from CSV into bundled JSON, inactive application paths obscure the real implementation, and most active code is JavaScript even though TypeScript is the desired long-term direction.

## Solution

Protect the existing application before changing it. Establish deterministic module and rendered tests, add simple required GitHub Actions checks, and introduce non-blocking Maestro journeys for installed iOS and Android applications. Keep known defects out of characterization expectations, then fix them under regression tests.

After the safety net is stable, deepen the Catalog, learning session, Learner Progress, activity rendering, and Audio modules. Replace CSV and generated JSON with a bundled SQLite Catalog behind the Catalog seam. Keep Learner Progress separate and backed by AsyncStorage. Explore TypeScript migration as a dedicated follow-up before committing to its implementation order relative to the larger module changes.

## User Stories

1. As a learner, I want first launch and Language selection to work after every change, so that I can begin learning Cajun French or Kouri-Vini.
2. As a learner, I want my selected Language to survive an application restart, so that I return to the expected Catalog.
3. As a learner, I want Units and Lessons to load in stable order, so that my learning path is predictable.
4. As a learner, I want to complete every supported Activity type, so that all learning interactions remain usable.
5. As a learner, I want wrong answers to lead to the intended retry and Mistake Review behavior, so that my progress is recorded accurately.
6. As a learner, I want Daily Review to update each Card exactly once per submitted result, so that spaced repetition remains trustworthy.
7. As a learner, I want Lesson completion, Word mastery, XP, streaks, and review state to survive restarts, so that my Learner Progress is durable.
8. As a learner, I want Dictionary search, filtering, status, and Audio behavior to remain available, so that I can study outside a Lesson.
9. As a learner, I want missing or failed Audio to leave the application usable, so that one recording cannot block learning.
10. As a learner, I want every visible navigation action to reach a registered destination, so that I never hit a broken route.
11. As a maintainer, I want fast deterministic checks on every pull request, so that unsafe changes are blocked before merge.
12. As a maintainer, I want tests to describe observable behavior rather than implementation structure, so that modules can be deepened without rewriting the suite.
13. As a maintainer, I want known defects tracked separately from characterization, so that tests do not preserve incorrect behavior.
14. As a maintainer, I want native end-to-end coverage on iOS and Android, so that SQLite, navigation, persistence, and bundled assets are verified in installed applications.
15. As a maintainer, I want failed CI and end-to-end runs to retain useful artifacts, so that failures can be diagnosed quickly.
16. As a coding agent, I want committed specs, tickets, domain language, and decisions, so that I can work from an unblocked frontier without rediscovering intent.
17. As a coding agent, I want one deterministic verification command per check, so that completion claims are evidence-based.
18. As a maintainer, I want Catalog callers insulated from storage format, so that bundled JSON can be replaced by SQLite with few caller changes.
19. As a maintainer, I want SQLite tables, joins, schema versions, and row assembly hidden behind the Catalog interface, so that storage knowledge has locality.
20. As a maintainer, I want the old JSON and new SQLite adapters checked against the same behavior during migration, so that parity is demonstrated before cutover.
21. As a maintainer, I want the bundled SQLite Catalog validated before release, so that malformed Activities and Audio identities fail before learners encounter them.
22. As a maintainer, I want Catalog replacement to preserve Learner Progress, so that content changes cannot erase learner-owned history.
23. As a maintainer, I want Learner Progress to remain separate from Catalog storage, so that their different lifecycles retain locality.
24. As a maintainer, I want clock and randomness behavior controlled in tests, so that dates, streaks, review schedules, word banks, and pair ordering are reproducible.
25. As a learner using assistive technology, I want controls to expose meaningful roles, names, and states, so that the application is operable and tests use stable semantics.
26. As a maintainer, I want TypeScript migration explored separately, so that type conversion does not hide behavior changes or destabilize the initial safety net.

## Implementation Decisions

- Work begins in strict order: characterize current behavior, then establish required CI. After CI protects the branch, native journey coverage and focused defect fixes may proceed in parallel. Module deepening and Catalog migration follow their declared blocking edges.
- Characterization and intentional behavior changes never share a pull request.
- The confirmed test surfaces are the Catalog, learning session, Learner Progress, activity rendering, Audio, navigation, and installed application interfaces.
- The interface is the test surface. Private helpers remain implementation unless their independently complex behavior earns a separate module interface.
- The active application path is `index.js` to `App.js` to the `src` screen modules. Inactive paths are removed only after the active path is characterized.
- Initial required GitHub Actions checks are unit/rendered tests and lint. Native Maestro checks are introduced as non-blocking workflows and promoted only after they are deterministic.
- CI uses minimal permissions, dependency caching keyed by the lockfile, concurrency cancellation for superseded branch runs, deterministic non-watch commands, and retained diagnostics on failure.
- Maestro covers installed applications on iOS and Android. Native journeys use deterministic Catalog and Learner Progress fixtures and accessibility semantics instead of coordinates.
- SQLite becomes the canonical Catalog source and runtime implementation and is delivered as a bundled database.
- The Catalog module owns storage access, ordering, deduplication, derived labels, Activity assembly, validation, and SQLite schema knowledge.
- Bundled JSON and SQLite are two real adapters only during migration. The JSON adapter is deleted after parity and cutover.
- Learner Progress remains a separate module backed by AsyncStorage. Sharing a SQLite library in the future would not justify combining Catalog and Learner Progress interfaces.
- Audio identities remain Catalog data, while native asset resolution and playback remain inside the Audio module.
- TypeScript migration is a deferred architecture track. Its exploration must determine ordering before substantial new SQLite implementation is committed.
- Pull requests remain focused and reviewable, targeting no more than roughly 250 changed production lines. Every production behavior change includes tests.

## Testing Decisions

- Jest with `jest-expo` provides pure and module test execution aligned with Expo.
- React Native Testing Library covers rendered behavior through text, roles, labels, and accessibility state. Broad snapshots are not the primary confidence source.
- Maestro covers critical installed-app journeys on both native platforms.
- Characterization tests record current intended behavior only. A known defect receives a skipped regression specification or ledger entry until its fix ticket; it is never asserted as desired behavior.
- Shared behavior suites exercise the temporary JSON and SQLite Catalog adapters during migration.
- SQLite integration tests cover fresh creation, bundled database opening, schema versioning, migration, Unicode, relationships, idempotence, transaction failure, and Catalog validation.
- Learner Progress tests cover defaults, persistence, mastery states, Card scheduling, lapses, XP, streaks, Daily Review dates, malformed records, and restarts.
- Activity rendering tests cover every supported Activity type, enabled and disabled actions, correct answers, first and final wrong answers, hints, continuation, and Audio controls.
- Navigation tests cover the real route graph, startup replacement, required parameters, and every active destination.
- A controllable clock and seeded randomness make time and ordering deterministic.
- Audio module and rendered tests use a recording adapter. Native journeys verify integration and absence of crashes, not audible speaker output.
- Coverage reports are diagnostic. Merge safety depends on behavior matrices and required checks, not a line percentage alone. A numeric gate may be introduced after the baseline is measured and understood.
- There is no prior test pattern in this repository; Expo's supported Jest setup and React Native Testing Library conventions become the initial prior art.

## CI Topology

### Required Pull Request Workflow

- Trigger on pull requests and pushes to `main`.
- Set read-only repository permissions.
- Cancel superseded runs for the same pull request or branch.
- Install the pinned Node version and restore the npm cache from `package-lock.json`.
- Run `npm ci`, lint, and deterministic Jest tests without watch mode.
- Upload coverage and failure diagnostics when useful.
- Expose stable job names suitable for branch protection.

### Native End-to-End Workflow

- Start as manual and scheduled, plus an explicit pull-request label or workflow dispatch when practical.
- Build or obtain internal test applications without exposing secrets to untrusted fork pull requests.
- Run Maestro against iOS and Android using deterministic state.
- Upload Maestro logs, screenshots, and recordings on failure.
- Promote one native platform to a required pull-request check only after measured stability; require both platforms before release.

## Delivery Order

1. Configure repository instructions, local tracking, domain language, and decisions.
2. Install test tooling and prove the harness with a narrow existing behavior.
3. Characterize the active Catalog, Learner Progress, activity rendering, screens, and navigation while excluding known defects.
4. Add required GitHub Actions tests and lint.
5. Add accessibility semantics and deterministic native fixtures with tests.
6. In parallel after required CI, add non-blocking Maestro journeys and fix known defects one at a time under regression tests.
7. Remove inactive application paths after active-path coverage is green.
8. Explore and decide the TypeScript migration strategy.
9. Deepen the Catalog and add adapter parity tests.
10. Introduce and cut over to the bundled SQLite Catalog.
11. Deepen learning session, Learner Progress, activity rendering, and Audio modules as separate tested changes.
12. Remove CSV, generated JSON, and migration-only implementation after parity and release verification.

## Out of Scope

- Implementing tests, CI, fixes, refactors, SQLite, or TypeScript as part of this documentation effort.
- Selecting concrete method-level interfaces for deepened modules before their design tickets.
- Migrating Learner Progress from AsyncStorage without a new requirement.
- Downloading Catalog updates from a remote backend.
- Treating web as a substitute for native iOS and Android coverage.
- Testing physical speaker output automatically.
- Preserving inactive starter files solely to satisfy a coverage target.

## Further Notes

- See `known-defects.md` for behavior that characterization must not bless.
- See `delivery-plan.md` for pull-request and commit sequencing.
- See `issues/` for the agent-ready dependency graph.
- See `.scratch/typescript-migration/spec.md` for the deferred TypeScript exploration.
- See `.scratch/test-fixtures/spec.md` for reusable Catalog and Learner Progress fixture work that follows initial characterization.
- See `docs/adr/` for accepted cross-cutting decisions.

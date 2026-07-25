# Reusable Test Fixtures

## Problem Statement

The characterization suite currently mixes two test-data strategies. Catalog tests depend on the complete bundled Cajun French and Kouri-Vini JSON files, while Learner Progress and Card tests create records and dates inline. This makes behavior tests harder to read, encourages repeated setup, and will make the future JSON-to-SQLite parity suite harder to reuse.

## Solution

Introduce small, reusable fixtures while preserving the behavior protected by completed characterization ticket 02. Keep Catalog fixtures separate from Learner Progress fixtures because their data and lifecycles differ.

Use compact fixture data for module behavior and keep separate smoke and validation tests against the real bundled Catalog. Add only the smallest internal Catalog seam needed to run one behavior suite against fixture data today and SQLite later. Do not expose private helpers or design a generalized adapter framework.

## Fixture Taxonomy

### Catalog Fixtures

A compact immutable Catalog fixture will cover:

- Cajun French and Kouri-Vini.
- Units and Lessons supplied out of order so ordering behavior is observable.
- Core and review Lessons.
- Every supported Activity type.
- A Word repeated across a core Lesson and review Lesson for deduplication.
- Stable, readable Language, Unit, Lesson, Word, Card, and Audio identities.
- Accented text and straight and curly apostrophes.
- Entries with Audio and without Audio.

Catalog behavior tests use compact fixtures. Separate bundled-Catalog tests continue verifying that shipped content loads, contains both Languages, satisfies identity and ordering invariants, includes supported Activity types, and preserves Unicode and Audio identities.

### Learner Progress Fixtures

Small immutable fixtures and focused builders will cover:

- Fresh and established Profiles.
- Completed Lessons.
- New, learning, strong, and mastered Words.
- Due, due-exactly-now, future, clean, one-lapse, and multi-lapse Cards.
- Daily Review records and leaderboard entries.
- Fixed local-calendar study and review times.

A test-only AsyncStorage seed helper will centralize serialization and raw storage keys for malformed or legacy-state scenarios. Ordinary valid state should continue entering through public module interfaces where practical.

## Implementation Decisions

- Fixture objects are small and immutable; there is no complete-application mega-fixture.
- Add builders only for frequently varied records, initially Card review state and possibly Profile state.
- Builders have valid defaults and shallow overrides. They do not accept arbitrary nested callbacks or hide important test inputs.
- Clock fixtures return fresh `Date` values and avoid shared mutable dates.
- Single-use values that improve test readability may remain inline.
- Known defects are not encoded as canonical fixture outcomes.
- Production storage keys remain implementation details and are not exported for tests.
- The existing Catalog interface remains the test surface.
- The internal Catalog seam localizes source selection without exposing JSON, SQLite, or fixture representation to callers.
- YAGNI applies: no dependency container, adapter registry, repository framework, or SQLite implementation is introduced by this effort.
- A future SQLite test database will be created fresh from compact scenarios when the SQLite adapter exists; no binary test database is committed now.

## Likely File Layout

```text
src/test/fixtures/
  clock.js
  catalog/
    compactCatalog.js
    catalogFixtures.js
  learnerProgress/
    learnerProgressFixtures.js
    cardBuilder.js
    seedAsyncStorage.js

src/data/__tests__/
  lessonLoader.test.js
  bundledCatalog.test.js
```

The exact internal Catalog seam shape is selected during implementation. This spec does not define a concrete method-level interface.

## Testing Decisions

- The interface is the test surface; private helpers remain implementation.
- Fixture migration must preserve every intended assertion from architecture modernization ticket 02.
- Compact fixtures prove module behavior deterministically.
- Bundled-Catalog smoke and validation tests prove shipped content remains compatible.
- Expected values are independent literals or worked examples, not recomputed with the production algorithm.
- Broad snapshots and full JSON equality are not used as the main confidence source.
- Shared mutable fixture state is prohibited.

## Out of Scope

- Reopening or redefining completed characterization ticket 02.
- Fixing known application defects.
- Implementing SQLite.
- Defining the final JSON/SQLite interface before both runtime adapters exist.
- Migrating single-use values solely to eliminate every literal from tests.

## Risks

- Fixture drift from the real Catalog.
- Builders that become more complex than the records they create.
- Giant fixtures that hide the behavior under test.
- Tautological expected values.
- Global Catalog substitution leaking through Jest module caches.
- Accidentally weakening production-Catalog validation while making behavior tests smaller.

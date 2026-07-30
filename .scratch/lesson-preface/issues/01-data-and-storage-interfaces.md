# 01: Structured preface content + Catalog + Storage interfaces

Status: ready-for-agent

Blocked by:

Claimed by:

## Summary

Add the Unit-preface content data, extend the Catalog with a `getUnitPreface` lookup, and add Learner Progress functions for first-opening tracking. No rendering yet.

## Acceptance

- [ ] `src/constants/unitPrefaces.js` exports `UNIT_PREFACES` with Cajun French `u03` entry matching the spec shape; `kreole.u03` is `undefined`
- [ ] Distinct Cajun French and Kouri-Vini fixture prefaces added to `src/test/fixtures/`
- [ ] `src/data/catalog.js` exports `getUnitPreface(language, unitCode)` that delegates through the source interface
- [ ] `src/data/lessonLoader.js` re-exports `getUnitPreface`
- [ ] `src/test/fixtures/catalog/compactCatalog.js` provides two fixture prefaces
- [ ] Compact Catalog tests pass: lookup by Language, missing Unit returns `undefined`, different Language returns different preface
- [ ] `src/utils/storage.js` exports `isPrefaceRead(prefaceId)` → `boolean` and `markPrefaceRead(prefaceId)` → `void`, keyed by `lf_preface_read`
- [ ] Storage tests cover default (false), mark→true, persistence across calls

## Implementation notes

- The `unitPrefaces` shape must be usable by both Cajun French and Kouri-Vini. Fields: `id`, `title`, `summary`, `terms`, `reassurance`, `detailsTitle`, `sections` (array of `{ heading, paragraphs, quote? }`).
- `isPrefaceRead` and `markPrefaceRead` follow the same pattern as `markLessonComplete` in `storage.js`. Storage key: `lf_preface_read`.
- The compact Catalog fixture must include two prefaces (one per Language) to prove the interface supports both.
- `getUnitPreface` returns `undefined` for missing Language or Unit code.

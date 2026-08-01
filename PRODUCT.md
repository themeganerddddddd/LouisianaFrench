# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Learners studying Louisiana French or Kouri-Vini on iOS, Android, or responsive web. They include first-time learners beginning the Catalog and returning learners continuing Lessons, Daily Review, Mistake Review, and pronunciation practice.

## Product Purpose

The application teaches Louisiana languages through structured Lessons, practice Activities, and learner-specific review. Success means a learner can understand what to do next, complete meaningful daily work, and retain progress independently in each Language.

## Positioning

The product combines real Louisiana French and Kouri-Vini Catalog content with a daily path derived from each learner's Lesson, Word, Card, and practice history.

## Operating Context

Learners switch between Languages, complete ordered Lessons, review due or weak Cards, correct missed Activities, practice pronunciation, browse the Dictionary, and return Home to see current progress and the next action. Catalog content ships read-only with the application; Learner Progress persists locally.

## Capabilities and Constraints

- The supported Languages are Louisiana French and Kouri-Vini.
- The Catalog defines ordered Units, Lessons, Words, Activities, and Audio; Learner Progress remains separate.
- The application runs through Expo and React Native on iOS, Android, and responsive web.
- Navigation, safe areas, native touch targets, large text, reduced motion, and bounded web width are product requirements.
- Existing Learner Progress must survive migrations and remain safe enough for rollback.
- GitHub issue #49 commits Home to an approved daily-plan redesign. Until its child issues ship, the current Home implementation remains the description of released behavior.

## Brand Commitments

- Use the product name Louisiana French where the application identity is named; use Louisiana French and Kouri-Vini for the Language tracks.
- Preserve the distinct blue Louisiana French and green Kouri-Vini identities.
- Preserve the bundled flags, pelican, and second-line artwork as recognizable product assets.
- Use direct, encouraging language grounded in real learner state rather than invented progress or claims.

## Evidence on Hand

- `CONTEXT.md` is the authority for domain terminology.
- GitHub issue #49 is the product specification for the approved Home redesign.
- The `homescreen-redesign` reference contains the approved design 2b prototype, screenshots, edge states, and handoff notes.
- `cajun.csv` and `kreole.csv` contain shipped Catalog source data.
- `assets/images/` contains the approved product and Language imagery.

## Product Principles

- Make the next useful action obvious and truthful.
- Keep each Language's identity and Learner Progress independent.
- Derive learner-facing state from persisted progress and real Catalog content.
- Preserve a compact native hierarchy across phone and responsive web.
- Let accessibility and platform behavior outrank decorative fidelity.

## Accessibility & Inclusion

Controls must remain reachable within safe areas, expose meaningful labels and states, meet native touch-target expectations, support increased text size, respect reduced motion, and preserve the complete hierarchy on narrow and large web viewports.

# TypeScript Migration Exploration

## Problem Statement

The active application is primarily JavaScript. The repository has strict TypeScript configuration, but it includes only TypeScript files, so the active learning implementation receives no TypeScript checking. New testing, module deepening, and SQLite work could increase the later conversion cost if the migration direction is not selected soon.

## Goal

Explore and approve a gradual TypeScript migration strategy after the existing JavaScript application is protected by tests and required CI. This effort records the decision only; it does not perform conversion yet.

## Constraints

- Existing behavior is protected before conversion.
- Type conversion and intentional behavior changes remain separate.
- Module interfaces are migrated before low-leverage implementation details where practical.
- The migration remains incremental and green at every pull request.
- Generated Catalog types are not hand-maintained in multiple places.
- Runtime validation is considered separately from compile-time typing, especially at SQLite row and persisted Learner Progress seams.
- Tests continue to exercise behavior rather than type implementation.

## High-Leverage Surfaces to Investigate

- Navigation route names and route parameters.
- Activity variants and their required fields.
- Catalog domain records and SQLite row mapping.
- Learner Progress records and AsyncStorage decoding.
- Learning session outcomes and completion results.
- Audio identities and playback results.
- Shared test fixtures and adapters.

## Questions to Resolve

1. Should strict TypeScript migration happen before SQLite implementation, alongside SQLite vertical slices, or after Catalog cutover?
2. Should existing JavaScript be checked temporarily with `allowJs` and `checkJs`, or converted file by file without JavaScript checking?
3. Which module interface should be the first tracer bullet?
4. How should Activity discriminated variants be derived and validated?
5. How should SQLite query results and AsyncStorage JSON be validated at runtime?
6. Should navigation types be introduced before screen conversion?
7. Which legacy TypeScript starter files will already have been deleted before migration?
8. What strictness and coverage gates should apply during expand-migrate-contract?

## Exit Criteria

- An approved migration order and first tracer bullet.
- A decision on JavaScript interoperability during migration.
- A decision on runtime validation at external data seams.
- A blast-radius map grouped into reviewable, green pull requests.
- Blocking edges added to implementation tickets.
- Qualifying hard-to-reverse decisions recorded as ADRs.

## Out of Scope

- Converting source files now.
- Combining the migration with defect fixes.
- Rewriting working modules solely to make them look more TypeScript-native.
- Selecting an ORM as part of language migration.

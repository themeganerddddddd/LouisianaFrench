# Activity outcome

When a learner settles one Activity, `recordActivityOutcome` records the Learner Progress writes and returns the session next step.

## Callers

- **Lesson screen** (`LessonRunner`): loads the Lesson, shows Unit preface, animates, mounts Activity rendering, then calls `recordActivityOutcome` and animates or navigates from `nextStep`.
- **Daily Review**: still writes locally today; a later Issue switches it onto this module with session kind `dailyReview`.

## Interface

Callers pass session kind, Language, Activity, correctness, and enough session position to decide the next step. They receive XP gained, whether the Activity counts toward Lesson score, and `advance` | `mistakeReview` | `complete`. They do not pass Card quality numbers or XP tables.

Card review and Learner Progress persistence stay behind this module. Catalog loading stays behind the Catalog seam. Activity rendering stays unchanged.

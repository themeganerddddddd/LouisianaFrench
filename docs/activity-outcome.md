# Activity outcome

When a learner settles one Activity, `recordActivityOutcome` records the Learner Progress writes and returns the session next step.

## Callers

- **Lesson screen** (`LessonRunner`): loads the Lesson, shows Unit preface, animates, mounts Activity rendering, then calls `recordActivityOutcome` with session kind `lesson` and animates or navigates from `nextStep`.
- **Daily Review screen**: loads the due-Card queue and header, mounts Activity rendering, then calls `recordActivityOutcome` with session kind `dailyReview`. On `complete` it marks Daily Review done, records study XP, and opens Session Complete with no score. It never opens in-session Mistake Review.

## Advance control (#330)

Activity rendering one-shots **Next Question** / final **Continue** so a double tap cannot record two outcomes. That latch lives in `FeedbackFooter` and in `ActivityRenderer`'s `submitOnce`. If the caller's advance handler rejects (for example `recordActivityOutcome` or Learner Progress storage fails), both latches clear and the control is usable again. A successful advance still remounts the next Activity and starts with a fresh latch.

## Interface

Callers pass session kind, Language, Activity, correctness, and enough session position to decide the next step. They receive XP gained, whether the Activity counts toward Lesson score, and `advance` | `mistakeReview` | `complete`. They do not pass Card quality numbers or XP tables.

Card review and Learner Progress persistence stay behind this module. Catalog loading stays behind the Catalog seam. Activity rendering stays unchanged.

## Preserved numbers

- **Lesson**: quality 4/5, XP 10/6, quality 2 on wrong, intro excluded from score, review Lesson has no score; last Activity with mistakes opens Mistake Review.
- **Daily Review**: quality 5 and XP 8 on correct; quality 2 and pending Mistake source `dailyReview` on wrong; correct answers clear a pending Mistake for that Card; last Activity always completes (never Mistake Review).

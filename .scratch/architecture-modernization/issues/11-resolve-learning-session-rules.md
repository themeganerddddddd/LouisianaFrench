# 11 - Resolve learning session persistence rules

**What to build:** Maintainers receive explicit decisions for how core Lessons, Daily Review, and Mistake Review update Cards, Words, XP, mistakes, and completion before the learning session module is deepened.

**Blocked by:** 07 - Record a final Daily Review mistake once; 10 - Remove inactive application paths

**Status:** completed

**Claimed by:** agent/next

**Completed:** 2026-07-26

## Comments

Decisions recorded:

1. **Mistake Review does not update card quality or word progress.** This is intentional — Mistake Review is remedial practice, not assessment. KD-05 is not a defect; it's by design.

2. **XP values remain as-is.** Core Lesson: +10 (+6 for review items). Daily Review: +8. Mistake Review: +10 on completion (one-time). These reflect effort level differences — Daily Review is lighter, Mistake Review bundles XP at the end.

3. **Mistake Review wrong answer stays on the current card.** ActivityRenderer handles the first-wrong/final-wrong UI inline. MistakeReviewScreen.handleWrong intentionally does nothing. The learner retries until correct.

### Current rules (codified):

| | Card quality | Word progress | XP | Final wrong |
|---|---|---|---|---|
| Core Lesson correct | 4 (5 if review) | true | +10 (+6) | — |
| Core Lesson wrong | 2 | false | 0 | → MistakeReview |
| Daily Review correct | 5 | true | +8 | — |
| Daily Review wrong | 2 | false | 0 | → completes |
| Mistake Review correct | — | — | +10 (end) | — |
| Mistake Review wrong | — | — | — | stays on card |

## Pull Request Shape

- Risk: None; decision ticket
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: document domain rules; record qualifying decisions; create follow-up implementation tickets.

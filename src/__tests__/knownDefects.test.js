// Known-defect ledger quarantine markers.
//
// These skipped contracts describe behaviours the repo has evidence for
// but has not yet fixed. They must NOT assert the defect as desired
// behaviour. Delete or convert to passing tests only after the
// corresponding fix ticket completes.
//
// See GitHub Issue #30.

// KD-01 resolved: see regression test in src/screens/__tests__/screens.test.js
// Final Daily Review wrong no longer calls handleCorrect — quality 2 and
// incorrect word progress are preserved through completion.

describe('Issue #30: Mistake Review progress rule is unresolved', () => {
  it.skip(
    'Mistake Review correct answer must update Card review state and Word progress',
    () => {
      // MistakeReviewScreen.handleCorrect (lines 25-39) awards XP but
      // does not call updateCardReview or updateWordProgress. This
      // leaves spaced repetition state and Word mastery inconsistent
      // after a corrected mistake.
      //
      // Note: unresolved product rule, not yet proven a defect.
    }
  );
});

// KD-06 resolved: see regression test in src/screens/__tests__/screens.test.js
// Unknown lessonId now redirects to Home instead of crashing on lesson.activities

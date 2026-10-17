// Known-defect ledger quarantine markers.
//
// These skipped contracts describe behaviours the repo has evidence for
// but has not yet fixed. They must NOT assert the defect as desired
// behaviour. Delete or convert to passing tests only after the
// corresponding fix ticket completes.
//
// See GitHub Issues #30 and #92.

// KD-01 resolved: see regression test in src/screens/__tests__/screens.test.js
// Final Daily Review wrong no longer calls handleCorrect — quality 2 and
// incorrect word progress are preserved through completion.

// KD-05 Card part resolved in #203: a correct Mistake Review answer records
// Card quality 4. See the Mistake Review tests in
// src/screens/__tests__/screens.test.js.

describe('Issue #92: Mistake Review Word progress rule is unresolved', () => {
  it.skip(
    'Mistake Review correct answer must update Word progress',
    () => {
      // MistakeReviewScreen.handleCorrect updates the Card but does not
      // call updateWordProgress. The Word keeps only the original wrong
      // answer after a corrected mistake.
      //
      // Note: unresolved product rule, not yet proven a defect.
    }
  );
});

// KD-06 resolved: see regression test in src/screens/__tests__/screens.test.js
// Unknown lessonId now redirects to Home instead of crashing on lesson.activities

// Known-defect ledger quarantine markers.
//
// These skipped contracts describe behaviours the repo has evidence for
// but has not yet fixed. They must NOT assert the defect as desired
// behaviour. Delete or convert to passing tests only after the
// corresponding fix ticket completes.
//
// See `.scratch/architecture-modernization/known-defects.md`.

describe('KD-01: Final Daily Review mistake is also recorded as correct', () => {
  it.skip(
    'final Daily Review wrong must not call handleCorrect or double-score',
    () => {
      // DailyReviewScreen.handleWrong (line 97) calls handleCorrect()
      // on the last queue item even after recording quality 2 and
      // incorrect Word progress. This can grant quality 5, correct
      // progress, and XP after a final wrong answer.
    }
  );
});

describe('KD-05: Mistake Review does not update Card or Word progress', () => {
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

describe('KD-06: Missing Lesson data can fail before the loading guard', () => {
  it.skip(
    'unknown lessonId should produce an intentional empty/error UI instead of throwing',
    () => {
      // LessonRunner.init (lines 67-79 in the current source) reads
      // lesson.activities before the render guard checks !lesson at
      // line 79. An unknown lessonId causes getLessonById to return
      // undefined, making lesson.activities throw.
    }
  );
});

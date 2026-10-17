/**
 * Compact Daily Review Activity-outcome fixtures for recordActivityOutcome tests.
 *
 * expected names Card quality, XP delta, score counting, Word update,
 * pending Mistake source, and next step.
 */
const frozen = (record) => Object.freeze(record);

export const dailyReviewActivityOutcomes = frozen({
  correctMidQueue: frozen({
    sessionKind: 'dailyReview',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      rowId: 'fixture_cajun_w02',
      type: 'multiple_choice',
      isReview: true
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: null,
    isLastActivity: false,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 5,
      xpDelta: 8,
      countsTowardScore: false,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      clearsPendingMistake: true,
      nextStep: 'advance'
    })
  }),

  wrongMidQueue: frozen({
    sessionKind: 'dailyReview',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      rowId: 'fixture_cajun_w02',
      type: 'multiple_choice',
      isReview: true
    }),
    wasCorrect: false,
    userAnswer: 'Bonjour',
    lessonId: null,
    isLastActivity: false,
    mistakeCount: 1,
    expected: frozen({
      cardQuality: 2,
      xpDelta: 0,
      countsTowardScore: false,
      wordWasCorrect: false,
      pendingMistakeSource: 'dailyReview',
      nextStep: 'advance'
    })
  }),

  lastCorrectComplete: frozen({
    sessionKind: 'dailyReview',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:ready:build',
      rowId: 'fixture_cajun_w03',
      type: 'sentence_build',
      isReview: true
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: null,
    isLastActivity: true,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 5,
      xpDelta: 8,
      countsTowardScore: false,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      clearsPendingMistake: true,
      nextStep: 'complete'
    })
  }),

  lastWrongComplete: frozen({
    sessionKind: 'dailyReview',
    language: 'kreole',
    activity: frozen({
      cardId: 'fixture:kreole:pronouns:choice',
      rowId: 'fixture_kreole_w01',
      type: 'multiple_choice',
      isReview: true
    }),
    wasCorrect: false,
    userAnswer: 'mo',
    lessonId: null,
    isLastActivity: true,
    mistakeCount: 1,
    expected: frozen({
      cardQuality: 2,
      xpDelta: 0,
      countsTowardScore: false,
      wordWasCorrect: false,
      pendingMistakeSource: 'dailyReview',
      nextStep: 'complete'
    })
  })
});

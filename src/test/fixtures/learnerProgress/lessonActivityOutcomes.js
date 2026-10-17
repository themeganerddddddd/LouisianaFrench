/**
 * Compact Lesson Activity-outcome fixtures for recordActivityOutcome tests.
 *
 * expected names Card quality, XP delta, score counting, Word update,
 * pending Mistake source, and next step.
 */
const frozen = (record) => Object.freeze(record);

export const lessonActivityOutcomes = frozen({
  correctNewCard: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:listen',
      rowId: 'fixture_cajun_w01',
      type: 'listening_target_choice',
      isReview: false
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: 'fixture_cajun_u01_l01',
    lessonType: 'core',
    isLastActivity: false,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 4,
      xpDelta: 10,
      countsTowardScore: true,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      nextStep: 'advance'
    })
  }),

  correctDueCard: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:listen',
      rowId: 'fixture_cajun_w01',
      type: 'listening_target_choice',
      isReview: true
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: 'fixture_cajun_u01_l01',
    lessonType: 'core',
    isLastActivity: false,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 5,
      xpDelta: 6,
      countsTowardScore: true,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      nextStep: 'advance'
    })
  }),

  wrongMidLesson: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      rowId: 'fixture_cajun_w02',
      type: 'multiple_choice',
      isReview: false
    }),
    wasCorrect: false,
    userAnswer: 'Bonjour',
    lessonId: 'fixture_cajun_u01_l01',
    lessonType: 'core',
    isLastActivity: false,
    mistakeCount: 1,
    expected: frozen({
      cardQuality: 2,
      xpDelta: 0,
      countsTowardScore: false,
      wordWasCorrect: false,
      pendingMistakeSource: 'lesson',
      nextStep: 'advance'
    })
  }),

  introExcludedFromScore: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:to-be:intro',
      rowId: 'fixture_cajun_w04',
      type: 'intro_card',
      isReview: false
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: 'fixture_cajun_u03_l01',
    lessonType: 'core',
    isLastActivity: false,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 4,
      xpDelta: 10,
      countsTowardScore: false,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      nextStep: 'advance'
    })
  }),

  reviewLessonComplete: frozen({
    sessionKind: 'lesson',
    language: 'kreole',
    activity: frozen({
      cardId: 'fixture:kreole:pronouns:choice',
      rowId: 'fixture_kreole_w01',
      type: 'multiple_choice',
      isReview: false
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: 'fixture_kreole_u01_review',
    lessonType: 'review',
    isLastActivity: true,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 4,
      xpDelta: 10,
      countsTowardScore: false,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      nextStep: 'complete',
      scoreEarned: null,
      scorePossible: null
    })
  }),

  lastActivityWithMistakes: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:ready:build',
      rowId: 'fixture_cajun_w03',
      type: 'sentence_build',
      isReview: false
    }),
    wasCorrect: false,
    userAnswer: "C'est",
    lessonId: 'fixture_cajun_u02_l01',
    lessonType: 'core',
    isLastActivity: true,
    mistakeCount: 1,
    expected: frozen({
      cardQuality: 2,
      xpDelta: 0,
      countsTowardScore: false,
      wordWasCorrect: false,
      pendingMistakeSource: 'lesson',
      nextStep: 'mistakeReview'
    })
  }),

  lastActivityCleanComplete: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:ready:build',
      rowId: 'fixture_cajun_w03',
      type: 'sentence_build',
      isReview: false
    }),
    wasCorrect: true,
    userAnswer: null,
    lessonId: 'fixture_cajun_u02_l01',
    lessonType: 'core',
    isLastActivity: true,
    mistakeCount: 0,
    expected: frozen({
      cardQuality: 4,
      xpDelta: 10,
      countsTowardScore: true,
      wordWasCorrect: true,
      pendingMistakeSource: null,
      nextStep: 'complete',
      scoreEarned: 1,
      scorePossible: 1
    })
  }),

  coreLessonScoreAfterIntroAndChoice: frozen({
    sessionKind: 'lesson',
    language: 'cajun',
    lessonId: 'fixture_cajun_u03_l01',
    lessonType: 'core',
    expected: frozen({
      nextStep: 'complete',
      xpDeltaTotal: 20,
      scoreEarned: 1,
      scorePossible: 1
    })
  })
});

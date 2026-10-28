/**
 * Compact Mistake Review Activity-outcome fixtures for recordActivityOutcome tests.
 */
const frozen = (record) => Object.freeze(record);

export const mistakeReviewActivityOutcomes = frozen({
  correctMidQueue: frozen({
    sessionKind: 'mistakeReview',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      rowId: 'fixture_cajun_w02',
      type: 'multiple_choice'
    }),
    wasCorrect: true,
    isLastActivity: false,
    expected: frozen({
      cardQuality: 4,
      xpDelta: 0,
      countsTowardScore: false,
      nextStep: 'advance',
      recordsPracticeCompletion: false
    })
  }),

  correctLastClearsPending: frozen({
    sessionKind: 'mistakeReview',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      rowId: 'fixture_cajun_w02',
      type: 'multiple_choice'
    }),
    wasCorrect: true,
    isLastActivity: true,
    expected: frozen({
      cardQuality: 4,
      xpDelta: 0,
      countsTowardScore: false,
      nextStep: 'complete',
      recordsPracticeCompletion: true
    })
  }),

  wrongRequeueOnly: frozen({
    sessionKind: 'mistakeReview',
    language: 'cajun',
    activity: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      rowId: 'fixture_cajun_w02',
      type: 'multiple_choice'
    }),
    wasCorrect: false,
    isLastActivity: false,
    expected: frozen({
      xpDelta: 0,
      countsTowardScore: false,
      nextStep: 'advance'
    })
  })
});

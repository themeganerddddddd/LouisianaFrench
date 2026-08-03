import { clock } from '../clock';
import { buildCardReviewState } from './cardBuilder';

const frozen = (record) => Object.freeze(record);
const reviewState = (nextReviewAt, lapses = 0) => frozen(buildCardReviewState({
  nextReviewAt: nextReviewAt.toISOString(),
  lapses
}));

export const profiles = frozen({
  fresh: frozen({
    username: 'Player',
    xp: 0,
    streak: 0,
    lastStudyDate: null
  }),
  established: frozen({
    username: 'Marie',
    xp: 40,
    streak: 2,
    lastStudyDate: clock.studyDay().toISOString()
  }),
  beau: frozen({
    username: 'Beau',
    xp: 0,
    streak: 0,
    lastStudyDate: null
  }),
  legacyPartial: frozen({ username: 'Marie' })
});

export const completedLessons = frozen({
  cajunFirst: frozen({
    completed: true,
    completedAt: clock.lessonCompletion().toISOString()
  }),
  kouriViniFirst: frozen({
    completed: true,
    completedAt: clock.lessonCompletion().toISOString()
  })
});

export const lastWorkedUnits = frozen({
  cajunUnitOne: frozen({ cajun: 'u01' }),
  kreoleUnitTwo: frozen({ kreole: 'u02' })
});

export const wordMastery = frozen({
  new: frozen({ seen: 0, correct: 0, wrong: 0, status: 'new' }),
  learningAfterWrong: frozen({ seen: 1, correct: 0, wrong: 1, status: 'learning' }),
  strong: frozen({ seen: 2, correct: 2, wrong: 0, status: 'strong' }),
  strongWithEqualAnswers: frozen({ seen: 8, correct: 4, wrong: 4, status: 'strong' }),
  mastered: frozen({ seen: 4, correct: 4, wrong: 0, status: 'mastered' })
});

export const dailyReviewLogs = frozen({
  fresh: frozen({}),
  completed: frozen({ '2026-01-15': true }),
  legacy: frozen({ '2026-03-05': true, '2026-03-06': true }),
  today: frozen({ '2026-03-05': true }),
  cajun: frozen({ '2026-03-05': true }),
  kreole: frozen({ '2026-03-04': true })
});

export const dailyReviewMigration = frozen({
  marker: true
});

export const pendingMistakes = frozen({
  cajun: frozen({
    greetingChoice: frozen({
      cardId: 'fixture:cajun:greeting:choice',
      answer: 'Bonjour',
      source: 'lesson',
      sourceId: 'fixture_cajun_u01_l01',
      timestamp: clock.localCalendarLateEvening().toISOString()
    }),
    greetingListen: frozen({
      cardId: 'fixture:cajun:greeting:listen',
      answer: 'Bonjour',
      source: 'lesson',
      sourceId: 'fixture_cajun_u01_l01',
      timestamp: clock.localCalendarLateEvening().toISOString()
    })
  }),
  kreole: frozen({
    pronounsChoice: frozen({
      cardId: 'fixture:kreole:pronouns:choice',
      answer: 'vouzòt',
      source: 'dailyReview',
      sourceId: null,
      timestamp: clock.localCalendarLateEvening().toISOString()
    })
  }),
  obsoleteCard: frozen({
    cardId: 'fixture:cajun:obsolete:missing',
    answer: 'ancienne réponse',
    source: 'lesson',
    sourceId: 'fixture_cajun_u01_l01',
    timestamp: clock.localCalendarLateEvening().toISOString()
  })
});

export const reviewStates = frozen({
  dueAndWeak: frozen({
    'fixture:cajun:greeting:intro': reviewState(clock.pastDue()),
    'fixture:cajun:greeting:choice': reviewState(clock.pastDue()),
    'fixture:cajun:greeting:listen': reviewState(clock.futureDue(), 2),
    'fixture:cajun:greeting:typing': reviewState(clock.futureDue(), 1)
  }),
  overlap: frozen({
    'fixture:cajun:greeting:choice': reviewState(clock.pastDue(), 1),
    'fixture:cajun:greeting:listen': reviewState(clock.futureDue(), 3),
    'fixture:cajun:greeting:typing': reviewState(clock.futureDue(), 2)
  }),
  allFuture: frozen({
    'fixture:cajun:greeting:intro': reviewState(clock.futureDue()),
    'fixture:cajun:greeting:listen': reviewState(clock.futureDue()),
    'fixture:cajun:greeting:choice': reviewState(clock.futureDue()),
    'fixture:cajun:greeting:typing': reviewState(clock.futureDue()),
    'fixture:cajun:ready:build': reviewState(clock.futureDue()),
    'fixture:cajun:greetings:match': reviewState(clock.futureDue()),
    'fixture:cajun:to-be:intro': reviewState(clock.futureDue())
  }),
  languageIsolation: frozen({
    cajun: frozen({
      'fixture:cajun:greeting:choice': reviewState(clock.pastDue())
    }),
    kreole: frozen({
      'fixture:kreole:pronouns:choice': reviewState(clock.pastDue())
    })
  })
});

export const practiceLogs = frozen({
  todayMistakeReview: frozen({
    '2026-03-05': frozen({
      type: 'mistakeReview',
      completedAt: clock.localCalendarLateEvening().toISOString()
    })
  }),
  todaySpeech: frozen({
    '2026-03-05': frozen({
      type: 'speech',
      completedAt: clock.localCalendarLateEvening().toISOString()
    })
  })
});

export const homeProjectionProgress = frozen({
  lessonToday: frozen({
    'cajun:fixture_cajun_u01_l01': frozen({
      completed: true,
      completedAt: clock.localCalendarLateEvening().toISOString()
    })
  }),
  lessonYesterday: frozen({
    'cajun:fixture_cajun_u01_l01': frozen({
      completed: true,
      completedAt: new Date(2026, 2, 4, 23, 30, 0).toISOString()
    })
  }),
  allLessonsComplete: frozen({
    'cajun:fixture_cajun_u01_l01': frozen({ completed: true }),
    'cajun:fixture_cajun_u01_review': frozen({ completed: true }),
    'cajun:fixture_cajun_u02_l01': frozen({ completed: true }),
    'cajun:fixture_cajun_u03_l01': frozen({ completed: true })
  }),
  empty: frozen({})
});

export const leaderboardEntries = frozen({
  marie: frozen({ name: 'Marie', xp: 40 }),
  beau: frozen({ name: 'Beau', xp: 90 })
});

export const leaderboards = frozen({
  empty: frozen([]),
  sorted: frozen([leaderboardEntries.beau, leaderboardEntries.marie])
});

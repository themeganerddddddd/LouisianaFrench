import { clock } from '../clock';

const frozen = (record) => Object.freeze(record);

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

export const wordMastery = frozen({
  new: frozen({ seen: 0, correct: 0, wrong: 0, status: 'new' }),
  learningAfterWrong: frozen({ seen: 1, correct: 0, wrong: 1, status: 'learning' }),
  strong: frozen({ seen: 2, correct: 2, wrong: 0, status: 'strong' }),
  strongWithEqualAnswers: frozen({ seen: 8, correct: 4, wrong: 4, status: 'strong' }),
  mastered: frozen({ seen: 4, correct: 4, wrong: 0, status: 'mastered' })
});

export const dailyReviewLogs = frozen({
  fresh: frozen({}),
  completed: frozen({ '2026-01-15': true })
});

export const leaderboardEntries = frozen({
  marie: frozen({ name: 'Marie', xp: 40 }),
  beau: frozen({ name: 'Beau', xp: 90 })
});

export const leaderboards = frozen({
  empty: frozen([]),
  sorted: frozen([leaderboardEntries.beau, leaderboardEntries.marie])
});

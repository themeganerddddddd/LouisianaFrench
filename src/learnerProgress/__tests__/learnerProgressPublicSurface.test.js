import * as learnerProgress from '../index';

const progressExports = [
  'KEYS',
  'getStoredProfile',
  'getProfile',
  'saveProfile',
  'getLessonProgress',
  'saveLessonProgress',
  'markLessonComplete',
  'getLastWorkedUnit',
  'setLastWorkedUnit',
  'getWordProgress',
  'saveWordProgress',
  'updateWordProgress',
  'getReviewState',
  'saveReviewState',
  'getDailyReviewLog',
  'markDailyReviewDone',
  'getLanguageDailyReviewLog',
  'markLanguageDailyReviewDone',
  'getTodayKey',
  'getPendingMistakes',
  'upsertPendingMistake',
  'removePendingMistake',
  'recordPracticeCompletion',
  'getTodayPractice',
  'recordStudyAndXp'
];

const devicePreferenceExports = [
  'getDefaultLanguage',
  'setDefaultLanguage',
  'hasSelectedLanguage',
  'markLanguageSelected',
  'hasSeenAccountIntro',
  'markAccountIntroSeen',
  'hasSeenInfoBird',
  'markInfoBirdSeen',
  'hasSeenInfoContext',
  'markInfoContextSeen',
  'isPrefaceRead',
  'markPrefaceRead',
  'getLeaderboard',
  'upsertLeaderboard'
];

describe('learnerProgress public surface', () => {
  it('exports on-device Learner Progress helpers', () => {
    const exportedNames = Object.keys(learnerProgress);
    expect(progressExports.every((name) => exportedNames.includes(name))).toBe(true);
    expect(learnerProgress.KEYS.LESSON_PROGRESS).toBe('lf_lesson_progress');
  });

  it('does not export device prefs or leaderboard helpers', () => {
    const exportedNames = Object.keys(learnerProgress);
    expect(devicePreferenceExports.every((name) => !exportedNames.includes(name))).toBe(true);
  });
});

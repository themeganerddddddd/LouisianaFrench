import { KEYS as PROGRESS_KEYS } from '../learnerProgress/keys';
import { KEYS as PREF_KEYS } from './devicePreferences';
import { KEYS as LEADERBOARD_KEYS } from './leaderboard';

export const KEYS = {
  ...PROGRESS_KEYS,
  ...PREF_KEYS,
  ...LEADERBOARD_KEYS
};

export {
  getStoredProfile,
  getProfile,
  saveProfile,
  getLessonProgress,
  saveLessonProgress,
  markLessonComplete,
  getLastWorkedUnit,
  setLastWorkedUnit,
  getWordProgress,
  saveWordProgress,
  updateWordProgress,
  getReviewState,
  saveReviewState,
  getDailyReviewLog,
  markDailyReviewDone,
  getLanguageDailyReviewLog,
  markLanguageDailyReviewDone,
  getTodayKey,
  getPendingMistakes,
  upsertPendingMistake,
  removePendingMistake,
  recordPracticeCompletion,
  getTodayPractice,
  recordStudyAndXp
} from '../learnerProgress';

export {
  getDefaultLanguage,
  setDefaultLanguage,
  hasSelectedLanguage,
  markLanguageSelected,
  hasSeenAccountIntro,
  markAccountIntroSeen,
  hasSeenInfoBird,
  markInfoBirdSeen,
  hasSeenInfoContext,
  markInfoContextSeen,
  isPrefaceRead,
  markPrefaceRead
} from './devicePreferences';

export { getLeaderboard, upsertLeaderboard } from './leaderboard';

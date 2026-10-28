import * as learnerProgress from '../learnerProgress';
import * as devicePreferences from './devicePreferences';
import * as leaderboard from './leaderboard';

export const KEYS = {
  ...learnerProgress.KEYS,
  ...devicePreferences.KEYS,
  ...leaderboard.KEYS
};

// Local wrappers keep these exports spyable from tests. Live `export { x } from`
// bindings are non-configurable and break jest.spyOn(storage, ...).

export function getStoredProfile(...args) {
  return learnerProgress.getStoredProfile(...args);
}

export function getProfile(...args) {
  return learnerProgress.getProfile(...args);
}

export function saveProfile(...args) {
  return learnerProgress.saveProfile(...args);
}

export function getLessonProgress(...args) {
  return learnerProgress.getLessonProgress(...args);
}

export function saveLessonProgress(...args) {
  return learnerProgress.saveLessonProgress(...args);
}

export function markLessonComplete(...args) {
  return learnerProgress.markLessonComplete(...args);
}

export function getLastWorkedUnit(...args) {
  return learnerProgress.getLastWorkedUnit(...args);
}

export function setLastWorkedUnit(...args) {
  return learnerProgress.setLastWorkedUnit(...args);
}

export function getWordProgress(...args) {
  return learnerProgress.getWordProgress(...args);
}

export function saveWordProgress(...args) {
  return learnerProgress.saveWordProgress(...args);
}

export function updateWordProgress(...args) {
  return learnerProgress.updateWordProgress(...args);
}

export function getReviewState(...args) {
  return learnerProgress.getReviewState(...args);
}

export function saveReviewState(...args) {
  return learnerProgress.saveReviewState(...args);
}

export function getDailyReviewLog(...args) {
  return learnerProgress.getDailyReviewLog(...args);
}

export function markDailyReviewDone(...args) {
  return learnerProgress.markDailyReviewDone(...args);
}

export function getLanguageDailyReviewLog(...args) {
  return learnerProgress.getLanguageDailyReviewLog(...args);
}

export function markLanguageDailyReviewDone(...args) {
  return learnerProgress.markLanguageDailyReviewDone(...args);
}

export function getTodayKey(...args) {
  return learnerProgress.getTodayKey(...args);
}

export function getPendingMistakes(...args) {
  return learnerProgress.getPendingMistakes(...args);
}

export function upsertPendingMistake(...args) {
  return learnerProgress.upsertPendingMistake(...args);
}

export function removePendingMistake(...args) {
  return learnerProgress.removePendingMistake(...args);
}

export function recordPracticeCompletion(...args) {
  return learnerProgress.recordPracticeCompletion(...args);
}

export function getTodayPractice(...args) {
  return learnerProgress.getTodayPractice(...args);
}

export function recordStudyAndXp(...args) {
  return learnerProgress.recordStudyAndXp(...args);
}

export function getDefaultLanguage(...args) {
  return devicePreferences.getDefaultLanguage(...args);
}

export function setDefaultLanguage(...args) {
  return devicePreferences.setDefaultLanguage(...args);
}

export function hasSelectedLanguage(...args) {
  return devicePreferences.hasSelectedLanguage(...args);
}

export function markLanguageSelected(...args) {
  return devicePreferences.markLanguageSelected(...args);
}

export function hasSeenAccountIntro(...args) {
  return devicePreferences.hasSeenAccountIntro(...args);
}

export function markAccountIntroSeen(...args) {
  return devicePreferences.markAccountIntroSeen(...args);
}

export function hasSeenInfoBird(...args) {
  return devicePreferences.hasSeenInfoBird(...args);
}

export function markInfoBirdSeen(...args) {
  return devicePreferences.markInfoBirdSeen(...args);
}

export function hasSeenInfoContext(...args) {
  return devicePreferences.hasSeenInfoContext(...args);
}

export function markInfoContextSeen(...args) {
  return devicePreferences.markInfoContextSeen(...args);
}

export function isPrefaceRead(...args) {
  return devicePreferences.isPrefaceRead(...args);
}

export function markPrefaceRead(...args) {
  return devicePreferences.markPrefaceRead(...args);
}

export function getLeaderboard(...args) {
  return leaderboard.getLeaderboard(...args);
}

export function upsertLeaderboard(...args) {
  return leaderboard.upsertLeaderboard(...args);
}

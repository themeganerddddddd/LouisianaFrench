import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKeys = Object.freeze({
  profile: 'lf_profile',
  lessonProgress: 'lf_lesson_progress',
  wordProgress: 'lf_word_progress',
  reviewState: 'lf_review_state',
  dailyReviewLog: 'lf_daily_review_log',
  dailyReviewLogV2Cajun: 'lf_daily_review_log_v2_cajun',
  dailyReviewLogV2Kreole: 'lf_daily_review_log_v2_kreole',
  dailyReviewMigrated: 'lf_daily_review_migrated',
  leaderboard: 'lf_leaderboard',
  lastWorkedUnit: 'lf_last_worked_unit',
  pendingMistakes: 'lf_pending_mistakes',
  practiceLog: 'lf_practice_log'
});

function storageEntries(records) {
  return Object.entries(records).map(([name, value]) => {
    const key = storageKeys[name];
    if (!key) throw new Error(`Unknown AsyncStorage fixture: ${name}`);
    return [key, value];
  });
}

export async function seedAsyncStorage(records) {
  await Promise.all(
    storageEntries(records).map(([key, value]) =>
      AsyncStorage.setItem(key, JSON.stringify(value))
    )
  );
}

export async function seedRawAsyncStorage(records) {
  await Promise.all(
    storageEntries(records).map(([key, value]) => AsyncStorage.setItem(key, value))
  );
}

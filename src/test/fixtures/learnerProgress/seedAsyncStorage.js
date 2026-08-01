import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKeys = Object.freeze({
  profile: 'lf_profile',
  lessonProgress: 'lf_lesson_progress',
  wordProgress: 'lf_word_progress',
  reviewState: 'lf_review_state',
  dailyReviewLog: 'lf_daily_review_log',
  leaderboard: 'lf_leaderboard',
  lastWorkedUnit: 'lf_last_worked_unit'
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  KEYS,
  getLanguageDailyReviewLog,
  getLastWorkedUnit,
  getStoredProfile,
  saveProfile,
  setLastWorkedUnit
} from '../utils/storage';

const DAILY_REVIEW_KEYS = {
  cajun: KEYS.DAILY_REVIEW_LOG_V2_CAJUN,
  kreole: KEYS.DAILY_REVIEW_LOG_V2_KREOLE
};

async function readJson(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : {};
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function pickPrefixed(map, language) {
  const start = `${language}:`;
  const picked = {};
  for (const [key, value] of Object.entries(map || {})) {
    if (key.startsWith(start)) picked[key] = value;
  }
  return picked;
}

function withoutStatus(words) {
  const counts = {};
  for (const [key, value] of Object.entries(words)) {
    if (!value) continue;
    counts[key] = { seen: value.seen, correct: value.correct, wrong: value.wrong };
  }
  return counts;
}

function replacePrefixed(map, language, next) {
  const start = `${language}:`;
  const merged = {};
  for (const [key, value] of Object.entries(map || {})) {
    if (!key.startsWith(start)) merged[key] = value;
  }
  return { ...merged, ...next };
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortValue(value[key]);
    return sorted;
  }
  return value;
}

export async function readSavedLearnerProgress(language) {
  const [profile, lessons, words, reviews, mistakes, practice, lastWorkedUnit, dailyReviewDays] =
    await Promise.all([
      getStoredProfile(language),
      readJson(KEYS.LESSON_PROGRESS),
      readJson(KEYS.WORD_PROGRESS),
      readJson(KEYS.REVIEW_STATE),
      readJson(KEYS.PENDING_MISTAKES),
      readJson(KEYS.PRACTICE_LOG),
      getLastWorkedUnit(language),
      getLanguageDailyReviewLog(language)
    ]);

  return {
    language,
    profile,
    completedLessons: pickPrefixed(lessons, language),
    wordMastery: withoutStatus(pickPrefixed(words, language)),
    cardReviews: pickPrefixed(reviews, language),
    pendingMistakes: mistakes[language] || {},
    practiceDays: practice[language] || {},
    lastWorkedUnit,
    dailyReviewDays: dailyReviewDays || {}
  };
}

export function isLanguageEmpty(record) {
  return (
    record.profile == null &&
    Object.keys(record.completedLessons).length === 0 &&
    Object.keys(record.wordMastery).length === 0 &&
    Object.keys(record.cardReviews).length === 0 &&
    Object.keys(record.pendingMistakes).length === 0 &&
    Object.keys(record.practiceDays).length === 0 &&
    record.lastWorkedUnit == null &&
    Object.keys(record.dailyReviewDays).length === 0
  );
}

export function sameSavedLearnerProgress(left, right) {
  if (left.language !== right.language) return false;
  const leftRest = { ...left };
  const rightRest = { ...right };
  delete leftRest.language;
  delete rightRest.language;
  return JSON.stringify(sortValue(leftRest)) === JSON.stringify(sortValue(rightRest));
}

async function replaceLanguageBucket(key, language, next) {
  const data = await readJson(key);
  if (Object.keys(next).length === 0) delete data[language];
  else data[language] = next;
  await writeJson(key, data);
}

export async function restoreSavedLearnerProgress(language, record) {
  if (record.language !== language) {
    throw new Error(`Saved Learner Progress for ${record.language} cannot be restored onto ${language}`);
  }
  const current = await readSavedLearnerProgress(language);
  if (!isLanguageEmpty(current)) {
    throw new Error('Saved Learner Progress can only be restored onto an empty Language');
  }

  if (record.profile) await saveProfile(language, record.profile);

  await writeJson(
    KEYS.LESSON_PROGRESS,
    replacePrefixed(await readJson(KEYS.LESSON_PROGRESS), language, record.completedLessons)
  );
  await writeJson(
    KEYS.WORD_PROGRESS,
    replacePrefixed(await readJson(KEYS.WORD_PROGRESS), language, record.wordMastery)
  );
  await writeJson(
    KEYS.REVIEW_STATE,
    replacePrefixed(await readJson(KEYS.REVIEW_STATE), language, record.cardReviews)
  );
  await replaceLanguageBucket(KEYS.PENDING_MISTAKES, language, record.pendingMistakes);
  await replaceLanguageBucket(KEYS.PRACTICE_LOG, language, record.practiceDays);

  if (record.lastWorkedUnit) await setLastWorkedUnit(language, record.lastWorkedUnit);

  const dailyKey = DAILY_REVIEW_KEYS[language];
  if (!dailyKey) throw new Error(`Unknown Language: ${language}`);
  if (Object.keys(record.dailyReviewDays).length === 0) await AsyncStorage.removeItem(dailyKey);
  else await writeJson(dailyKey, record.dailyReviewDays);
}

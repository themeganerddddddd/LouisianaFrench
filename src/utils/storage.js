import AsyncStorage from '@react-native-async-storage/async-storage';
import legacyCardIds from '../data/legacyCardIds.json';
import { getLessonsByLanguage } from '../data/lessonLoader';
import { getNow } from './clock';

const KEYS = {
  PROFILE: 'lf_profile',
  PROFILE_CAJUN: 'lf_profile_cajun',
  PROFILE_KREOLE: 'lf_profile_kreole',
  PROFILE_MIGRATED: 'lf_profile_migrated',
  LESSON_PROGRESS: 'lf_lesson_progress',
  WORD_PROGRESS: 'lf_word_progress',
  REVIEW_STATE: 'lf_review_state',
  CARD_ID_MIGRATION: 'lf_card_id_migration',
  DAILY_REVIEW_LOG: 'lf_daily_review_log',
  DAILY_REVIEW_LOG_V2_CAJUN: 'lf_daily_review_log_v2_cajun',
  DAILY_REVIEW_LOG_V2_KREOLE: 'lf_daily_review_log_v2_kreole',
  DAILY_REVIEW_MIGRATED: 'lf_daily_review_migrated',
  LEADERBOARD: 'lf_leaderboard',
  DEFAULT_LANGUAGE: 'lf_default_language',
  HAS_SELECTED_LANGUAGE: 'lf_has_selected_language',
  PREFACE_READ: 'lf_preface_read',
  LAST_WORKED_UNIT: 'lf_last_worked_unit',
  PENDING_MISTAKES: 'lf_pending_mistakes',
  PRACTICE_LOG: 'lf_practice_log',
  INFO_BIRD_SEEN: 'lf_info_bird_seen',
  INFO_CONTEXT_SEEN: 'lf_info_context_seen'
};

const defaultProfile = {
  username: 'Player',
  xp: 0,
  streak: 0,
  lastStudyDate: null
};

// Unreadable saved progress matches a missing key. The raw value is left in place.
function readStoredJson(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) return value;
    return fallback;
  } catch {
    return fallback;
  }
}

export async function getDefaultLanguage() {
  const raw = await AsyncStorage.getItem(KEYS.DEFAULT_LANGUAGE);
  return raw || null;
}

export async function setDefaultLanguage(language) {
  await AsyncStorage.setItem(KEYS.DEFAULT_LANGUAGE, language);
}

export async function hasSelectedLanguage() {
  const val = await AsyncStorage.getItem(KEYS.HAS_SELECTED_LANGUAGE);
  return val === 'true';
}

export async function markLanguageSelected() {
  await AsyncStorage.setItem(KEYS.HAS_SELECTED_LANGUAGE, 'true');
}

export async function hasSeenInfoBird() {
  return (await AsyncStorage.getItem(KEYS.INFO_BIRD_SEEN)) === 'true';
}

export async function markInfoBirdSeen() {
  await AsyncStorage.setItem(KEYS.INFO_BIRD_SEEN, 'true');
}

export async function hasSeenInfoContext(contextKey) {
  if (!contextKey) return true;

  const raw = await AsyncStorage.getItem(KEYS.INFO_CONTEXT_SEEN);
  const data = readStoredJson(raw, {});

  return !!data[contextKey];
}

export async function markInfoContextSeen(contextKey) {
  if (!contextKey) return;

  const raw = await AsyncStorage.getItem(KEYS.INFO_CONTEXT_SEEN);
  const data = readStoredJson(raw, {});

  data[contextKey] = true;

  await AsyncStorage.setItem(
    KEYS.INFO_CONTEXT_SEEN,
    JSON.stringify(data)
  );
}

function getLanguageProfileKey(language) {
  const key = KEYS[`PROFILE_${String(language).toUpperCase()}`];
  if (!key) throw new Error(`Unknown Language: ${language}`);
  return key;
}

async function migrateSharedProfile() {
  if ((await AsyncStorage.getItem(KEYS.PROFILE_MIGRATED)) === 'true') return;

  // Never left pending, so a default Language saved later cannot receive another Language's data.
  // Without a saved default Language, Home opens Louisiana French.
  const defaultKey = getLanguageProfileKey((await getDefaultLanguage()) || 'cajun');
  const shared = await AsyncStorage.getItem(KEYS.PROFILE);

  if (shared && !(await AsyncStorage.getItem(defaultKey))) {
    await AsyncStorage.setItem(defaultKey, shared);
  }

  await AsyncStorage.setItem(KEYS.PROFILE_MIGRATED, 'true');
}

export async function getProfile(language) {
  const key = getLanguageProfileKey(language);
  await migrateSharedProfile();
  const raw = await AsyncStorage.getItem(key);
  return readStoredJson(raw, defaultProfile);
}

export async function saveProfile(language, profile) {
  await AsyncStorage.setItem(
    getLanguageProfileKey(language),
    JSON.stringify(profile)
  );
}

export async function getLessonProgress() {
  const raw = await AsyncStorage.getItem(KEYS.LESSON_PROGRESS);
  return readStoredJson(raw, {});
}

export async function saveLessonProgress(progress) {
  await AsyncStorage.setItem(
    KEYS.LESSON_PROGRESS,
    JSON.stringify(progress)
  );
}

export async function getLastWorkedUnit(language) {
  const raw = await AsyncStorage.getItem(KEYS.LAST_WORKED_UNIT);
  const data = readStoredJson(raw, {});

  return data[language] || null;
}

export async function setLastWorkedUnit(language, unitCode) {
  const raw = await AsyncStorage.getItem(KEYS.LAST_WORKED_UNIT);
  const data = readStoredJson(raw, {});

  data[language] = unitCode;

  await AsyncStorage.setItem(
    KEYS.LAST_WORKED_UNIT,
    JSON.stringify(data)
  );
}

export async function markLessonComplete(language, lessonId) {
  const progress = await getLessonProgress();

  progress[`${language}:${lessonId}`] = {
    completed: true,
    completedAt: getNow().toISOString()
  };

  await saveLessonProgress(progress);
}

function wordMasteryStatus({ seen, correct, wrong }) {
  if (correct >= 4 && correct > wrong) return 'mastered';
  if (correct >= 2 && correct > wrong) return 'strong';
  if (seen >= 1) return 'learning';
  return 'new';
}

// A saved status is not authoritative: it is recalculated from the answer counts on every read.
export async function getWordProgress() {
  const raw = await AsyncStorage.getItem(KEYS.WORD_PROGRESS);
  const progress = readStoredJson(raw, {});

  for (const record of Object.values(progress)) {
    if (!isRecord(record)) continue;
    record.status = wordMasteryStatus(record);
  }

  return progress;
}

export async function saveWordProgress(progress) {
  await AsyncStorage.setItem(
    KEYS.WORD_PROGRESS,
    JSON.stringify(progress)
  );
}

export async function updateWordProgress(
  language,
  rowId,
  wasCorrect
) {
  const progress = await getWordProgress();
  const key = `${language}:${rowId}`;

  const current = progress[key] || {
    seen: 0,
    correct: 0,
    wrong: 0,
    status: 'new'
  };

  current.seen += 1;

  if (wasCorrect) {
    current.correct += 1;
  } else {
    current.wrong += 1;
  }

  current.status = wordMasteryStatus(current);

  progress[key] = current;

  await saveWordProgress(progress);
}

function readObjectStore(raw) {
  if (raw == null || raw === '') return { ok: true, value: {} };
  try {
    const value = JSON.parse(raw);
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function lessonOrder(language) {
  const order = new Map();
  getLessonsByLanguage(language).forEach((lesson, index) => order.set(lesson.id, index));
  return order;
}

function completedLesson(progress, language, lessonId) {
  const record = progress[`${language}:${lessonId}`];
  return isRecord(record) && record.completed ? record : null;
}

function chooseLegacyLesson(language, copies, pending, progress, order) {
  const lessonIds = Object.keys(copies);
  if (pending && copies[pending.sourceId]) return pending.sourceId;

  const completed = lessonIds.filter((lessonId) => completedLesson(progress, language, lessonId));
  if (completed.length === 1) return completed[0];

  const rank = (lessonId) => (order.has(lessonId) ? order.get(lessonId) : Number.MAX_SAFE_INTEGER);
  if (completed.length > 1) {
    return completed.slice().sort((left, right) => {
      const leftTime = Date.parse(completedLesson(progress, language, left).completedAt);
      const rightTime = Date.parse(completedLesson(progress, language, right).completedAt);
      const leftOk = Number.isFinite(leftTime);
      const rightOk = Number.isFinite(rightTime);
      if (leftOk && rightOk && leftTime !== rightTime) return leftTime - rightTime;
      if (leftOk !== rightOk) return leftOk ? -1 : 1;
      return rank(left) - rank(right);
    })[0];
  }

  return lessonIds.slice().sort((left, right) => rank(left) - rank(right))[0];
}

// One startup pass. Read paths stay clear of this so a review write cannot race it.
// A record already stored under the new id wins. A null record is left in place.
export async function migrateLegacyCardIds() {
  const reviewStore = readObjectStore(await AsyncStorage.getItem(KEYS.REVIEW_STATE));
  const mistakeStore = readObjectStore(await AsyncStorage.getItem(KEYS.PENDING_MISTAKES));
  const progressStore = readObjectStore(await AsyncStorage.getItem(KEYS.LESSON_PROGRESS));
  const progress = progressStore.ok ? progressStore.value : {};
  let reviewDirty = false;
  let mistakesDirty = false;

  for (const language of ['cajun', 'kreole']) {
    const map = legacyCardIds[language];
    if (!isRecord(map)) continue;
    const order = lessonOrder(language);
    const mistakes = mistakeStore.ok && isRecord(mistakeStore.value[language])
      ? mistakeStore.value[language]
      : null;

    for (const [oldId, copies] of Object.entries(map)) {
      if (!isRecord(copies)) continue;
      const reviewHas = reviewStore.ok && Object.prototype.hasOwnProperty.call(reviewStore.value, oldId);
      const mistakeHas = mistakes != null && Object.prototype.hasOwnProperty.call(mistakes, oldId);
      const reviewRecord = reviewHas ? reviewStore.value[oldId] : null;
      const mistakeRecord = mistakeHas ? mistakes[oldId] : null;
      if (!isRecord(reviewRecord) && !isRecord(mistakeRecord)) continue;

      const newId = copies[chooseLegacyLesson(
        language,
        copies,
        isRecord(mistakeRecord) ? mistakeRecord : null,
        progress,
        order
      )];
      if (!newId) continue;

      if (isRecord(reviewRecord)) {
        if (!Object.prototype.hasOwnProperty.call(reviewStore.value, newId)) {
          reviewStore.value[newId] = { ...reviewRecord };
        }
        delete reviewStore.value[oldId];
        reviewDirty = true;
      }

      if (isRecord(mistakeRecord)) {
        if (!Object.prototype.hasOwnProperty.call(mistakes, newId)) {
          mistakes[newId] = { ...mistakeRecord, cardId: newId };
        }
        delete mistakes[oldId];
        mistakesDirty = true;
      }
    }
  }

  if (reviewDirty) {
    await AsyncStorage.setItem(KEYS.REVIEW_STATE, JSON.stringify(reviewStore.value));
  }
  if (mistakesDirty) {
    await AsyncStorage.setItem(KEYS.PENDING_MISTAKES, JSON.stringify(mistakeStore.value));
  }
  await AsyncStorage.setItem(KEYS.CARD_ID_MIGRATION, '1');
}

export async function getReviewState() {
  const raw = await AsyncStorage.getItem(KEYS.REVIEW_STATE);
  return readStoredJson(raw, {});
}

export async function saveReviewState(state) {
  await AsyncStorage.setItem(
    KEYS.REVIEW_STATE,
    JSON.stringify(state)
  );
}

export async function getDailyReviewLog() {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_REVIEW_LOG);
  return readStoredJson(raw, {});
}

export async function markDailyReviewDone(dateKey) {
  const log = await getDailyReviewLog();

  log[dateKey] = true;

  await AsyncStorage.setItem(
    KEYS.DAILY_REVIEW_LOG,
    JSON.stringify(log)
  );
}

function getLanguageDailyReviewKey(language) {
  return KEYS[
    `DAILY_REVIEW_LOG_V2_${language.toUpperCase()}`
  ];
}

export async function getLanguageDailyReviewLog(language) {
  const key = getLanguageDailyReviewKey(language);

  const raw = await AsyncStorage.getItem(key);
  const current = readStoredJson(raw, {});

  if (
    (await AsyncStorage.getItem(
      KEYS.DAILY_REVIEW_MIGRATED
    )) === 'true'
  ) {
    return current;
  }

  // Never left pending, so a default Language saved later cannot receive another Language's data.
  // Without a saved default Language, Home opens Louisiana French.
  const defaultLanguage = (await getDefaultLanguage()) || 'cajun';

  const legacy = await getDailyReviewLog();

  const defaultKey =
    getLanguageDailyReviewKey(defaultLanguage);

  const defaultRaw =
    defaultLanguage === language
      ? raw
      : await AsyncStorage.getItem(defaultKey);

  const defaultLog = readStoredJson(defaultRaw, {});

  const shouldImport =
    !Object.keys(defaultLog).length &&
    Object.keys(legacy).length;

  if (shouldImport) {
    await AsyncStorage.setItem(
      defaultKey,
      JSON.stringify(legacy)
    );
  }

  await AsyncStorage.setItem(
    KEYS.DAILY_REVIEW_MIGRATED,
    'true'
  );

  return shouldImport && defaultLanguage === language
    ? readStoredJson(await AsyncStorage.getItem(key), {})
    : current;
}

export async function markLanguageDailyReviewDone(
  language,
  dateKey
) {
  const log = await getLanguageDailyReviewLog(language);

  log[dateKey] = true;

  await AsyncStorage.setItem(
    getLanguageDailyReviewKey(language),
    JSON.stringify(log)
  );

  await markDailyReviewDone(dateKey);
}

export function getTodayKey() {
  const d = getNow();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

export async function getPendingMistakes(language) {
  const raw = await AsyncStorage.getItem(
    KEYS.PENDING_MISTAKES
  );

  const data = readStoredJson(raw, {});
  const bucket = data[language];
  if (!isRecord(bucket)) return [];

  return Object.values(bucket);
}

export async function upsertPendingMistake(
  language,
  cardId,
  {
    answer,
    source,
    sourceId
  }
) {
  const raw = await AsyncStorage.getItem(
    KEYS.PENDING_MISTAKES
  );

  const data = readStoredJson(raw, {});

  if (!isRecord(data[language])) data[language] = {};

  data[language][cardId] = {
    cardId,
    answer,
    source,
    sourceId,
    timestamp: getNow().toISOString()
  };

  await AsyncStorage.setItem(
    KEYS.PENDING_MISTAKES,
    JSON.stringify(data)
  );
}

export async function removePendingMistake(
  language,
  cardId
) {
  const raw = await AsyncStorage.getItem(
    KEYS.PENDING_MISTAKES
  );

  const data = readStoredJson(raw, {});

  if (!data[language]?.[cardId]) {
    return;
  }

  delete data[language][cardId];

  if (!Object.keys(data[language]).length) {
    delete data[language];
  }

  await AsyncStorage.setItem(
    KEYS.PENDING_MISTAKES,
    JSON.stringify(data)
  );
}

export async function recordPracticeCompletion(
  language,
  type
) {
  const raw = await AsyncStorage.getItem(
    KEYS.PRACTICE_LOG
  );

  const data = readStoredJson(raw, {});

  if (!isRecord(data[language])) data[language] = {};

  data[language][getTodayKey()] = {
    type,
    completedAt: getNow().toISOString()
  };

  await AsyncStorage.setItem(
    KEYS.PRACTICE_LOG,
    JSON.stringify(data)
  );
}

export async function getTodayPractice(language) {
  const raw = await AsyncStorage.getItem(
    KEYS.PRACTICE_LOG
  );

  const data = readStoredJson(raw, {});

  return data[language]?.[getTodayKey()] || null;
}

export async function getLeaderboard() {
  const raw = await AsyncStorage.getItem(KEYS.LEADERBOARD);
  return readStoredJson(raw, []);
}

export async function upsertLeaderboard(name, xp) {
  const board = await getLeaderboard();

  const idx = board.findIndex(
    (r) => r.name === name
  );

  if (idx >= 0) {
    board[idx].xp = xp;
  } else {
    board.push({
      name,
      xp
    });
  }

  board.sort(
    (a, b) => b.xp - a.xp
  );

  await AsyncStorage.setItem(
    KEYS.LEADERBOARD,
    JSON.stringify(board)
  );
}

function calendarDaysBetween(later, earlier) {
  const utcDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utcDay(later) - utcDay(earlier)) / 86400000);
}

// One Language's Profile at a time: overlapping recordStudyAndXp calls
// used to read the same XP and overwrite each other (#249).
const recordStudyAndXpByLanguage = new Map();

function enqueueRecordStudyAndXp(language, task) {
  const previous = recordStudyAndXpByLanguage.get(language) || Promise.resolve();
  const next = previous.then(task, task);
  // Keep the chain alive after a rejected task so later awards still run.
  recordStudyAndXpByLanguage.set(
    language,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

export function recordStudyAndXp(language, xpEarned) {
  return enqueueRecordStudyAndXp(language, async () => {
    const profile = await getProfile(language);

    const now = getNow();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let streak = profile.streak || 0;

    if (!profile.lastStudyDate) {
      streak = 1;
    } else {
      const last = new Date(
        profile.lastStudyDate
      );

      const lastDay = new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate()
      );

      const diffDays = calendarDaysBetween(today, lastDay);

      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }

    const updated = {
      ...profile,
      xp: (profile.xp || 0) + xpEarned,
      streak,
      lastStudyDate: getNow().toISOString()
    };

    await saveProfile(language, updated);

    await upsertLeaderboard(
      updated.username || 'Player',
      updated.xp
    );

    return updated;
  });
}

export async function isPrefaceRead(prefaceId) {
  const raw = await AsyncStorage.getItem(
    KEYS.PREFACE_READ
  );

  const data = readStoredJson(raw, {});

  return !!data[prefaceId];
}

export async function markPrefaceRead(prefaceId) {
  const raw = await AsyncStorage.getItem(
    KEYS.PREFACE_READ
  );

  const data = readStoredJson(raw, {});

  data[prefaceId] = true;

  await AsyncStorage.setItem(
    KEYS.PREFACE_READ,
    JSON.stringify(data)
  );
}
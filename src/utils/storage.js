import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNow } from './clock';

const KEYS = {
  PROFILE: 'lf_profile',
  LESSON_PROGRESS: 'lf_lesson_progress',
  WORD_PROGRESS: 'lf_word_progress',
  REVIEW_STATE: 'lf_review_state',
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
  const data = raw ? JSON.parse(raw) : {};

  return !!data[contextKey];
}

export async function markInfoContextSeen(contextKey) {
  if (!contextKey) return;

  const raw = await AsyncStorage.getItem(KEYS.INFO_CONTEXT_SEEN);
  const data = raw ? JSON.parse(raw) : {};

  data[contextKey] = true;

  await AsyncStorage.setItem(
    KEYS.INFO_CONTEXT_SEEN,
    JSON.stringify(data)
  );
}

export async function getProfile() {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : defaultProfile;
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(
    KEYS.PROFILE,
    JSON.stringify(profile)
  );
}

export async function getLessonProgress() {
  const raw = await AsyncStorage.getItem(KEYS.LESSON_PROGRESS);
  return raw ? JSON.parse(raw) : {};
}

export async function saveLessonProgress(progress) {
  await AsyncStorage.setItem(
    KEYS.LESSON_PROGRESS,
    JSON.stringify(progress)
  );
}

export async function getLastWorkedUnit(language) {
  const raw = await AsyncStorage.getItem(KEYS.LAST_WORKED_UNIT);
  const data = raw ? JSON.parse(raw) : {};

  return data[language] || null;
}

export async function setLastWorkedUnit(language, unitCode) {
  const raw = await AsyncStorage.getItem(KEYS.LAST_WORKED_UNIT);
  const data = raw ? JSON.parse(raw) : {};

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

export async function getWordProgress() {
  const raw = await AsyncStorage.getItem(KEYS.WORD_PROGRESS);
  return raw ? JSON.parse(raw) : {};
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

  if (
    current.correct >= 4 &&
    current.correct > current.wrong
  ) {
    current.status = 'mastered';
  } else if (current.correct >= 2) {
    current.status = 'strong';
  } else if (current.seen >= 1) {
    current.status = 'learning';
  } else {
    current.status = 'new';
  }

  progress[key] = current;

  await saveWordProgress(progress);
}

export async function getReviewState() {
  const raw = await AsyncStorage.getItem(KEYS.REVIEW_STATE);
  return raw ? JSON.parse(raw) : {};
}

export async function saveReviewState(state) {
  await AsyncStorage.setItem(
    KEYS.REVIEW_STATE,
    JSON.stringify(state)
  );
}

export async function getDailyReviewLog() {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_REVIEW_LOG);
  return raw ? JSON.parse(raw) : {};
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
  const current = raw ? JSON.parse(raw) : {};

  if (
    (await AsyncStorage.getItem(
      KEYS.DAILY_REVIEW_MIGRATED
    )) === 'true'
  ) {
    return current;
  }

  const defaultLanguage = await getDefaultLanguage();

  if (!defaultLanguage) {
    return current;
  }

  const legacy = await getDailyReviewLog();

  const defaultKey =
    getLanguageDailyReviewKey(defaultLanguage);

  const defaultRaw =
    defaultLanguage === language
      ? raw
      : await AsyncStorage.getItem(defaultKey);

  const defaultLog = defaultRaw
    ? JSON.parse(defaultRaw)
    : {};

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
    ? JSON.parse(await AsyncStorage.getItem(key))
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

  const data = raw ? JSON.parse(raw) : {};

  return Object.values(data[language] || {});
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

  const data = raw ? JSON.parse(raw) : {};

  data[language] = data[language] || {};

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

  const data = raw ? JSON.parse(raw) : {};

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

  const data = raw ? JSON.parse(raw) : {};

  data[language] = data[language] || {};

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

  const data = raw ? JSON.parse(raw) : {};

  return data[language]?.[getTodayKey()] || null;
}

export async function getLeaderboard() {
  const raw = await AsyncStorage.getItem(KEYS.LEADERBOARD);
  return raw ? JSON.parse(raw) : [];
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

export async function recordStudyAndXp(xpEarned) {
  const profile = await getProfile();

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

    const diffDays = Math.floor(
      (today - lastDay) / 86400000
    );

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

  await saveProfile(updated);

  await upsertLeaderboard(
    updated.username || 'Player',
    updated.xp
  );

  return updated;
}

export async function isPrefaceRead(prefaceId) {
  const raw = await AsyncStorage.getItem(
    KEYS.PREFACE_READ
  );

  const data = raw ? JSON.parse(raw) : {};

  return !!data[prefaceId];
}

export async function markPrefaceRead(prefaceId) {
  const raw = await AsyncStorage.getItem(
    KEYS.PREFACE_READ
  );

  const data = raw ? JSON.parse(raw) : {};

  data[prefaceId] = true;

  await AsyncStorage.setItem(
    KEYS.PREFACE_READ,
    JSON.stringify(data)
  );
}
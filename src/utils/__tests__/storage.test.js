import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDefaultLanguage,
  setDefaultLanguage,
  hasSelectedLanguage,
  markLanguageSelected,
  getProfile,
  saveProfile,
  getLessonProgress,
  markLessonComplete,
  getWordProgress,
  updateWordProgress,
  getReviewState,
  getDailyReviewLog,
  markDailyReviewDone,
  getTodayKey,
  getLeaderboard,
  upsertLeaderboard,
  recordStudyAndXp
} from '../storage';

// Characterizes the current Learner Progress storage interface
// (`src/utils/storage.js`) against the real AsyncStorage jest mock. See
// `.scratch/architecture-modernization/issues/02-characterize-catalog-and-progress.md`.
//
// Screens (DailyReviewScreen, MistakeReviewScreen) are explicitly out of
// scope. KD-01 and KD-05 are not exercised here.

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Language selection', () => {
  it('defaults to no selected Language', async () => {
    expect(await getDefaultLanguage()).toBeNull();
    expect(await hasSelectedLanguage()).toBe(false);
  });

  it('persists the selected Language and selection flag', async () => {
    await setDefaultLanguage('kreole');
    await markLanguageSelected();

    expect(await getDefaultLanguage()).toBe('kreole');
    expect(await hasSelectedLanguage()).toBe(true);
  });
});

describe('Profile', () => {
  it('defaults to a fresh Profile when unset', async () => {
    expect(await getProfile()).toEqual({
      username: 'Player',
      xp: 0,
      streak: 0,
      lastStudyDate: null
    });
  });

  it('persists a saved Profile', async () => {
    await saveProfile({ username: 'Marie', xp: 40, streak: 2, lastStudyDate: null });
    expect(await getProfile()).toEqual({
      username: 'Marie',
      xp: 40,
      streak: 2,
      lastStudyDate: null
    });
  });

  it('rejects when the persisted Profile record is malformed JSON', async () => {
    await AsyncStorage.setItem('lf_profile', 'not-json');
    await expect(getProfile()).rejects.toThrow();
  });
});

describe('Lesson completion', () => {
  it('defaults to no Lesson progress', async () => {
    expect(await getLessonProgress()).toEqual({});
  });

  it('marks a Lesson complete with a timestamp keyed by Language and Lesson id', async () => {
    jest.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));

    await markLessonComplete('cajun', 'cajun_u01_l01');

    const progress = await getLessonProgress();
    expect(progress['cajun:cajun_u01_l01']).toEqual({
      completed: true,
      completedAt: new Date(2026, 0, 15, 12, 0, 0).toISOString()
    });
  });

  it('keeps completion records for different Languages and Lessons separate', async () => {
    await markLessonComplete('cajun', 'cajun_u01_l01');
    await markLessonComplete('kreole', 'kreole_u01_l01');

    const progress = await getLessonProgress();
    expect(Object.keys(progress).sort()).toEqual(['cajun:cajun_u01_l01', 'kreole:kreole_u01_l01']);
  });
});

describe('Word mastery status', () => {
  it('defaults to no Word progress', async () => {
    expect(await getWordProgress()).toEqual({});
  });

  it('progresses a Word from new through learning, strong, to mastered on repeated correct answers', async () => {
    const key = 'cajun:u01_w0001';

    await updateWordProgress('cajun', 'u01_w0001', true);
    expect((await getWordProgress())[key].status).toBe('learning');

    await updateWordProgress('cajun', 'u01_w0001', true);
    expect((await getWordProgress())[key].status).toBe('strong');

    await updateWordProgress('cajun', 'u01_w0001', true);
    expect((await getWordProgress())[key].status).toBe('strong');

    await updateWordProgress('cajun', 'u01_w0001', true);
    const final = (await getWordProgress())[key];
    expect(final.status).toBe('mastered');
    expect(final).toMatchObject({ seen: 4, correct: 4, wrong: 0 });
  });

  it('marks a Word "learning" after a single wrong answer with no prior correct answers', async () => {
    // Current interface: the seen>=1 branch is reached before the new/wrong
    // distinction, so an all-wrong Word is not distinguished from a
    // partially-learned one. Characterized as current behavior.
    await updateWordProgress('cajun', 'u01_w0002', false);
    const record = (await getWordProgress())['cajun:u01_w0002'];
    expect(record).toMatchObject({ seen: 1, correct: 0, wrong: 1, status: 'learning' });
  });

  it('does not mark a Word mastered when wrong answers equal correct answers', async () => {
    const rowId = 'u01_w0003';
    for (let i = 0; i < 4; i += 1) await updateWordProgress('cajun', rowId, true);
    for (let i = 0; i < 4; i += 1) await updateWordProgress('cajun', rowId, false);

    const record = (await getWordProgress())['cajun:u01_w0003'];
    expect(record).toMatchObject({ seen: 8, correct: 4, wrong: 4, status: 'strong' });
  });
});

describe('Review state persistence', () => {
  it('defaults to no Card review state', async () => {
    expect(await getReviewState()).toEqual({});
  });
});

describe('Daily Review log', () => {
  it('defaults to no Daily Review completions', async () => {
    expect(await getDailyReviewLog()).toEqual({});
  });

  it('marks a date key as done', async () => {
    await markDailyReviewDone('2026-01-15');
    expect(await getDailyReviewLog()).toEqual({ '2026-01-15': true });
  });

  it('computes today\'s local date key from the system clock', () => {
    jest.setSystemTime(new Date(2026, 2, 5, 23, 30, 0));
    expect(getTodayKey()).toBe('2026-03-05');
  });
});

describe('Leaderboard', () => {
  it('defaults to an empty Leaderboard', async () => {
    expect(await getLeaderboard()).toEqual([]);
  });

  it('inserts a new entry and keeps the Leaderboard sorted descending by xp', async () => {
    await upsertLeaderboard('Marie', 40);
    await upsertLeaderboard('Beau', 90);

    expect(await getLeaderboard()).toEqual([
      { name: 'Beau', xp: 90 },
      { name: 'Marie', xp: 40 }
    ]);
  });

  it('updates an existing entry\'s xp in place rather than duplicating it', async () => {
    await upsertLeaderboard('Marie', 40);
    await upsertLeaderboard('Marie', 100);

    const board = await getLeaderboard();
    expect(board).toEqual([{ name: 'Marie', xp: 100 }]);
  });
});

describe('XP and streak recording', () => {
  it('starts a streak at 1 on the first recorded study session', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));

    const updated = await recordStudyAndXp(15);

    expect(updated.xp).toBe(15);
    expect(updated.streak).toBe(1);
    expect(updated.lastStudyDate).toBe(new Date(2026, 0, 10, 9, 0, 0).toISOString());
  });

  it('increments the streak on a consecutive calendar day', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    await recordStudyAndXp(10);

    jest.setSystemTime(new Date(2026, 0, 11, 9, 0, 0));
    const updated = await recordStudyAndXp(10);

    expect(updated.streak).toBe(2);
    expect(updated.xp).toBe(20);
  });

  it('resets the streak to 1 after a gap of more than one calendar day', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    await recordStudyAndXp(10);

    jest.setSystemTime(new Date(2026, 0, 13, 9, 0, 0));
    const updated = await recordStudyAndXp(10);

    expect(updated.streak).toBe(1);
  });

  it('does not change the streak for a second study session on the same calendar day', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    await recordStudyAndXp(10);

    jest.setSystemTime(new Date(2026, 0, 10, 20, 0, 0));
    const updated = await recordStudyAndXp(5);

    expect(updated.streak).toBe(1);
    expect(updated.xp).toBe(15);
  });

  it('gracefully handles a partial Profile record missing xp, streak, and lastStudyDate', async () => {
    await saveProfile({ username: 'Marie' });
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));

    const updated = await recordStudyAndXp(10);

    expect(updated.xp).toBe(10);
    expect(updated.streak).toBe(1);
  });

  it('also records the updated xp on the Leaderboard for the Profile username', async () => {
    await saveProfile({ username: 'Beau', xp: 0, streak: 0, lastStudyDate: null });
    await recordStudyAndXp(25);

    expect(await getLeaderboard()).toEqual([{ name: 'Beau', xp: 25 }]);
  });
});

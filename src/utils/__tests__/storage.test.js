import AsyncStorage from '@react-native-async-storage/async-storage';
import { clock } from '../../test/fixtures/clock';
import {
  completedLessons,
  dailyReviewLogs,
  leaderboardEntries,
  leaderboards,
  profiles,
  wordMastery
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import {
  seedAsyncStorage,
  seedRawAsyncStorage
} from '../../test/fixtures/learnerProgress/seedAsyncStorage';
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
  recordStudyAndXp,
  isPrefaceRead,
  markPrefaceRead
} from '../storage';

// Characterizes the current Learner Progress storage interface
// (`src/utils/storage.js`) against the real AsyncStorage jest mock.
//
// Screens (DailyReviewScreen, MistakeReviewScreen) are explicitly out of
// scope. The resolved Daily Review defect and Issue #30 are not exercised here.

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
    expect(await getProfile()).toEqual(profiles.fresh);
  });

  it('persists a saved Profile', async () => {
    await saveProfile(profiles.established);
    expect(await getProfile()).toEqual(profiles.established);
  });

  it('rejects when the persisted Profile record is malformed JSON', async () => {
    await seedRawAsyncStorage({ profile: 'not-json' });
    await expect(getProfile()).rejects.toThrow();
  });
});

describe('Lesson completion', () => {
  it('defaults to no Lesson progress', async () => {
    expect(await getLessonProgress()).toEqual({});
  });

  it('marks a Lesson complete with a timestamp keyed by Language and Lesson id', async () => {
    jest.setSystemTime(clock.lessonCompletion());

    await markLessonComplete('cajun', 'cajun_u01_l01');

    const progress = await getLessonProgress();
    expect(progress['cajun:cajun_u01_l01']).toEqual(completedLessons.cajunFirst);
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
    expect(final).toEqual(wordMastery.mastered);
  });

  it('marks a Word "learning" after a single wrong answer with no prior correct answers', async () => {
    // Current interface: the seen>=1 branch is reached before the new/wrong
    // distinction, so an all-wrong Word is not distinguished from a
    // partially-learned one. Characterized as current behavior.
    await updateWordProgress('cajun', 'u01_w0002', false);
    const record = (await getWordProgress())['cajun:u01_w0002'];
    expect(record).toEqual(wordMastery.learningAfterWrong);
  });

  it('does not mark a Word mastered when wrong answers equal correct answers', async () => {
    const rowId = 'u01_w0003';
    for (let i = 0; i < 4; i += 1) await updateWordProgress('cajun', rowId, true);
    for (let i = 0; i < 4; i += 1) await updateWordProgress('cajun', rowId, false);

    const record = (await getWordProgress())['cajun:u01_w0003'];
    expect(record).toEqual(wordMastery.strongWithEqualAnswers);
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
    expect(await getDailyReviewLog()).toEqual(dailyReviewLogs.completed);
  });

  it('computes today\'s local date key from the system clock', () => {
    jest.setSystemTime(clock.localCalendarLateEvening());
    expect(getTodayKey()).toBe('2026-03-05');
  });
});

describe('Leaderboard', () => {
  it('defaults to an empty Leaderboard', async () => {
    expect(await getLeaderboard()).toEqual([]);
  });

  it('inserts a new entry and keeps the Leaderboard sorted descending by xp', async () => {
    await upsertLeaderboard(leaderboardEntries.marie.name, leaderboardEntries.marie.xp);
    await upsertLeaderboard(leaderboardEntries.beau.name, leaderboardEntries.beau.xp);

    expect(await getLeaderboard()).toEqual(leaderboards.sorted);
  });

  it('updates an existing entry\'s xp in place rather than duplicating it', async () => {
    await upsertLeaderboard(leaderboardEntries.marie.name, leaderboardEntries.marie.xp);
    await upsertLeaderboard(leaderboardEntries.marie.name, 100);

    const board = await getLeaderboard();
    expect(board).toEqual([{ name: 'Marie', xp: 100 }]);
  });
});

describe('XP and streak recording', () => {
  it('starts a streak at 1 on the first recorded study session', async () => {
    jest.setSystemTime(clock.studyDay());

    const updated = await recordStudyAndXp(15);

    expect(updated.xp).toBe(15);
    expect(updated.streak).toBe(1);
    expect(updated.lastStudyDate).toBe(clock.studyDay().toISOString());
  });

  it('increments the streak on a consecutive calendar day', async () => {
    jest.setSystemTime(clock.studyDay());
    await recordStudyAndXp(10);

    jest.setSystemTime(clock.consecutiveStudyDay());
    const updated = await recordStudyAndXp(10);

    expect(updated.streak).toBe(2);
    expect(updated.xp).toBe(20);
  });

  it('resets the streak to 1 after a gap of more than one calendar day', async () => {
    jest.setSystemTime(clock.studyDay());
    await recordStudyAndXp(10);

    jest.setSystemTime(clock.gapStudyDay());
    const updated = await recordStudyAndXp(10);

    expect(updated.streak).toBe(1);
  });

  it('does not change the streak for a second study session on the same calendar day', async () => {
    jest.setSystemTime(clock.studyDay());
    await recordStudyAndXp(10);

    jest.setSystemTime(clock.sameStudyDay());
    const updated = await recordStudyAndXp(5);

    expect(updated.streak).toBe(1);
    expect(updated.xp).toBe(15);
  });

  it('gracefully handles a partial Profile record missing xp, streak, and lastStudyDate', async () => {
    await seedAsyncStorage({ profile: profiles.legacyPartial });
    jest.setSystemTime(clock.studyDay());

    const updated = await recordStudyAndXp(10);

    expect(updated.xp).toBe(10);
    expect(updated.streak).toBe(1);
  });

  it('also records the updated xp on the Leaderboard for the Profile username', async () => {
    await saveProfile(profiles.beau);
    await recordStudyAndXp(25);

    expect(await getLeaderboard()).toEqual([{ name: 'Beau', xp: 25 }]);
  });
});

describe('Preface read tracking', () => {
  it('returns false for an unmarked id', async () => {
    expect(await isPrefaceRead('cajun:u03')).toBe(false);
  });

  it('returns true after markPrefaceRead', async () => {
    await markPrefaceRead('cajun:u03');
    expect(await isPrefaceRead('cajun:u03')).toBe(true);
  });

  it('treats different ids independently', async () => {
    await markPrefaceRead('cajun:u03');
    expect(await isPrefaceRead('cajun:u03')).toBe(true);
    expect(await isPrefaceRead('kreole:u01')).toBe(false);
  });

  it('persists the read state across calls', async () => {
    await markPrefaceRead('cajun:u03');
    await markPrefaceRead('kreole:u01');

    expect(await isPrefaceRead('cajun:u03')).toBe(true);
    expect(await isPrefaceRead('kreole:u01')).toBe(true);
    expect(await isPrefaceRead('kreole:u02')).toBe(false);
  });
});

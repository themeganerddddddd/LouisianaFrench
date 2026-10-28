import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../learnerProgress';
import { KEYS as preferenceKeys } from '../../utils/devicePreferences';
import { KEYS as leaderboardKeys } from '../../utils/leaderboard';
import {
  isLanguageEmpty,
  readSavedLearnerProgress,
  restoreSavedLearnerProgress,
  sameSavedLearnerProgress
} from '../savedLearnerProgress';

const cajunProfile = {
  username: 'Ada',
  xp: 0,
  streak: 1,
  lastStudyDate: '2026-10-25T12:00:00.000Z'
};

async function seedCajun() {
  await AsyncStorage.setItem(KEYS.PROFILE_CAJUN, JSON.stringify(cajunProfile));
  await AsyncStorage.setItem(
    KEYS.LESSON_PROGRESS,
    JSON.stringify({
      'cajun:greet-1': { completed: true, completedAt: '2026-10-25T12:00:00.000Z' },
      'kreole:greet-1': { completed: true, completedAt: '2026-10-20T12:00:00.000Z' }
    })
  );
  await AsyncStorage.setItem(
    KEYS.WORD_PROGRESS,
    JSON.stringify({
      'cajun:w1': { seen: 2, correct: 2, wrong: 0, status: 'stale' },
      'kreole:w1': { seen: 1, correct: 0, wrong: 1 }
    })
  );
  await AsyncStorage.setItem(
    KEYS.REVIEW_STATE,
    JSON.stringify({
      'cajun:w1:mc': {
        repetitions: 2,
        interval: 3,
        easeFactor: 2.5,
        nextReviewAt: '2026-10-26T12:00:00.000Z',
        lapses: 0
      },
      'kreole:w1:mc': {
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
        nextReviewAt: '2026-10-21T12:00:00.000Z',
        lapses: 1
      }
    })
  );
  await AsyncStorage.setItem(
    KEYS.PENDING_MISTAKES,
    JSON.stringify({
      cajun: {
        'cajun:w1:mc': {
          cardId: 'cajun:w1:mc',
          answer: 'bonjour',
          source: 'lesson',
          sourceId: 'greet-1',
          timestamp: '2026-10-25T12:01:00.000Z'
        }
      },
      kreole: {
        'kreole:w1:mc': {
          cardId: 'kreole:w1:mc',
          answer: 'bonjou',
          source: 'lesson',
          sourceId: 'greet-1',
          timestamp: '2026-10-20T12:01:00.000Z'
        }
      }
    })
  );
  await AsyncStorage.setItem(
    KEYS.PRACTICE_LOG,
    JSON.stringify({
      cajun: { '2026-10-25': { type: 'speech', completedAt: '2026-10-25T13:00:00.000Z' } },
      kreole: { '2026-10-20': { type: 'speech', completedAt: '2026-10-20T13:00:00.000Z' } }
    })
  );
  await AsyncStorage.setItem(
    KEYS.LAST_WORKED_UNIT,
    JSON.stringify({ cajun: 'U1', kreole: 'U2' })
  );
  await AsyncStorage.setItem(KEYS.DAILY_REVIEW_MIGRATED, 'true');
  await AsyncStorage.setItem(
    KEYS.DAILY_REVIEW_LOG_V2_CAJUN,
    JSON.stringify({ '2026-10-25': true })
  );
  await AsyncStorage.setItem(
    KEYS.DAILY_REVIEW_LOG_V2_KREOLE,
    JSON.stringify({ '2026-10-20': true })
  );
  await AsyncStorage.setItem(leaderboardKeys.LEADERBOARD, JSON.stringify([{ name: 'Ada', xp: 9 }]));
  await AsyncStorage.setItem(preferenceKeys.HAS_SELECTED_LANGUAGE, 'true');
}

async function clearCajun() {
  await AsyncStorage.removeItem(KEYS.PROFILE_CAJUN);
  const lessons = JSON.parse(await AsyncStorage.getItem(KEYS.LESSON_PROGRESS));
  delete lessons['cajun:greet-1'];
  await AsyncStorage.setItem(KEYS.LESSON_PROGRESS, JSON.stringify(lessons));
  const words = JSON.parse(await AsyncStorage.getItem(KEYS.WORD_PROGRESS));
  delete words['cajun:w1'];
  await AsyncStorage.setItem(KEYS.WORD_PROGRESS, JSON.stringify(words));
  const reviews = JSON.parse(await AsyncStorage.getItem(KEYS.REVIEW_STATE));
  delete reviews['cajun:w1:mc'];
  await AsyncStorage.setItem(KEYS.REVIEW_STATE, JSON.stringify(reviews));
  const mistakes = JSON.parse(await AsyncStorage.getItem(KEYS.PENDING_MISTAKES));
  delete mistakes.cajun;
  await AsyncStorage.setItem(KEYS.PENDING_MISTAKES, JSON.stringify(mistakes));
  const practice = JSON.parse(await AsyncStorage.getItem(KEYS.PRACTICE_LOG));
  delete practice.cajun;
  await AsyncStorage.setItem(KEYS.PRACTICE_LOG, JSON.stringify(practice));
  const units = JSON.parse(await AsyncStorage.getItem(KEYS.LAST_WORKED_UNIT));
  delete units.cajun;
  await AsyncStorage.setItem(KEYS.LAST_WORKED_UNIT, JSON.stringify(units));
  await AsyncStorage.removeItem(KEYS.DAILY_REVIEW_LOG_V2_CAJUN);
}

describe('Saved Learner Progress for one Language', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('treats a missing profile as empty and a saved zero-XP profile as progress', async () => {
    expect(isLanguageEmpty(await readSavedLearnerProgress('cajun'))).toBe(true);

    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 0, streak: 0, lastStudyDate: null })
    );

    const record = await readSavedLearnerProgress('cajun');
    expect(isLanguageEmpty(record)).toBe(false);
    expect(record.profile.xp).toBe(0);
    expect(isLanguageEmpty(await readSavedLearnerProgress('kreole'))).toBe(true);
  });

  it('reads one Language and leaves the other Language out', async () => {
    await seedCajun();
    const cajun = await readSavedLearnerProgress('cajun');
    const kreole = await readSavedLearnerProgress('kreole');

    expect(cajun.completedLessons['kreole:greet-1']).toBeUndefined();
    expect(cajun.wordMastery['cajun:w1']).toEqual({ seen: 2, correct: 2, wrong: 0 });
    expect(cajun.cardReviews['cajun:w1:mc'].interval).toBe(3);
    expect(cajun.pendingMistakes['cajun:w1:mc'].answer).toBe('bonjour');
    expect(cajun.practiceDays['2026-10-25'].type).toBe('speech');
    expect(cajun.lastWorkedUnit).toBe('U1');
    expect(cajun.dailyReviewDays['2026-10-25']).toBe(true);
    expect(kreole.lastWorkedUnit).toBe('U2');
    expect(kreole.completedLessons['cajun:greet-1']).toBeUndefined();
  });

  it('compares two records for the same Language', async () => {
    await seedCajun();
    const first = await readSavedLearnerProgress('cajun');
    const again = await readSavedLearnerProgress('cajun');
    const other = await readSavedLearnerProgress('kreole');
    expect(sameSavedLearnerProgress(first, again)).toBe(true);
    expect(sameSavedLearnerProgress(first, other)).toBe(false);
    expect(sameSavedLearnerProgress(first, { ...first, profile: { ...first.profile, xp: 4 } })).toBe(
      false
    );
  });

  it('restores one empty Language and does not change the other', async () => {
    await seedCajun();
    const saved = await readSavedLearnerProgress('cajun');
    const kreoleBefore = await readSavedLearnerProgress('kreole');
    await clearCajun();
    expect(isLanguageEmpty(await readSavedLearnerProgress('cajun'))).toBe(true);

    await restoreSavedLearnerProgress('cajun', saved);

    expect(sameSavedLearnerProgress(await readSavedLearnerProgress('cajun'), saved)).toBe(true);
    expect(sameSavedLearnerProgress(await readSavedLearnerProgress('kreole'), kreoleBefore)).toBe(
      true
    );
    expect(JSON.parse(await AsyncStorage.getItem(leaderboardKeys.LEADERBOARD))).toEqual([{ name: 'Ada', xp: 9 }]);
    expect(await AsyncStorage.getItem(preferenceKeys.HAS_SELECTED_LANGUAGE)).toBe('true');
  });

  it('does not restore onto a Language that already has Learner Progress', async () => {
    await seedCajun();
    const saved = await readSavedLearnerProgress('cajun');
    await expect(restoreSavedLearnerProgress('cajun', saved)).rejects.toThrow(/empty Language/);
  });
});

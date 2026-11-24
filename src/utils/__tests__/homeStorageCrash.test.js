import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedRawAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { profiles } from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { getHomeProjection } from '../homeProjection';
import {
  getLastWorkedUnit,
  getLeaderboard,
  getLessonProgress,
  getPendingMistakes,
  getProfile,
  getReviewState,
  getWordProgress,
  isPrefaceRead
} from '../storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Home mistake count with a bad pending record', () => {
  it('counts a null or blank pending mistake instead of throwing', async () => {
    await seedRawAsyncStorage({
      pendingMistakes: JSON.stringify({
        cajun: {
          blank: '',
          spaced: '   ',
          gone: null
        }
      })
    });

    const projection = await getHomeProjection('cajun');

    expect(await getPendingMistakes('cajun')).toEqual(['', '   ', null]);
    expect(projection.dashboard.pendingMistakeCount).toBe(3);
  });
});

describe('Home projection with unreadable saved progress', () => {
  it('loads the dashboard from defaults when storage values are not JSON', async () => {
    await seedRawAsyncStorage({
      pendingMistakes: '{',
      practiceLog: 'not-json',
      profileCajun: 'not-json',
      profileMigrated: 'true',
      lessonProgress: '{',
      wordProgress: 'not-json',
      reviewState: '{',
      dailyReviewLogV2Cajun: 'not-json',
      dailyReviewMigrated: 'true',
      lastWorkedUnit: '{',
      leaderboard: 'not-json'
    });
    await AsyncStorage.setItem('lf_preface_read', '{');

    const projection = await getHomeProjection('cajun');

    expect(projection.dashboard.pendingMistakeCount).toBe(0);
    expect(projection.dashboard.xp).toBe(0);
    expect(projection.dashboard.streak).toBe(0);
    expect(await getProfile('cajun')).toEqual(profiles.fresh);
    expect(await getLessonProgress()).toEqual({});
    expect(await getWordProgress()).toEqual({});
    expect(await getReviewState()).toEqual({});
    expect(await getLastWorkedUnit('cajun')).toBeNull();
    expect(await getLeaderboard()).toEqual([]);
    expect(await isPrefaceRead('welcome')).toBe(false);
    expect(await AsyncStorage.getItem('lf_pending_mistakes')).toBe('{');
    expect(await AsyncStorage.getItem('lf_profile_cajun')).toBe('not-json');
  });
});

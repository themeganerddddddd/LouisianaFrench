import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../learnerProgress';
import { readSavedLearnerProgress, sameSavedLearnerProgress } from '../savedLearnerProgress';
import {
  adoptSavedLearnerProgress,
  createRemoteSavedProgressStore,
  releaseSavedLearnerProgress,
  savedProgressStoreFor
} from '../keepSavedLearnerProgress';

function memoryStore() {
  const rows = new Map();
  const key = (identityId, language) => `${identityId}:${language}`;
  return {
    async read(identityId, language) {
      return rows.get(key(identityId, language)) || null;
    },
    async claim(identityId, language, record) {
      const id = key(identityId, language);
      if (rows.has(id)) return { ok: false };
      rows.set(id, { revision: 1, record });
      return { ok: true, revision: 1 };
    },
    async write() {
      return { ok: false };
    }
  };
}

function jsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body
  };
}

describe('Saved Learner Progress on sign-in', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restores an empty Language and leaves the other Language alone', async () => {
    const store = memoryStore();
    await store.claim('ada', 'cajun', {
      language: 'cajun',
      profile: { username: 'Ada', xp: 2, streak: 1, lastStudyDate: null },
      completedLessons: {},
      wordMastery: {},
      cardReviews: {},
      pendingMistakes: {},
      practiceDays: {},
      lastWorkedUnit: null,
      dailyReviewDays: {}
    });
    await AsyncStorage.setItem(
      KEYS.PROFILE_KREOLE,
      JSON.stringify({ username: 'Kreole', xp: 4, streak: 1, lastStudyDate: null })
    );

    const result = await adoptSavedLearnerProgress('ada', store);
    expect(result.cajun).toEqual({ action: 'restore', mayUpdate: true });
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');
    expect((await readSavedLearnerProgress('kreole')).profile.username).toBe('Kreole');
  });

  it('does not give the next Identity the previous Learner Progress', async () => {
    const store = memoryStore();
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 2, streak: 1, lastStudyDate: null })
    );
    await adoptSavedLearnerProgress('ada', store);
    await releaseSavedLearnerProgress();

    const next = await adoptSavedLearnerProgress('bea', store);
    expect(next.cajun).toEqual({ action: 'clash', mayUpdate: false });
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');
  });

  it('lets the next Identity Claim progress the first Identity never made', async () => {
    const store = memoryStore();
    await adoptSavedLearnerProgress('ada', store);
    await releaseSavedLearnerProgress('ada');
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Bea', xp: 2, streak: 1, lastStudyDate: null })
    );

    const next = await adoptSavedLearnerProgress('bea', store);
    expect(next.cajun).toEqual({ action: 'claim', mayUpdate: true });
    expect((await store.read('bea', 'cajun')).record.profile.username).toBe('Bea');
  });

  it('keeps progress studied after an empty sign-in from the next Identity', async () => {
    const store = memoryStore();
    await adoptSavedLearnerProgress('ada', store);
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 2, streak: 1, lastStudyDate: null })
    );
    await releaseSavedLearnerProgress('ada');

    const next = await adoptSavedLearnerProgress('bea', store);
    expect(next.cajun).toEqual({ action: 'clash', mayUpdate: false });
    expect(await store.read('bea', 'cajun')).toBeNull();
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');

    const again = await adoptSavedLearnerProgress('ada', store);
    expect(again.cajun).toEqual({ action: 'claim', mayUpdate: true });
    expect((await store.read('ada', 'cajun')).record.profile.username).toBe('Ada');
  });

  it('does not Claim when the saved rows cannot be read', async () => {
    const store = {
      async read() {
        throw new Error('network');
      },
      async claim() {
        throw new Error('claim should not run');
      }
    };
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 2, streak: 1, lastStudyDate: null })
    );
    const result = await adoptSavedLearnerProgress('ada', store);
    expect(result.cajun).toEqual({ action: 'none', mayUpdate: false });
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');

    const next = await adoptSavedLearnerProgress('bea', store);
    expect(next.cajun).toEqual({ action: 'clash', mayUpdate: false });
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');
  });

  it('does not open a store without the public Identity configuration', () => {
    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    try {
      expect(savedProgressStoreFor({ getAccessToken: async () => 'token' })).toBeNull();
    } finally {
      if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousKey;
    }
  });
});

describe('remote Saved Learner Progress store', () => {
  const store = createRemoteSavedProgressStore({
    url: 'https://identity.example',
    anonKey: 'anon-key',
    getAccessToken: async () => 'learner-token'
  });

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('reads only that learner rows into a Language record', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('language_progress')) {
        return jsonResponse([
          {
            revision: 4,
            username: 'Ada',
            xp: 2,
            streak: 1,
            last_study_at: '2026-10-25T12:00:00+00:00',
            last_worked_unit: 'U1'
          }
        ]);
      }
      if (String(url).includes('completed_lesson')) {
        return jsonResponse([{ lesson_id: 'l1', completed_at: '2026-10-25T12:00:00+00:00' }]);
      }
      return jsonResponse([]);
    });

    const saved = await store.read('ada', 'cajun');
    expect(saved.revision).toBe(4);
    expect(saved.record.profile).toEqual({
      username: 'Ada',
      xp: 2,
      streak: 1,
      lastStudyDate: '2026-10-25T12:00:00.000Z'
    });
    expect(saved.record.completedLessons['cajun:l1'].completedAt).toBe('2026-10-25T12:00:00.000Z');
    expect(sameSavedLearnerProgress(saved.record, {
      ...saved.record,
      profile: { ...saved.record.profile, lastStudyDate: '2026-10-25T12:00:00.000Z' },
      completedLessons: {
        'cajun:l1': { completed: true, completedAt: '2026-10-25T12:00:00.000Z' }
      }
    })).toBe(true);
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer learner-token');
    expect(global.fetch.mock.calls[0][1].headers.apikey).toBe('anon-key');
  });

  it('claims the current rows in one call', async () => {
    global.fetch.mockResolvedValue(jsonResponse(1));
    const result = await store.claim('ada', 'cajun', {
      language: 'cajun',
      profile: { username: 'Ada', xp: 2, streak: 1, lastStudyDate: null },
      lastWorkedUnit: 'U1',
      completedLessons: {
        'cajun:l1': { completed: true, completedAt: '2026-10-25T12:00:00.000Z' }
      },
      wordMastery: {},
      cardReviews: {},
      pendingMistakes: {},
      practiceDays: {},
      dailyReviewDays: {}
    });
    expect(result).toEqual({ ok: true, revision: 1 });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.p_lesson_ids).toEqual(['l1']);
    expect(body.p_username).toBe('Ada');
    expect(String(global.fetch.mock.calls[0][0])).toContain('claim_saved_learner_progress_batch');
  });

  it('stops a stale revision and retries a failed request', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ code: '40001', message: 'stale' }, false, 400));
    await expect(store.write('ada', 'cajun', 1, { p_ops: ['profile'] })).resolves.toEqual({ ok: false });

    global.fetch.mockRejectedValueOnce(new Error('network'));
    await expect(store.write('ada', 'cajun', 2, { p_ops: ['profile'] })).resolves.toEqual({
      ok: false,
      retry: true
    });
  });
});

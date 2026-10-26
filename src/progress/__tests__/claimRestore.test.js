import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../utils/storage';
import {
  noteSignOut,
  onIdentityForLanguage,
  writeSavedUpdate
} from '../claimRestore';
import { readSavedLearnerProgress } from '../savedLearnerProgress';

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
    async write(identityId, language, revision, record) {
      const id = key(identityId, language);
      const row = rows.get(id);
      if (!row || row.revision !== revision) return { ok: false };
      rows.set(id, { revision: revision + 1, record });
      return { ok: true, revision: revision + 1 };
    }
  };
}

async function saveCajunProfile(username) {
  await AsyncStorage.setItem(
    KEYS.PROFILE_CAJUN,
    JSON.stringify({ username, xp: 2, streak: 1, lastStudyDate: '2026-10-25T12:00:00.000Z' })
  );
}

describe('Claim and Restore against a fake store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('does nothing when the Language is empty and nothing is saved', async () => {
    const store = memoryStore();
    const result = await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    expect(result).toEqual({ action: 'none', mayUpdate: false });
    expect(await store.read('ada', 'cajun')).toBeNull();
  });

  it('claims revision 1 and does not overwrite a row that appears first', async () => {
    const store = memoryStore();
    await saveCajunProfile('Ada');
    const claimed = await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    expect(claimed).toEqual({ action: 'claim', mayUpdate: true });
    expect((await store.read('ada', 'cajun')).revision).toBe(1);

    await AsyncStorage.clear();
    await saveCajunProfile('Other');
    const raced = await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    expect(raced.mayUpdate).toBe(false);
    expect((await store.read('ada', 'cajun')).record.profile.username).toBe('Ada');
  });

  it('restores an empty Language and leaves the other Language alone', async () => {
    const store = memoryStore();
    await saveCajunProfile('Ada');
    await AsyncStorage.setItem(
      KEYS.PROFILE_KREOLE,
      JSON.stringify({ username: 'Kreole', xp: 4, streak: 1, lastStudyDate: null })
    );
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    await AsyncStorage.removeItem(KEYS.PROFILE_CAJUN);

    const restored = await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    expect(restored).toEqual({ action: 'restore', mayUpdate: true });
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');
    expect((await readSavedLearnerProgress('kreole')).profile.username).toBe('Kreole');
  });

  it('resumes when both sides match and stops on a Progress clash', async () => {
    const store = memoryStore();
    await saveCajunProfile('Ada');
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    const resume = await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    expect(resume).toEqual({ action: 'resume', mayUpdate: true });

    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 9, streak: 1, lastStudyDate: '2026-10-25T12:00:00.000Z' })
    );
    const clash = await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    expect(clash).toEqual({ action: 'clash', mayUpdate: false });
    expect((await store.read('ada', 'cajun')).record.profile.xp).toBe(2);
    expect((await readSavedLearnerProgress('cajun')).profile.xp).toBe(9);
  });

  it('does not give one Identity the previous Identity progress', async () => {
    const store = memoryStore();
    await saveCajunProfile('Ada');
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    await noteSignOut();
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');

    const bea = await onIdentityForLanguage({ identityId: 'bea', language: 'cajun', store });
    expect(bea).toEqual({ action: 'clash', mayUpdate: false });
    expect(await store.read('bea', 'cajun')).toBeNull();
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');
  });

  it('retries a failed write and keeps the revision', async () => {
    const store = memoryStore();
    await saveCajunProfile('Ada');
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    const local = await readSavedLearnerProgress('cajun');
    store.write = async () => ({ ok: false, retry: true });

    const failed = await writeSavedUpdate({
      identityId: 'ada',
      language: 'cajun',
      store,
      record: local
    });
    expect(failed).toEqual({ ok: false, mayUpdate: true, retry: true });

    store.write = async (_identityId, _language, revision) => ({
      ok: true,
      revision: revision + 1
    });
    const again = await writeSavedUpdate({
      identityId: 'ada',
      language: 'cajun',
      store,
      record: local
    });
    expect(again.ok).toBe(true);
    expect(again.revision).toBe(2);
  });

  it('stops updates after a stale revision and keeps the phone progress', async () => {
    const store = memoryStore();
    await saveCajunProfile('Ada');
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    const local = await readSavedLearnerProgress('cajun');
    await store.write('ada', 'cajun', 1, local);

    const stale = await writeSavedUpdate({
      identityId: 'ada',
      language: 'cajun',
      store,
      record: local
    });
    expect(stale).toEqual({ ok: false, mayUpdate: false });
    expect((await readSavedLearnerProgress('cajun')).profile.username).toBe('Ada');

    const blocked = await writeSavedUpdate({
      identityId: 'ada',
      language: 'cajun',
      store,
      record: local
    });
    expect(blocked.mayUpdate).toBe(false);
  });
});

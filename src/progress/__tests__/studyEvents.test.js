import AsyncStorage from '@react-native-async-storage/async-storage';
import { onIdentityForLanguage } from '../claimRestore';
import {
  bindSavedProgressSession,
  keepStudyEvent,
  savedProgressSettled
} from '../studyEvents';
import { releaseSavedLearnerProgress } from '../keepSavedLearnerProgress';
import { KEYS, updateWordProgress, upsertPendingMistake } from '../../learnerProgress';
import { updateCardReview } from '../../utils/spacedRepetition';

function memoryStore() {
  const rows = new Map();
  const key = (identityId, language) => `${identityId}:${language}`;
  return {
    writes: [],
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
      this.writes.push({ revision, ops: record.p_ops, cardId: record.p_card_id });
      return { ok: true, revision: revision + 1 };
    }
  };
}

describe('study events', () => {
  beforeEach(async () => {
    bindSavedProgressSession(null, null);
    await AsyncStorage.clear();
  });

  it('does not write for a Guest', async () => {
    const store = memoryStore();
    await keepStudyEvent({ language: 'cajun', ops: ['profile'] });
    await savedProgressSettled();
    expect(store.writes).toEqual([]);
  });

  it('sends a card, a word, and a mistake in revision order', async () => {
    const store = memoryStore();
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 2, streak: 1, lastStudyDate: null })
    );
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    bindSavedProgressSession('ada', store);

    await updateCardReview('cajun:card-1', 4);
    await updateWordProgress('cajun', 'row-1', false);
    await upsertPendingMistake('cajun', 'cajun:card-1', {
      answer: 'no',
      source: 'lesson',
      sourceId: 'lesson-1'
    });
    await savedProgressSettled();

    expect(store.writes).toEqual([
      {
        revision: 1,
        ops: ['card_review', 'word_mastery', 'pending_mistake'],
        cardId: 'cajun:card-1'
      }
    ]);
  });

  it('retries the same rows on the next write and drops them on sign-out', async () => {
    const store = memoryStore();
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 2, streak: 1, lastStudyDate: null })
    );
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    bindSavedProgressSession('ada', store);
    const succeed = store.write.bind(store);
    let tries = 0;
    store.write = async (...args) => {
      tries += 1;
      if (tries === 1) return { ok: false, retry: true };
      return succeed(...args);
    };

    await updateCardReview('cajun:card-1', 4);
    await savedProgressSettled();
    expect(tries).toBe(1);

    await updateWordProgress('cajun', 'row-1', true);
    await savedProgressSettled();
    expect(store.writes.map((write) => write.ops)).toEqual([['card_review'], ['word_mastery']]);

    store.write = async () => ({ ok: false, retry: true });
    await keepStudyEvent({ language: 'cajun', ops: ['profile'] });
    await savedProgressSettled();
    await releaseSavedLearnerProgress('ada');
    store.write = succeed;
    await keepStudyEvent({ language: 'cajun', ops: ['profile'] });
    await savedProgressSettled();
    expect(store.writes).toHaveLength(2);
  });

  it('keeps a new study row when an older save finishes after sign-out', async () => {
    const store = memoryStore();
    await AsyncStorage.setItem(
      KEYS.PROFILE_CAJUN,
      JSON.stringify({ username: 'Ada', xp: 2, streak: 1, lastStudyDate: null })
    );
    await onIdentityForLanguage({ identityId: 'ada', language: 'cajun', store });
    bindSavedProgressSession('ada', store);
    let releaseWrite;
    const gate = new Promise((resolve) => {
      releaseWrite = resolve;
    });
    const succeed = store.write.bind(store);
    let calls = 0;
    const started = new Promise((resolve) => {
      store.write = async (...args) => {
        calls += 1;
        if (calls === 1) {
          resolve();
          await gate;
        }
        return succeed(...args);
      };
    });

    await updateCardReview('cajun:card-1', 4);
    await started;
    bindSavedProgressSession(null, null);
    bindSavedProgressSession('ada', store);
    await updateWordProgress('cajun', 'row-1', true);
    releaseWrite();
    await savedProgressSettled();

    expect(store.writes.map((write) => write.ops)).toEqual([['card_review'], ['word_mastery']]);
  });
});

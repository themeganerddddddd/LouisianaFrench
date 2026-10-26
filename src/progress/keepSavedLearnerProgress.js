import { keepLocalLearnerProgress, onIdentityForLanguage, noteSignOut } from './claimRestore';

const LANGUAGES = ['cajun', 'kreole'];

function tail(language, key) {
  const prefix = `${language}:`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

function pairs(record, field) {
  return Object.entries(record[field] || {});
}

function instant(value) {
  if (value == null) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

export function createRemoteSavedProgressStore({ url, anonKey, getAccessToken }) {
  async function call(path, body) {
    const token = await getAccessToken();
    if (!token) throw new Error('Saved Learner Progress requires an Identity');
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.message || 'Saved Learner Progress request failed');
      error.code = payload?.code;
      throw error;
    }
    return payload;
  }

  const rows = (name, language) =>
    call(`${name}?${name === 'card_review' ? `card_id=like.${language}:*` : `language=eq.${language}`}&select=*`);

  return {
    async read(_identityId, language) {
      const profiles = await rows('language_progress', language);
      if (!profiles.length) return null;
      const [lessons, words, cards, mistakes, days, practice] = await Promise.all(
        ['completed_lesson', 'word_mastery', 'card_review', 'pending_mistake', 'daily_review_day', 'practice_day'].map(
          (name) => rows(name, language)
        )
      );
      const profile = profiles[0];
      const by = (list, key, value) => Object.fromEntries(list.map((row) => [key(row), value(row)]));
      return {
        revision: profile.revision,
        record: {
          language,
          profile: {
            username: profile.username,
            xp: Number(profile.xp),
            streak: Number(profile.streak),
            lastStudyDate: instant(profile.last_study_at)
          },
          lastWorkedUnit: profile.last_worked_unit,
          completedLessons: by(lessons, (row) => `${language}:${row.lesson_id}`, (row) => ({
            completed: true,
            completedAt: instant(row.completed_at)
          })),
          wordMastery: by(words, (row) => `${language}:${row.word_row_id}`, (row) => ({
            seen: Number(row.seen),
            correct: Number(row.correct),
            wrong: Number(row.wrong)
          })),
          cardReviews: by(cards, (row) => row.card_id, (row) => ({
            repetitions: Number(row.repetitions),
            interval: Number(row.review_interval),
            easeFactor: Number(row.ease),
            nextReviewAt: instant(row.next_review_at),
            lapses: Number(row.lapses)
          })),
          pendingMistakes: by(mistakes, (row) => row.card_id, (row) => ({
            cardId: row.card_id,
            answer: row.answer,
            source: row.source,
            sourceId: row.source_id,
            timestamp: instant(row.recorded_at)
          })),
          dailyReviewDays: by(days, (row) => row.day, () => true),
          practiceDays: by(practice, (row) => row.day, (row) => ({
            type: row.practice_type,
            completedAt: instant(row.completed_at)
          }))
        }
      };
    },
    async claim(_identityId, language, record) {
      const lessonRows = pairs(record, 'completedLessons');
      const wordRows = pairs(record, 'wordMastery');
      const cardRows = pairs(record, 'cardReviews');
      const mistakeRows = pairs(record, 'pendingMistakes');
      const practiceRows = pairs(record, 'practiceDays');
      try {
        await call('rpc/claim_saved_learner_progress_batch', {
          p_language: language,
          p_username: record.profile?.username ?? '',
          p_xp: record.profile?.xp ?? 0,
          p_streak: record.profile?.streak ?? 0,
          p_last_study_at: record.profile?.lastStudyDate ?? null,
          p_last_worked_unit: record.lastWorkedUnit,
          p_lesson_ids: lessonRows.map(([key]) => tail(language, key)),
          p_lesson_completed_at: lessonRows.map(([, row]) => row.completedAt),
          p_word_row_ids: wordRows.map(([key]) => tail(language, key)),
          p_seen: wordRows.map(([, row]) => row.seen),
          p_correct: wordRows.map(([, row]) => row.correct),
          p_wrong: wordRows.map(([, row]) => row.wrong),
          p_card_ids: cardRows.map(([key]) => key),
          p_repetitions: cardRows.map(([, row]) => row.repetitions),
          p_review_intervals: cardRows.map(([, row]) => row.interval),
          p_ease: cardRows.map(([, row]) => row.easeFactor),
          p_next_review_at: cardRows.map(([, row]) => row.nextReviewAt),
          p_lapses: cardRows.map(([, row]) => row.lapses),
          p_mistake_card_ids: mistakeRows.map(([key]) => key),
          p_answers: mistakeRows.map(([, row]) => row.answer),
          p_sources: mistakeRows.map(([, row]) => row.source),
          p_source_ids: mistakeRows.map(([, row]) => row.sourceId ?? null),
          p_recorded_at: mistakeRows.map(([, row]) => row.timestamp),
          p_daily_days: pairs(record, 'dailyReviewDays').map(([day]) => day),
          p_practice_days: practiceRows.map(([day]) => day),
          p_practice_types: practiceRows.map(([, row]) => row.type),
          p_practice_completed_at: practiceRows.map(([, row]) => row.completedAt)
        });
        return { ok: true, revision: 1 };
      } catch (error) {
        if (error.code === '23505') return { ok: false };
        throw error;
      }
    },
    async write(_identityId, language, revision, record) {
      try {
        const next = await call('rpc/apply_saved_learner_progress', {
          ...record,
          p_language: language,
          p_expected_revision: revision
        });
        return { ok: true, revision: next };
      } catch (error) {
        if (error.code === '40001') return { ok: false };
        return { ok: false, retry: true };
      }
    }
  };
}

export function savedProgressStoreFor(connector) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !connector?.getAccessToken) return null;
  return createRemoteSavedProgressStore({
    url,
    anonKey,
    getAccessToken: () => connector.getAccessToken()
  });
}

export async function adoptSavedLearnerProgress(identityId, store) {
  const results = {};
  for (const language of LANGUAGES) {
    try {
      results[language] = await onIdentityForLanguage({ identityId, language, store });
    } catch {
      results[language] = await keepLocalLearnerProgress(identityId, language);
    }
  }
  return results;
}

export async function releaseSavedLearnerProgress() {
  await noteSignOut();
}

export async function keepSavedLearnerProgressFor(identityId, getAccessToken) {
  if (!identityId) {
    await releaseSavedLearnerProgress();
    return null;
  }
  const store = savedProgressStoreFor({ getAccessToken });
  if (!store) return null;
  return adoptSavedLearnerProgress(identityId, store);
}

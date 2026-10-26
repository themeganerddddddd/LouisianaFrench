const pending = [];
const jobs = [];
let session = null;
let pumping = null;
let scheduled = null;

export function bindSavedProgressSession(identityId, store) {
  session = identityId && store ? { identityId, store } : null;
  if (!session) {
    pending.length = 0;
    jobs.length = 0;
    scheduled = null;
  }
}

export function savedProgressSettled() {
  return scheduled || pumping || Promise.resolve();
}

function payload(record, event) {
  const profile = record.profile || {};
  const lesson = event.lessonId
    ? record.completedLessons[`${event.language}:${event.lessonId}`]
    : null;
  const word = event.wordRowId
    ? record.wordMastery[`${event.language}:${event.wordRowId}`]
    : null;
  const card = event.cardId ? record.cardReviews[event.cardId] : null;
  const mistake = event.cardId ? record.pendingMistakes[event.cardId] : null;
  const practice = event.day ? record.practiceDays[event.day] : null;
  return {
    p_username: profile.username || '',
    p_xp: profile.xp || 0,
    p_streak: profile.streak || 0,
    p_last_study_at: profile.lastStudyDate || null,
    p_last_worked_unit: record.lastWorkedUnit,
    p_ops: event.ops,
    p_lesson_id: event.lessonId || null,
    p_completed_at: lesson?.completedAt || practice?.completedAt || null,
    p_word_row_id: event.wordRowId || null,
    p_seen: word ? word.seen : null,
    p_correct: word ? word.correct : null,
    p_wrong: word ? word.wrong : null,
    p_card_id: event.cardId || null,
    p_repetitions: card ? card.repetitions : null,
    p_review_interval: card ? card.interval : null,
    p_ease: card ? card.easeFactor : null,
    p_next_review_at: card ? card.nextReviewAt : null,
    p_lapses: card ? card.lapses : null,
    p_answer: mistake ? mistake.answer : null,
    p_source: mistake ? mistake.source : null,
    p_source_id: mistake ? mistake.sourceId : null,
    p_recorded_at: mistake ? mistake.timestamp : null,
    p_day: event.day || null,
    p_practice_type: event.practiceType || practice?.type || null
  };
}

function merged(events) {
  const groups = new Map();
  for (const item of events) {
    if (!session || item.identityId !== session.identityId) continue;
    const event = item.event;
    const group = groups.get(event.language) || {
      language: event.language,
      identityId: item.identityId,
      ops: []
    };
    for (const op of event.ops) {
      if (!group.ops.includes(op)) group.ops.push(op);
    }
    group.lessonId = event.lessonId || group.lessonId;
    group.wordRowId = event.wordRowId || group.wordRowId;
    group.cardId = event.cardId || group.cardId;
    group.day = event.day || group.day;
    group.practiceType = event.practiceType || group.practiceType;
    groups.set(event.language, group);
  }
  return [...groups.values()];
}

function startPump() {
  if (pumping) return;
  pumping = (async () => {
    while (jobs.length && session) {
      const job = jobs[0];
      if (job.identityId !== session.identityId) {
        jobs.shift();
        continue;
      }
      const { writeSavedUpdate } = require('./claimRestore');
      const result = await writeSavedUpdate({
        identityId: job.identityId,
        language: job.language,
        store: session.store,
        record: job.payload
      });
      if (result.retry) return;
      jobs.shift();
      if (!result.ok) {
        jobs.length = 0;
        return;
      }
    }
  })().finally(() => {
    pumping = null;
  });
  pumping.catch(() => {});
}

function schedule() {
  if (scheduled) return;
  scheduled = new Promise((resolve) => {
    setTimeout(async () => {
      const events = pending.splice(0);
      scheduled = null;
      try {
        if (session && events.length) {
          const { readSavedLearnerProgress } = require('./savedLearnerProgress');
          for (const event of merged(events)) {
            if (!session || session.identityId !== event.identityId) continue;
            const record = await readSavedLearnerProgress(event.language);
            if (!session || session.identityId !== event.identityId) continue;
            jobs.push({
              identityId: event.identityId,
              language: event.language,
              payload: payload(record, event)
            });
          }
          startPump();
          if (pumping) await pumping;
        }
      } finally {
        resolve();
      }
    }, 0);
  });
}

export async function keepStudyEvent(event) {
  if (!session) return;
  if (event.language !== 'cajun' && event.language !== 'kreole') return;
  pending.push({ identityId: session.identityId, event });
  schedule();
}

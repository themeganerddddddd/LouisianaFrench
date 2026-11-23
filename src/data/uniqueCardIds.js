import cajunLessons from './cajunLessons.json';
import kreoleLessons from './kreoleLessons.json';

const RAW_LESSONS = {
  cajun: cajunLessons,
  kreole: kreoleLessons
};

const plans = new Map();

function contentKey(activity) {
  const rest = { ...activity };
  delete rest.cardId;
  delete rest.activityIndex;
  return JSON.stringify(rest);
}

function buildPlan(language) {
  const lessons = RAW_LESSONS[language] || [];
  const groups = new Map();

  lessons.forEach((lesson, lessonIndex) => {
    (lesson.activities || []).forEach((activity, activityIndex) => {
      const entries = groups.get(activity.cardId) || [];
      entries.push({ lessonIndex, activityIndex, lessonId: lesson.id });
      groups.set(activity.cardId, entries);
    });
  });

  const taken = new Set(groups.keys());
  const assigned = new Map();
  const legacy = new Map();

  for (const [cardId, entries] of groups) {
    if (entries.length < 2) continue;

    const published = entries.map((entry, index) => {
      const keepsId = index === entries.length - 1;
      let nextId = cardId;
      if (!keepsId) {
        nextId = `${cardId}::${entry.lessonId}`;
        let salt = 2;
        while (taken.has(nextId)) {
          nextId = `${cardId}::${entry.lessonId}::${salt}`;
          salt += 1;
        }
        taken.add(nextId);
      }
      const activity = lessons[entry.lessonIndex].activities[entry.activityIndex];
      return {
        lessonId: entry.lessonId,
        lessonIndex: entry.lessonIndex,
        activityIndex: entry.activityIndex,
        cardId: nextId,
        contentKey: contentKey(activity)
      };
    });

    legacy.set(cardId, published);
    for (const entry of published) {
      if (entry.cardId !== cardId) {
        assigned.set(`${entry.lessonIndex}:${entry.activityIndex}`, entry.cardId);
      }
    }
  }

  const publishedLessons = assigned.size
    ? lessons.map((lesson, lessonIndex) => {
      let changed = false;
      const activities = (lesson.activities || []).map((activity, activityIndex) => {
        const nextId = assigned.get(`${lessonIndex}:${activityIndex}`);
        if (!nextId) return activity;
        changed = true;
        return { ...activity, cardId: nextId };
      });
      return changed ? { ...lesson, activities } : lesson;
    })
    : lessons;

  return { lessons: publishedLessons, legacy };
}

function planFor(language) {
  const key = language === 'kreole' ? 'kreole' : 'cajun';
  if (!plans.has(key)) plans.set(key, buildPlan(key));
  return plans.get(key);
}

export function lessonsWithUniqueCardIds(language) {
  return planFor(language).lessons;
}

export function resolveStoredCardId(language, cardId, sourceLessonId) {
  const entries = planFor(language).legacy.get(cardId);
  if (!entries) return cardId;
  if (sourceLessonId) {
    const match = entries.find((entry) => entry.lessonId === sourceLessonId);
    if (match) return match.cardId;
  }
  return entries[entries.length - 1].cardId;
}

export function reviewCardIdsToCopy(cardId) {
  const language = cardId.startsWith('kreole:')
    ? 'kreole'
    : cardId.startsWith('cajun:')
      ? 'cajun'
      : null;
  if (!language) return [];
  const entries = planFor(language).legacy.get(cardId);
  if (!entries) return [];
  const owner = entries[entries.length - 1];
  return entries
    .filter((entry) => entry.cardId !== owner.cardId && entry.contentKey !== owner.contentKey)
    .map((entry) => entry.cardId);
}

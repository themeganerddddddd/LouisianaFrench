import { getAllActivities } from '../data/lessonLoader';
import { getPendingMistakes, removePendingMistake } from '../utils/storage';

export function assembleLessonMistakeQueue({ mistakes } = {}) {
  const activities = mistakes || [];
  return {
    activities,
    empty: !activities.length
  };
}

export async function assembleMistakeReviewQueue({ language, source, mistakes }) {
  if (source !== 'home') {
    return assembleLessonMistakeQueue({ mistakes });
  }

  const pending = await getPendingMistakes(language);
  const activitiesByCardId = new Map(
    getAllActivities(language).map((activity) => [activity.cardId, activity])
  );
  const resolved = [];

  for (const record of pending) {
    const activity = activitiesByCardId.get(record.cardId);

    if (activity) {
      resolved.push({
        ...activity,
        userAnswer: record.answer
      });
    } else {
      await removePendingMistake(language, record.cardId);
    }
  }

  return {
    activities: resolved,
    empty: !resolved.length
  };
}

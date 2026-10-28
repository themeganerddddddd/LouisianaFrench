import { getLessonById } from '../data/lessonLoader';
import { getDueReviewItems } from '../utils/spacedRepetition';

export async function assembleLessonActivities({ language, lessonId }) {
  const lesson = getLessonById(language, lessonId);

  if (!lesson) {
    return {
      lesson: null,
      activities: []
    };
  }

  const due = await getDueReviewItems(lesson.activities || []);
  const dueIds = new Set(due.map((item) => item.cardId));
  const activities = (lesson.activities || []).map((activity) => ({
    ...activity,
    isReview: dueIds.has(activity.cardId)
  }));

  return {
    lesson,
    activities
  };
}

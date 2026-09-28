import { getAllActivities } from '../data/lessonLoader';
import { getDueReviewItems, getWeakItems } from './spacedRepetition';
import { getReviewState } from './storage';

export async function getDailyReviewQueue(language) {
  const activities = getAllActivities(language).filter((activity) => activity.type !== 'intro_card');
  const reviewState = await getReviewState();
  const nextReviewTime = (activity) => new Date(reviewState[activity.cardId].nextReviewAt).getTime();
  const due = (await getDueReviewItems(activities))
    .sort((a, b) => nextReviewTime(a) - nextReviewTime(b));
  const weak = await getWeakItems(due);
  const seen = new Set();

  return [...weak, ...due]
    .filter((activity) => {
      if (seen.has(activity.cardId)) return false;
      seen.add(activity.cardId);
      return true;
    })
    .slice(0, 15)
    .map((activity) => ({ ...activity, isReview: true }));
}

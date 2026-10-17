import { updateCardReview } from './spacedRepetition';
import {
  updateWordProgress,
  upsertPendingMistake
} from './storage';

function lessonCardQuality(activity, wasCorrect) {
  if (!wasCorrect) return 2;
  return activity.isReview ? 5 : 4;
}

function lessonXpDelta(activity, wasCorrect) {
  if (!wasCorrect) return 0;
  return activity.isReview ? 6 : 10;
}

function lessonCountsTowardScore(lessonType, activity, wasCorrect) {
  return (
    wasCorrect &&
    lessonType !== 'review' &&
    activity.type !== 'intro_card'
  );
}

function lessonNextStep(isLastActivity, mistakeCount) {
  if (!isLastActivity) return 'advance';
  if (mistakeCount > 0) return 'mistakeReview';
  return 'complete';
}

/**
 * Plans and records the Learner Progress result of one settled Activity.
 * Callers animate or navigate from nextStep; they do not pass Card quality
 * numbers or XP tables.
 *
 * sessionKind `dailyReview` is wired in a later Issue.
 */
export async function recordActivityOutcome({
  sessionKind,
  language,
  activity,
  wasCorrect,
  userAnswer = null,
  lessonId = null,
  lessonType = null,
  isLastActivity,
  mistakeCount = 0
}) {
  if (sessionKind !== 'lesson') {
    throw new Error(
      `recordActivityOutcome: unsupported sessionKind "${sessionKind}"`
    );
  }

  const cardQuality = lessonCardQuality(activity, wasCorrect);
  await updateCardReview(activity.cardId, cardQuality);

  if (activity.rowId) {
    await updateWordProgress(language, activity.rowId, wasCorrect);
  }

  if (!wasCorrect) {
    await upsertPendingMistake(language, activity.cardId, {
      answer: userAnswer,
      source: 'lesson',
      sourceId: lessonId
    });
  }

  return {
    xpDelta: lessonXpDelta(activity, wasCorrect),
    countsTowardScore: lessonCountsTowardScore(
      lessonType,
      activity,
      wasCorrect
    ),
    nextStep: lessonNextStep(isLastActivity, mistakeCount)
  };
}

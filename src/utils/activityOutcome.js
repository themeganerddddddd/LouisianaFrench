import { updateCardReview } from './spacedRepetition';
import {
  getPendingMistakes,
  recordPracticeCompletion,
  removePendingMistake,
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

function dailyReviewCardQuality(wasCorrect) {
  return wasCorrect ? 5 : 2;
}

function dailyReviewXpDelta(wasCorrect) {
  return wasCorrect ? 8 : 0;
}

function dailyReviewNextStep(isLastActivity) {
  return isLastActivity ? 'complete' : 'advance';
}

function mistakeReviewNextStep(isLastActivity) {
  return isLastActivity ? 'complete' : 'advance';
}

async function recordMistakeReviewOutcome({
  language,
  activity,
  wasCorrect,
  isLastActivity
}) {
  if (!wasCorrect) {
    return {
      xpDelta: 0,
      countsTowardScore: false,
      nextStep: 'advance'
    };
  }

  await updateCardReview(activity.cardId, 4);

  if (activity.rowId) {
    await updateWordProgress(language, activity.rowId, true);
  }

  await removePendingMistake(language, activity.cardId);

  if (!(await getPendingMistakes(language)).length) {
    await recordPracticeCompletion(language, 'mistakeReview');
  }

  return {
    xpDelta: 0,
    countsTowardScore: false,
    nextStep: mistakeReviewNextStep(isLastActivity)
  };
}

async function recordLessonOutcome({
  language,
  activity,
  wasCorrect,
  userAnswer,
  lessonId,
  lessonType,
  isLastActivity,
  mistakeCount
}) {
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

async function recordDailyReviewOutcome({
  language,
  activity,
  wasCorrect,
  userAnswer,
  isLastActivity
}) {
  const cardQuality = dailyReviewCardQuality(wasCorrect);
  await updateCardReview(activity.cardId, cardQuality);

  if (activity.rowId) {
    await updateWordProgress(language, activity.rowId, wasCorrect);
  }

  if (wasCorrect) {
    await removePendingMistake(language, activity.cardId);
  } else {
    await upsertPendingMistake(language, activity.cardId, {
      answer: userAnswer,
      source: 'dailyReview',
      sourceId: null
    });
  }

  return {
    xpDelta: dailyReviewXpDelta(wasCorrect),
    countsTowardScore: false,
    nextStep: dailyReviewNextStep(isLastActivity)
  };
}

/**
 * Plans and records the Learner Progress result of one settled Activity.
 * Callers animate or navigate from nextStep; they do not pass Card quality
 * numbers or XP tables.
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
  if (sessionKind === 'lesson') {
    return recordLessonOutcome({
      language,
      activity,
      wasCorrect,
      userAnswer,
      lessonId,
      lessonType,
      isLastActivity,
      mistakeCount
    });
  }

  if (sessionKind === 'dailyReview') {
    return recordDailyReviewOutcome({
      language,
      activity,
      wasCorrect,
      userAnswer,
      isLastActivity
    });
  }

  if (sessionKind === 'mistakeReview') {
    return recordMistakeReviewOutcome({
      language,
      activity,
      wasCorrect,
      isLastActivity
    });
  }

  throw new Error(
    `recordActivityOutcome: unsupported sessionKind "${sessionKind}"`
  );
}

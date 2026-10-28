import { clock } from '../../test/fixtures/clock';
import { dailyReviewActivityOutcomes } from '../../test/fixtures/learnerProgress/dailyReviewActivityOutcomes';
import { lessonActivityOutcomes } from '../../test/fixtures/learnerProgress/lessonActivityOutcomes';
import {
  pendingMistakes,
  practiceLogs
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { mistakeReviewActivityOutcomes } from '../../test/fixtures/learnerProgress/mistakeReviewActivityOutcomes';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { setupAppTests } from '../../test/setupAppTest';
import { recordActivityOutcome } from '../activityOutcome';
import * as spacedRepetition from '../spacedRepetition';
import {
  getPendingMistakes,
  getTodayPractice,
  getWordProgress
} from '../storage';

setupAppTests();

beforeEach(() => {
  jest.restoreAllMocks();
});

async function recordCase(case_) {
  return recordActivityOutcome({
    sessionKind: case_.sessionKind,
    language: case_.language,
    activity: case_.activity,
    wasCorrect: case_.wasCorrect,
    userAnswer: case_.userAnswer,
    lessonId: case_.lessonId,
    lessonType: case_.lessonType,
    isLastActivity: case_.isLastActivity,
    mistakeCount: case_.mistakeCount
  });
}

describe('recordActivityOutcome (Lesson)', () => {
  it('awards quality 4 and 10 XP on a correct new Card, then advances', async () => {
    const case_ = lessonActivityOutcomes.correctNewCard;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 0 })
    );
    expect(await getPendingMistakes('cajun')).toEqual([]);
  });

  it('awards quality 5 and 6 XP on a correct due Card, then advances', async () => {
    const case_ = lessonActivityOutcomes.correctDueCard;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
  });

  it('records quality 2, Word wrong, and a pending Mistake on a wrong mid-Lesson answer', async () => {
    const case_ = lessonActivityOutcomes.wrongMidLesson;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: case_.activity.cardId,
        source: case_.expected.pendingMistakeSource,
        sourceId: case_.lessonId,
        answer: case_.userAnswer
      })
    ]);
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 0, wrong: 1 })
    );
  });

  it('excludes intro Activities from Lesson score while still awarding XP', async () => {
    const case_ = lessonActivityOutcomes.introExcludedFromScore;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
  });

  it('completes a review Lesson Activity with no score credit', async () => {
    const case_ = lessonActivityOutcomes.reviewLessonComplete;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
  });

  it('opens Mistake Review after a wrong final Lesson Activity', async () => {
    const case_ = lessonActivityOutcomes.lastActivityWithMistakes;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: case_.activity.cardId,
        source: case_.expected.pendingMistakeSource,
        sourceId: case_.lessonId
      })
    ]);
  });

  it('completes a clean Lesson when the last Activity is correct with no mistakes', async () => {
    const case_ = lessonActivityOutcomes.lastActivityCleanComplete;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 0 })
    );
  });

  it('counts only scored Activities toward core Lesson score after an intro', async () => {
    const case_ = lessonActivityOutcomes.coreLessonScoreAfterIntroAndChoice;
    const intro = lessonActivityOutcomes.introExcludedFromScore;
    const choice = {
      ...intro,
      activity: {
        cardId: 'fixture:cajun:to-be:choice',
        rowId: 'fixture_cajun_w04',
        type: 'multiple_choice',
        isReview: false
      },
      isLastActivity: true,
      mistakeCount: 0
    };

    const introOutcome = await recordCase(intro);
    const choiceOutcome = await recordCase(choice);

    expect(introOutcome.countsTowardScore).toBe(false);
    expect(choiceOutcome.countsTowardScore).toBe(true);
    expect(introOutcome.xpDelta + choiceOutcome.xpDelta).toBe(
      case_.expected.xpDeltaTotal
    );
    expect(choiceOutcome.nextStep).toBe(case_.expected.nextStep);
  });

  // Mistake Review Card/Word updates: Issue #30 closed without a product rule.
  // Do not assert those writes as desired behavior here.
});

describe('recordActivityOutcome (Daily Review)', () => {
  it('awards quality 5 and 8 XP on a correct mid-queue Card, then advances', async () => {
    const case_ = dailyReviewActivityOutcomes.correctMidQueue;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 0 })
    );
    expect(await getPendingMistakes('cajun')).toEqual([]);
  });

  it('clears a pending Mistake on a correct Daily Review answer', async () => {
    const case_ = dailyReviewActivityOutcomes.correctMidQueue;
    const { cardId } = pendingMistakes.cajun.greetingChoice;
    await seedAsyncStorage({
      pendingMistakes: { cajun: { [cardId]: pendingMistakes.cajun.greetingChoice } }
    });

    expect(await getPendingMistakes('cajun')).toHaveLength(1);

    await recordCase(case_);

    expect(await getPendingMistakes('cajun')).toEqual([]);
  });

  it('records quality 2 and a pending Mistake source dailyReview on a wrong mid-queue answer', async () => {
    const case_ = dailyReviewActivityOutcomes.wrongMidQueue;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: case_.activity.cardId,
        source: case_.expected.pendingMistakeSource,
        sourceId: null,
        answer: case_.userAnswer
      })
    ]);
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 0, wrong: 1 })
    );
  });

  it('completes after a correct final Daily Review Activity with no score', async () => {
    const case_ = dailyReviewActivityOutcomes.lastCorrectComplete;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: false,
      nextStep: 'complete'
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
  });

  it('completes after a wrong final Daily Review Activity without Mistake Review', async () => {
    const case_ = dailyReviewActivityOutcomes.lastWrongComplete;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: false,
      nextStep: 'complete'
    });
    expect(outcome.nextStep).not.toBe('mistakeReview');
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('kreole')).toEqual([
      expect.objectContaining({
        cardId: case_.activity.cardId,
        source: 'dailyReview',
        sourceId: null,
        answer: case_.userAnswer
      })
    ]);
  });
});

describe('recordActivityOutcome (Mistake Review)', () => {
  it('records quality 4 and Word progress on a correct mid-queue Card, then advances', async () => {
    const case_ = mistakeReviewActivityOutcomes.correctMidQueue;
    const { cardId } = pendingMistakes.cajun.greetingChoice;
    const listenCardId = pendingMistakes.cajun.greetingListen.cardId;
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [cardId]: pendingMistakes.cajun.greetingChoice,
          [listenCardId]: pendingMistakes.cajun.greetingListen
        }
      },
      wordProgress: { 'cajun:fixture_cajun_w02': { seen: 1, correct: 0, wrong: 1, status: 'learning' } }
    });
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 1 })
    );
    expect(await getPendingMistakes('cajun')).toEqual([pendingMistakes.cajun.greetingListen]);
    expect(await getTodayPractice('cajun')).toBeNull();
  });

  it('records practice completion when the last correct answer clears pending Mistakes', async () => {
    jest.setSystemTime(clock.localCalendarLateEvening());
    const case_ = mistakeReviewActivityOutcomes.correctLastClearsPending;
    const { cardId } = pendingMistakes.cajun.greetingChoice;
    await seedAsyncStorage({
      pendingMistakes: { cajun: { [cardId]: pendingMistakes.cajun.greetingChoice } }
    });
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('cajun')).toEqual([]);
    expect(await getTodayPractice('cajun')).toEqual(
      practiceLogs.todayMistakeReview['2026-03-05']
    );
  });

  it('writes no Learner Progress on a wrong answer and advances for requeue', async () => {
    const case_ = mistakeReviewActivityOutcomes.wrongRequeueOnly;
    const { cardId } = pendingMistakes.cajun.greetingChoice;
    await seedAsyncStorage({
      pendingMistakes: { cajun: { [cardId]: pendingMistakes.cajun.greetingChoice } }
    });
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    const outcome = await recordCase(case_);

    expect(outcome).toEqual({
      xpDelta: case_.expected.xpDelta,
      countsTowardScore: case_.expected.countsTowardScore,
      nextStep: case_.expected.nextStep
    });
    expect(updateCardReview).not.toHaveBeenCalled();
    expect(await getPendingMistakes('cajun')).toEqual([pendingMistakes.cajun.greetingChoice]);
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toBeUndefined();
  });
});

describe('recordActivityOutcome (dispatch)', () => {
  it('rejects unsupported session kinds', async () => {
    await expect(
      recordActivityOutcome({
        sessionKind: 'speechPractice',
        language: 'cajun',
        activity: { cardId: 'x' },
        wasCorrect: true,
        isLastActivity: true
      })
    ).rejects.toThrow(/unsupported sessionKind/);
  });
});

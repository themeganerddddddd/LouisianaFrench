import { getAllActivities, getLessonById } from '../../data/lessonLoader';
import {
  fixtureActivities,
  fixtureCatalog,
  lessonById
} from '../../test/fixtures/catalog/activities';
import { clock } from '../../test/fixtures/clock';
import {
  pendingMistakes,
  reviewStates
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { setupAppTests } from '../../test/setupAppTest';
import { getPendingMistakes } from '../../utils/storage';
import {
  assembleLessonActivities,
  assembleMistakeReviewQueue
} from '../index';

jest.mock('../../data/lessonLoader', () => ({
  getAllActivities: jest.fn(),
  getLessonById: jest.fn()
}));

setupAppTests();

beforeEach(() => {
  jest.setSystemTime(clock.dueNow());
  getAllActivities.mockImplementation((language) => fixtureCatalog.getAllActivities(language));
  getLessonById.mockImplementation((language, lessonId) =>
    fixtureCatalog.getLessonById(language, lessonId)
  );
});

describe('assembleMistakeReviewQueue', () => {
  it('returns lesson mistakes unchanged when source is not home', async () => {
    const mistakes = [
      { ...fixtureActivities.multipleChoice, userAnswer: 'wrong' }
    ];

    await expect(
      assembleMistakeReviewQueue({
        language: 'cajun',
        source: 'lesson',
        mistakes
      })
    ).resolves.toEqual({
      activities: mistakes,
      empty: false
    });
  });

  it('reports empty lesson-mode queue when mistakes are missing', async () => {
    await expect(
      assembleMistakeReviewQueue({
        language: 'cajun',
        source: 'lesson',
        mistakes: undefined
      })
    ).resolves.toEqual({
      activities: [],
      empty: true
    });
  });

  it('joins home pending Mistakes to Catalog Activities and preserves answers', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice,
          [pendingMistakes.cajun.greetingListen.cardId]: pendingMistakes.cajun.greetingListen
        }
      }
    });

    const { activities, empty } = await assembleMistakeReviewQueue({
      language: 'cajun',
      source: 'home'
    });

    expect(empty).toBe(false);
    expect(activities).toEqual([
      {
        ...fixtureActivities.multipleChoice,
        userAnswer: pendingMistakes.cajun.greetingChoice.answer
      },
      {
        ...fixtureActivities.listening,
        userAnswer: pendingMistakes.cajun.greetingListen.answer
      }
    ]);
  });

  it('removes orphan pending Mistakes that no longer exist in the Catalog', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice,
          [pendingMistakes.obsoleteCard.cardId]: pendingMistakes.obsoleteCard
        }
      }
    });

    const { activities, empty } = await assembleMistakeReviewQueue({
      language: 'cajun',
      source: 'home'
    });

    expect(empty).toBe(false);
    expect(activities).toHaveLength(1);
    expect(activities[0].cardId).toBe(fixtureActivities.multipleChoice.cardId);
    expect(await getPendingMistakes('cajun')).toEqual([pendingMistakes.cajun.greetingChoice]);
  });

  it('returns empty home queue when no pending Mistakes remain', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.obsoleteCard.cardId]: pendingMistakes.obsoleteCard
        }
      }
    });

    await expect(
      assembleMistakeReviewQueue({
        language: 'cajun',
        source: 'home'
      })
    ).resolves.toEqual({
      activities: [],
      empty: true
    });
    expect(await getPendingMistakes('cajun')).toEqual([]);
  });
});

describe('assembleLessonActivities', () => {
  it('returns null lesson and empty activities when the Lesson is missing', async () => {
    await expect(
      assembleLessonActivities({
        language: 'cajun',
        lessonId: 'missing-lesson'
      })
    ).resolves.toEqual({
      lesson: null,
      activities: []
    });
  });

  it('tags due Cards with isReview from spaced repetition state', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.dueAndWeak });
    const lesson = lessonById('fixture_cajun_u01_l01');

    const result = await assembleLessonActivities({
      language: 'cajun',
      lessonId: lesson.id
    });

    expect(result.lesson).toEqual(lesson);
    expect(result.activities.map(({ cardId, isReview }) => ({ cardId, isReview }))).toEqual([
      { cardId: 'fixture:cajun:greeting:intro', isReview: true },
      { cardId: 'fixture:cajun:greeting:listen', isReview: false },
      { cardId: 'fixture:cajun:greeting:choice', isReview: true },
      { cardId: 'fixture:cajun:greeting:typing', isReview: false }
    ]);
  });
});

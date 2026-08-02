import { getAllActivities } from '../../data/lessonLoader';
import { fixtureActivities, fixtureCatalog } from '../../test/fixtures/catalog/activities';
import { clock } from '../../test/fixtures/clock';
import {
  reviewStates
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { setupAppTests } from '../../test/setupAppTest';
import { getDailyReviewQueue } from '../reviewQueue';

jest.mock('../../data/lessonLoader', () => ({
  getAllActivities: jest.fn()
}));

setupAppTests();

beforeEach(() => {
  jest.setSystemTime(clock.dueNow());
  getAllActivities.mockImplementation((language) => fixtureCatalog.getAllActivities(language));
});

describe('getDailyReviewQueue', () => {
  it('filters intro Cards and keeps due Activities before weak Activities', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.dueAndWeak });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      fixtureActivities.multipleChoice.cardId,
      fixtureActivities.listening.cardId,
      fixtureActivities.typing.cardId
    ]);
    expect(queue.every((activity) => activity.type !== 'intro_card')).toBe(true);
    expect(queue.every((activity) => activity.isReview)).toBe(true);
  });

  it('deduplicates an Activity present in both due and weak results', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.overlap });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      fixtureActivities.multipleChoice.cardId,
      fixtureActivities.listening.cardId,
      fixtureActivities.typing.cardId
    ]);
  });

  it('caps the real queue at fifteen Activities', async () => {
    const activities = Array.from({ length: 16 }, (_, index) => ({
      ...fixtureActivities.multipleChoice,
      cardId: `fixture:cajun:cap:${index}`
    }));
    const reviewState = Object.fromEntries(
      activities.map((activity) => [
        activity.cardId,
        {
          ...reviewStates.overlap['fixture:cajun:greeting:choice'],
          nextReviewAt: clock.pastDue().toISOString()
        }
      ])
    );
    getAllActivities.mockReturnValue(activities);
    await seedAsyncStorage({ reviewState });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue).toHaveLength(15);
    expect(queue[14].cardId).toBe('fixture:cajun:cap:14');
  });

  it('returns an empty queue without fallback practice Activities', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.allFuture });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue).toEqual([]);
  });

  it('returns an empty queue when the active Language has no Activities', async () => {
    getAllActivities.mockReturnValue([]);

    await expect(getDailyReviewQueue('kreole')).resolves.toEqual([]);
  });

  it('isolates review state by the requested Language Catalog', async () => {
    await seedAsyncStorage({
      reviewState: {
        ...reviewStates.languageIsolation.cajun,
        ...reviewStates.languageIsolation.kreole
      }
    });

    const cajunQueue = await getDailyReviewQueue('cajun');
    const kreoleQueue = await getDailyReviewQueue('kreole');

    expect(cajunQueue.map((activity) => activity.cardId)).toEqual([
      'fixture:cajun:greeting:choice'
    ]);
    expect(kreoleQueue.map((activity) => activity.cardId)).toEqual([
      'fixture:kreole:pronouns:choice'
    ]);
  });
});

import { getAllActivities } from '../../data/lessonLoader';
import { fixtureActivities, fixtureCatalog } from '../../test/fixtures/catalog/activities';
import { clock } from '../../test/fixtures/clock';
import { buildCardReviewState } from '../../test/fixtures/learnerProgress/cardBuilder';
import {
  reviewStates
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { setupAppTests } from '../../test/setupAppTest';
import { getDailyReviewQueue } from '../reviewQueue';
import { updateCardReview } from '../spacedRepetition';

jest.mock('../../data/lessonLoader', () => ({
  getAllActivities: jest.fn()
}));

setupAppTests();

beforeEach(() => {
  jest.setSystemTime(clock.dueNow());
  getAllActivities.mockImplementation((language) => fixtureCatalog.getAllActivities(language));
});

describe('getDailyReviewQueue', () => {
  it('filters intro Cards and leaves out missed Cards that are not due yet', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.dueAndWeak });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      fixtureActivities.multipleChoice.cardId
    ]);
    expect(queue.every((activity) => activity.isReview)).toBe(true);
  });

  it('lists each due Card once, with missed Cards first', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.dueWithMissed });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      fixtureActivities.typing.cardId,
      fixtureActivities.listening.cardId,
      fixtureActivities.multipleChoice.cardId
    ]);
  });

  it('brings a missed Card back only when it becomes due', async () => {
    await updateCardReview(fixtureActivities.multipleChoice.cardId, 2);

    expect(await getDailyReviewQueue('cajun')).toEqual([]);

    jest.setSystemTime(clock.futureDue());
    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      fixtureActivities.multipleChoice.cardId
    ]);
  });

  it('keeps a due missed Card inside the fifteen-Card limit', async () => {
    const activities = Array.from({ length: 16 }, (_, index) => ({
      ...fixtureActivities.multipleChoice,
      cardId: `fixture:cajun:cap:${index}`
    }));
    const reviewState = Object.fromEntries(
      activities.map((activity, index) => [
        activity.cardId,
        buildCardReviewState({
          nextReviewAt: clock.pastDue().toISOString(),
          lapses: index === 15 ? 1 : 0
        })
      ])
    );
    getAllActivities.mockReturnValue(activities);
    await seedAsyncStorage({ reviewState });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue).toHaveLength(15);
    expect(queue[0].cardId).toBe('fixture:cajun:cap:15');
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

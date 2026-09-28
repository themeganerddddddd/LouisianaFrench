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

function hoursAfter(base, hours) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

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

  it('brings a missed Card back 24 hours after the miss, not 23', async () => {
    await updateCardReview(fixtureActivities.multipleChoice.cardId, 2);

    expect(await getDailyReviewQueue('cajun')).toEqual([]);

    jest.setSystemTime(hoursAfter(clock.dueNow(), 23));
    expect(await getDailyReviewQueue('cajun')).toEqual([]);

    jest.setSystemTime(hoursAfter(clock.dueNow(), 24));
    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      fixtureActivities.multipleChoice.cardId
    ]);
  });

  it('picks the most overdue Cards within each group when more than fifteen are due', async () => {
    const activities = Array.from({ length: 18 }, (_, index) => ({
      ...fixtureActivities.multipleChoice,
      cardId: `fixture:cajun:overdue:${index}`
    }));
    const reviewState = Object.fromEntries(
      activities.map((activity, index) => [
        activity.cardId,
        buildCardReviewState({
          nextReviewAt: hoursAfter(clock.pastDue(), -index).toISOString(),
          lapses: index < 4 ? 1 : 0
        })
      ])
    );
    getAllActivities.mockReturnValue(activities);
    await seedAsyncStorage({ reviewState });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual(
      [3, 2, 1, 0, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7].map(
        (index) => `fixture:cajun:overdue:${index}`
      )
    );
  });

  it('puts Cards missed more often first, even when a less-missed Card is more overdue', async () => {
    const activities = ['once', 'twice'].map((name) => ({
      ...fixtureActivities.multipleChoice,
      cardId: `fixture:cajun:missed:${name}`
    }));
    getAllActivities.mockReturnValue(activities);
    await seedAsyncStorage({
      reviewState: {
        'fixture:cajun:missed:once': buildCardReviewState({
          nextReviewAt: hoursAfter(clock.pastDue(), -1).toISOString(),
          lapses: 1
        }),
        'fixture:cajun:missed:twice': buildCardReviewState({
          nextReviewAt: clock.pastDue().toISOString(),
          lapses: 2
        })
      }
    });

    const queue = await getDailyReviewQueue('cajun');

    expect(queue.map((activity) => activity.cardId)).toEqual([
      'fixture:cajun:missed:twice',
      'fixture:cajun:missed:once'
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

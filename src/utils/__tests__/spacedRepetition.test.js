import AsyncStorage from '@react-native-async-storage/async-storage';
import { clock } from '../../test/fixtures/clock';
import { buildCardReviewState } from '../../test/fixtures/learnerProgress/cardBuilder';
import { updateCardReview, getDueReviewItems, getWeakItems } from '../spacedRepetition';
import { saveReviewState } from '../storage';

// Characterizes the current spaced-repetition Card scheduling interface
// (`src/utils/spacedRepetition.js`) backed by the real AsyncStorage jest
// mock and fake system time.
//
// Screens are explicitly out of scope. The resolved Daily Review defect and
// Issue #30 are not exercised here; this module cannot see which screen calls it.

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function daysAfter(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

describe('updateCardReview', () => {
  it('schedules a brand-new Card on its first successful review', async () => {
    const now = clock.reviewStart();
    jest.setSystemTime(now);

    const card = await updateCardReview('cajun:u01_w0001:mc', 4);

    expect(card.repetitions).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.nextReviewAt).toBe(daysAfter(now, 1).toISOString());
  });

  it('grows the interval schedule 1, 3, then ease-factor-scaled on consecutive successful reviews', async () => {
    jest.setSystemTime(clock.reviewStart());

    await updateCardReview('cajun:u01_w0001:mc', 4);
    const second = await updateCardReview('cajun:u01_w0001:mc', 4);
    expect(second.repetitions).toBe(2);
    expect(second.interval).toBe(3);

    const third = await updateCardReview('cajun:u01_w0001:mc', 4);
    expect(third.repetitions).toBe(3);
    // easeFactor is unchanged at quality 4, so interval = round(3 * 2.5) = 8.
    expect(third.interval).toBe(8);
    expect(third.easeFactor).toBe(2.5);
  });

  it('increases the ease factor on a high-quality review', async () => {
    jest.setSystemTime(clock.reviewStart());

    const card = await updateCardReview('cajun:u01_w0001:mc', 5);
    expect(card.easeFactor).toBeCloseTo(2.6);
  });

  it('resets repetitions and interval and records a lapse on a low-quality review', async () => {
    jest.setSystemTime(clock.reviewStart());

    await updateCardReview('cajun:u01_w0001:mc', 4);
    await updateCardReview('cajun:u01_w0001:mc', 4);
    const lapsed = await updateCardReview('cajun:u01_w0001:mc', 1);

    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.lapses).toBe(1);
  });

  it('persists Card state across calls, keyed by Card id', async () => {
    jest.setSystemTime(clock.reviewStart());

    await updateCardReview('cajun:u01_w0001:mc', 4);
    await updateCardReview('cajun:u01_w0002:mc', 4);

    const first = await updateCardReview('cajun:u01_w0001:mc', 4);
    expect(first.repetitions).toBe(2);
  });
});

describe('getDueReviewItems', () => {
  it('excludes items with no Card review state at all', async () => {
    const items = [{ cardId: 'cajun:u01_w0001:mc' }];
    expect(await getDueReviewItems(items)).toEqual([]);
  });

  it('includes only the Card whose nextReviewAt has already passed', async () => {
    jest.setSystemTime(clock.dueNow());
    await saveReviewState({
      dueCard: buildCardReviewState({ nextReviewAt: clock.pastDue().toISOString() }),
      notDueCard: buildCardReviewState({ nextReviewAt: clock.futureDue().toISOString() })
    });

    const items = [{ cardId: 'dueCard' }, { cardId: 'notDueCard' }];
    const due = await getDueReviewItems(items);

    expect(due.map((i) => i.cardId)).toEqual(['dueCard']);
  });

  it('excludes a Card scheduled for the future', async () => {
    jest.setSystemTime(clock.dueNow());
    await saveReviewState({ futureCard: buildCardReviewState() });

    const items = [{ cardId: 'futureCard' }];
    expect(await getDueReviewItems(items)).toEqual([]);
  });

  it('includes a Card due exactly now', async () => {
    const now = clock.dueNow();
    jest.setSystemTime(now);
    await saveReviewState({
      dueNow: buildCardReviewState({ nextReviewAt: now.toISOString() })
    });

    await expect(getDueReviewItems([{ cardId: 'dueNow' }])).resolves.toEqual([
      { cardId: 'dueNow' }
    ]);
  });
});

describe('getWeakItems', () => {
  it('excludes items with no Card review state', async () => {
    const items = [{ cardId: 'never-reviewed' }];
    expect(await getWeakItems(items)).toEqual([]);
  });

  it('excludes Cards with no recorded lapses', async () => {
    await saveReviewState({ cleanCard: buildCardReviewState() });

    const items = [{ cardId: 'cleanCard' }];
    expect(await getWeakItems(items)).toEqual([]);
  });

  it('includes Cards with at least one lapse, sorted descending by lapse count', async () => {
    await saveReviewState({
      oneLapse: buildCardReviewState({ lapses: 1 }),
      threeLapses: buildCardReviewState({ lapses: 3 })
    });

    const items = [{ cardId: 'oneLapse' }, { cardId: 'threeLapses' }];
    const weak = await getWeakItems(items);

    expect(weak.map((i) => i.cardId)).toEqual(['threeLapses', 'oneLapse']);
    expect(weak[0].reviewMeta.lapses).toBe(3);
  });
});

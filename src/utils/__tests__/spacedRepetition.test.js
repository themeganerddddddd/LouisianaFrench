import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateCardReview, getDueReviewItems, getWeakItems } from '../spacedRepetition';
import { saveReviewState } from '../storage';

// Characterizes the current spaced-repetition Card scheduling interface
// (`src/utils/spacedRepetition.js`) backed by the real AsyncStorage jest
// mock and fake system time. See
// `.scratch/architecture-modernization/issues/02-characterize-catalog-and-progress.md`.
//
// Screens are explicitly out of scope. KD-01 and KD-05 are not exercised
// here; this module has no visibility into which screen calls it.

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function daysAfter(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

describe('updateCardReview', () => {
  it('schedules a brand-new Card on its first successful review', async () => {
    const now = new Date(2026, 0, 10, 9, 0, 0);
    jest.setSystemTime(now);

    const card = await updateCardReview('cajun:u01_w0001:mc', 4);

    expect(card.repetitions).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.nextReviewAt).toBe(daysAfter(now, 1).toISOString());
  });

  it('grows the interval schedule 1, 3, then ease-factor-scaled on consecutive successful reviews', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));

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
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));

    const card = await updateCardReview('cajun:u01_w0001:mc', 5);
    expect(card.easeFactor).toBeCloseTo(2.6);
  });

  it('resets repetitions and interval and records a lapse on a low-quality review', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));

    await updateCardReview('cajun:u01_w0001:mc', 4);
    await updateCardReview('cajun:u01_w0001:mc', 4);
    const lapsed = await updateCardReview('cajun:u01_w0001:mc', 1);

    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.lapses).toBe(1);
  });

  it('persists Card state across calls, keyed by Card id', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));

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
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    // "due-card" is reviewed once, scheduling it 1 day out (due 2026-01-11).
    await updateCardReview('due-card', 4);
    // "not-due-card" is reviewed three times, pushing its interval to 8
    // days (schedule: 1, 3, 8), due 2026-01-18.
    await updateCardReview('not-due-card', 4);
    await updateCardReview('not-due-card', 4);
    await updateCardReview('not-due-card', 4);

    jest.setSystemTime(new Date(2026, 0, 12, 9, 0, 0)); // 2 days later

    const items = [{ cardId: 'due-card' }, { cardId: 'not-due-card' }];
    const due = await getDueReviewItems(items);

    expect(due.map((i) => i.cardId)).toEqual(['due-card']);
  });

  it('excludes a Card scheduled for the future', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    await updateCardReview('future-card', 4); // due 2026-01-11

    // "now" stays on the same day the Card was reviewed, before its due date.
    const items = [{ cardId: 'future-card' }];
    expect(await getDueReviewItems(items)).toEqual([]);
  });

  it('includes a Card due exactly now', async () => {
    const now = new Date(2026, 6, 22, 12);
    jest.setSystemTime(now);
    await saveReviewState({
      dueNow: {
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
        nextReviewAt: now.toISOString(),
        lapses: 0
      }
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
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    await updateCardReview('clean-card', 4);

    const items = [{ cardId: 'clean-card' }];
    expect(await getWeakItems(items)).toEqual([]);
  });

  it('includes Cards with at least one lapse, sorted descending by lapse count', async () => {
    jest.setSystemTime(new Date(2026, 0, 10, 9, 0, 0));
    await updateCardReview('one-lapse', 1);
    await updateCardReview('three-lapses', 1);
    await updateCardReview('three-lapses', 1);
    await updateCardReview('three-lapses', 1);

    const items = [{ cardId: 'one-lapse' }, { cardId: 'three-lapses' }];
    const weak = await getWeakItems(items);

    expect(weak.map((i) => i.cardId)).toEqual(['three-lapses', 'one-lapse']);
    expect(weak[0].reviewMeta.lapses).toBe(3);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import legacyCardIds from '../../data/legacyCardIds.json';
import { getPendingMistakes, getReviewState, migrateLegacyCardIds } from '../storage';

const OLD = 'cajun:match:u01_w0001:step15';
const UNIT1 = 'cajun_u01_l01';
const UNIT2 = 'cajun_u02_l01';
const NEW1 = legacyCardIds.cajun[OLD][UNIT1];
const NEW2 = legacyCardIds.cajun[OLD][UNIT2];

const reviewRecord = (lapses) => ({
  repetitions: 0,
  interval: 1,
  easeFactor: 2.3,
  nextReviewAt: '2026-01-11T15:00:00.000Z',
  lapses
});

const mistakeRecord = (sourceId) => ({
  cardId: OLD,
  answer: 'Wrong pairs',
  source: 'lesson',
  sourceId,
  timestamp: '2026-01-10T15:00:00.000Z'
});

const progressRecord = (completedAt) => ({
  completed: true,
  completedAt
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function seed({ review, mistakes, progress } = {}) {
  if (review !== undefined) {
    await AsyncStorage.setItem('lf_review_state', JSON.stringify(review));
  }
  if (mistakes !== undefined) {
    await AsyncStorage.setItem('lf_pending_mistakes', JSON.stringify(mistakes));
  }
  if (progress !== undefined) {
    await AsyncStorage.setItem('lf_lesson_progress', JSON.stringify(progress));
  }
}

describe('legacy card id migration', () => {
  it('follows the pending mistake lesson and leaves the sibling empty', async () => {
    await seed({
      review: { [OLD]: reviewRecord(2), 'cajun:kept': reviewRecord(0) },
      mistakes: {
        cajun: { [OLD]: mistakeRecord(UNIT1) },
        kreole: { 'kreole:kept': { ...mistakeRecord('kreole_u01_l01'), cardId: 'kreole:kept' } }
      }
    });

    await migrateLegacyCardIds();

    const review = await getReviewState();
    expect(review[NEW1]).toMatchObject({ lapses: 2 });
    expect(review[NEW2]).toBeUndefined();
    expect(review[OLD]).toBeUndefined();
    expect(review['cajun:kept']).toMatchObject({ lapses: 0 });

    const pending = await getPendingMistakes('cajun');
    expect(pending).toEqual([expect.objectContaining({ cardId: NEW1, sourceId: UNIT1 })]);
    expect(await getPendingMistakes('kreole')).toEqual([
      expect.objectContaining({ cardId: 'kreole:kept' })
    ]);
    expect(await AsyncStorage.getItem('lf_card_id_migration')).toBe('1');
  });

  it('uses the only completed lesson when the mistake has no matching lesson', async () => {
    await seed({
      review: { [OLD]: reviewRecord(1) },
      progress: { [`cajun:${UNIT2}`]: progressRecord('2026-01-02T00:00:00.000Z') }
    });

    await migrateLegacyCardIds();

    const review = await getReviewState();
    expect(review[NEW2]).toMatchObject({ lapses: 1 });
    expect(review[NEW1]).toBeUndefined();
    expect(review[OLD]).toBeUndefined();
  });

  it('gives the history to the lesson completed first when both are done', async () => {
    await seed({
      review: { [OLD]: reviewRecord(4) },
      progress: {
        [`cajun:${UNIT1}`]: progressRecord('2026-02-02T00:00:00.000Z'),
        [`cajun:${UNIT2}`]: progressRecord('2026-01-02T00:00:00.000Z')
      }
    });

    await migrateLegacyCardIds();

    const review = await getReviewState();
    expect(review[NEW2].lapses).toBe(4);
    expect(review[NEW1]).toBeUndefined();
  });

  it('gives the history to the earlier lesson when neither is completed', async () => {
    await seed({ review: { [OLD]: reviewRecord(3) } });

    await migrateLegacyCardIds();

    const review = await getReviewState();
    expect(review[NEW1].lapses).toBe(3);
    expect(review[NEW2]).toBeUndefined();
    expect(review[OLD]).toBeUndefined();
  });

  it('changes nothing on a second run', async () => {
    await seed({
      review: { [OLD]: reviewRecord(1) },
      mistakes: { cajun: { [OLD]: mistakeRecord(UNIT1) } }
    });

    await migrateLegacyCardIds();
    const afterFirst = {
      review: await AsyncStorage.getItem('lf_review_state'),
      mistakes: await AsyncStorage.getItem('lf_pending_mistakes'),
      flag: await AsyncStorage.getItem('lf_card_id_migration')
    };

    await migrateLegacyCardIds();

    expect(await AsyncStorage.getItem('lf_review_state')).toBe(afterFirst.review);
    expect(await AsyncStorage.getItem('lf_pending_mistakes')).toBe(afterFirst.mistakes);
    expect(await AsyncStorage.getItem('lf_card_id_migration')).toBe(afterFirst.flag);
  });

  it('keeps a record that is already stored under the new id', async () => {
    await seed({
      review: {
        [OLD]: reviewRecord(1),
        [NEW1]: reviewRecord(9)
      },
      mistakes: {
        cajun: {
          [OLD]: mistakeRecord(UNIT1),
          [NEW1]: { ...mistakeRecord(UNIT1), cardId: NEW1, answer: 'kept' }
        }
      }
    });

    await migrateLegacyCardIds();

    const review = await getReviewState();
    expect(review[NEW1].lapses).toBe(9);
    expect(review[OLD]).toBeUndefined();
    expect(review[NEW2]).toBeUndefined();
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({ cardId: NEW1, answer: 'kept' })
    ]);
  });

  it('migrates an old id that shows up again after the flag is set', async () => {
    await seed({ review: { [OLD]: reviewRecord(1) } });
    await migrateLegacyCardIds();

    const review = await getReviewState();
    review[OLD] = reviewRecord(6);
    await AsyncStorage.setItem('lf_review_state', JSON.stringify(review));

    await migrateLegacyCardIds();

    const again = await getReviewState();
    expect(again[OLD]).toBeUndefined();
    expect(again[NEW1].lapses).toBe(1);
    expect(again[NEW2]).toBeUndefined();
  });

  it('skips null and corrupt records without throwing', async () => {
    await AsyncStorage.setItem('lf_review_state', '{');
    await AsyncStorage.setItem('lf_pending_mistakes', JSON.stringify({
      cajun: { [OLD]: null }
    }));
    await AsyncStorage.setItem('lf_lesson_progress', 'not-json');

    await expect(migrateLegacyCardIds()).resolves.toBeUndefined();

    expect(await AsyncStorage.getItem('lf_review_state')).toBe('{');
    expect(JSON.parse(await AsyncStorage.getItem('lf_pending_mistakes'))).toEqual({
      cajun: { [OLD]: null }
    });
    expect(await AsyncStorage.getItem('lf_lesson_progress')).toBe('not-json');
    expect(await AsyncStorage.getItem('lf_card_id_migration')).toBe('1');
  });
});

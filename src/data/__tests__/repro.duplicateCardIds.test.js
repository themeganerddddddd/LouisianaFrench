// Repro tests for the audit bug: question (card) IDs repeat across lessons in the
// shipped catalog. FAIL on main at 549d4d0 on purpose.
// Mistakes and spaced-repetition state are stored by cardId only, so two different
// questions that share an ID collapse into one, and Fix mistakes / Daily Review can
// show a different question from the one the learner missed.
import { screen } from '@testing-library/react-native';
import { getAllActivities, getLessonsByLanguage } from '../lessonLoader';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests } from '../../test/setupAppTest';
import { getDailyReviewQueue } from '../../utils/reviewQueue';

setupAppTests();

const SHARED_MATCH_ID = 'cajun:match:u01_w0001:step15';

function duplicateCardIds(language) {
  const lessonsById = new Map();
  for (const lesson of getLessonsByLanguage(language)) {
    for (const activity of lesson.activities) {
      const lessons = lessonsById.get(activity.cardId) || new Set();
      lessons.add(lesson.id);
      lessonsById.set(activity.cardId, lessons);
    }
  }
  return [...lessonsById.entries()]
    .filter(([, lessons]) => lessons.size > 1)
    .map(([cardId, lessons]) => `${cardId} in ${[...lessons].join(', ')}`);
}

function activityIn(lessonId, cardId) {
  const lesson = getLessonsByLanguage('cajun').find((l) => l.id === lessonId);
  return lesson.activities.find((a) => a.cardId === cardId);
}

describe('repro audit: repeated question IDs in the shipped catalog', () => {
  it.each(['cajun', 'kreole'])('gives every %s question its own cardId', (language) => {
    // main: 15 repeats in cajun, 9 in kreole.
    expect(duplicateCardIds(language)).toEqual([]);
  });

  it('the shared match ID really is two different questions (sanity check)', () => {
    const unit1 = activityIn('cajun_u01_l01', SHARED_MATCH_ID).pairs.map((p) => p.left);
    const unit2 = activityIn('cajun_u02_l01', SHARED_MATCH_ID).pairs.map((p) => p.left);
    expect(unit1).toContain('Is it going okay?');
    expect(unit2).toContain('What’s your name?');
    expect(unit2).not.toContain('Is it going okay?');
  });

  it('Fix mistakes shows the Unit 1 Lesson 1 match the learner missed', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [SHARED_MATCH_ID]: {
            cardId: SHARED_MATCH_ID,
            answer: 'Wrong pairs',
            source: 'lesson',
            sourceId: 'cajun_u01_l01',
            timestamp: new Date(2026, 0, 10, 9).toISOString()
          }
        }
      }
    });

    renderApp({
      initialRouteName: 'MistakeReview',
      initialParams: { language: 'cajun', source: 'home' }
    });

    // Bug: MistakeReviewScreen builds Map(cardId -> activity); the later Unit 2
    // Lesson 1 match overwrites Unit 1's, so the learner gets Unit 2 pairs.
    expect(await screen.findByText('Is it going okay?')).toBeOnTheScreen();
    expect(screen.queryByText('What’s your name?')).toBeNull();
  });

  it('Daily Review shows the Unit 2 Lesson 1 match the learner got wrong', async () => {
    jest.setSystemTime(new Date(2026, 0, 12, 9));
    await seedAsyncStorage({
      reviewState: {
        [SHARED_MATCH_ID]: {
          repetitions: 0,
          interval: 1,
          easeFactor: 2.3,
          nextReviewAt: new Date(2026, 0, 11, 9).toISOString(),
          lapses: 1
        }
      }
    });

    const queue = await getDailyReviewQueue('cajun');
    const reviewed = queue.filter((a) => a.cardId === SHARED_MATCH_ID);

    // The learner only ever answered the Unit 2 version, but both catalog questions
    // share its review state. getDailyReviewQueue dedupes by cardId and keeps the
    // first, which is the Unit 1 version.
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0].pairs.map((p) => p.left)).toContain('What’s your name?');
  });

  it('keeps the catalog lookup used by Fix mistakes one-to-one', () => {
    const all = getAllActivities('cajun');
    expect(new Set(all.map((a) => a.cardId)).size).toBe(all.length);
  });
});

import { getAllWords, getUnits } from '../../data/lessonLoader';
import { fixtureCatalog } from '../../test/fixtures/catalog/activities';
import {
  dailyReviewLogs,
  homeProjectionProgress,
  pendingMistakes,
  practiceLogs,
  profiles,
  wordMastery
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import {
  getLanguageDailyReviewLog,
  getLessonProgress,
  getPendingMistakes,
  getProfile,
  getTodayKey,
  getTodayPractice,
  getWordProgress
} from '../storage';
import { getDailyReviewQueue } from '../reviewQueue';
import { getHomeProjection } from '../homeProjection';

jest.mock('../../data/lessonLoader', () => ({
  getAllWords: jest.fn(),
  getUnits: jest.fn()
}));

jest.mock('../reviewQueue', () => ({
  getDailyReviewQueue: jest.fn()
}));

jest.mock('../storage', () => ({
  getLanguageDailyReviewLog: jest.fn(),
  getLessonProgress: jest.fn(),
  getPendingMistakes: jest.fn(),
  getProfile: jest.fn(),
  getTodayKey: jest.fn(),
  getTodayPractice: jest.fn(),
  getWordProgress: jest.fn()
}));

const catalogLessons = (language) => fixtureCatalog.getUnits(language);
const catalogWords = (language) => fixtureCatalog.getAllWords(language);

function useProgress({
  dailyReview = {},
  lessonProgress = {},
  pending = [],
  practice = null,
  profile = profiles.established,
  reviewQueue = [],
  wordProgress = {}
} = {}) {
  getAllWords.mockImplementation(catalogWords);
  getUnits.mockImplementation(catalogLessons);
  getLanguageDailyReviewLog.mockResolvedValue(dailyReview);
  getLessonProgress.mockResolvedValue(lessonProgress);
  getPendingMistakes.mockResolvedValue(pending);
  getProfile.mockResolvedValue(profile);
  getTodayKey.mockReturnValue('2026-03-05');
  getTodayPractice.mockResolvedValue(practice);
  getWordProgress.mockResolvedValue(wordProgress);
  getDailyReviewQueue.mockResolvedValue(reviewQueue);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getHomeProjection', () => {
  it('returns the exact sanitized dashboard, plan, current Unit, and Unit-list shape', async () => {
    useProgress();

    const projection = await getHomeProjection('cajun');

    expect(projection).toEqual({
      language: 'cajun',
      dashboard: {
        xp: 40,
        streak: 2,
        masteredWords: 0,
        totalWords: 4,
        masteryPercent: 0,
        reviewCount: 0,
        pendingMistakeCount: 0,
        reviewEnabled: false
      },
      plan: {
        steps: [
          { id: 'lesson-1', label: 'Lesson', complete: false },
          { id: 'lesson-2', label: 'Lesson', complete: false },
          { id: 'review', label: 'Review', complete: false }
        ],
        completedCount: 0,
        activeAction: {
          kind: 'lesson',
          label: 'Start your first lesson',
          destination: 'Lesson',
          params: { language: 'cajun', lessonId: 'fixture_cajun_u01_l01' }
        },
        helperText: "Reviews unlock once you've learned your first words.",
        allDone: false
      },
      currentUnit: {
        unitCode: 'u01',
        unitLabel: 'Unit 1',
        title: 'Greetings & Check-ins',
        masteredWords: 0,
        totalWords: 2,
        masteryPercent: 0,
        completedLessons: 0,
        totalLessons: 2,
        nextLesson: {
          id: 'fixture_cajun_u01_l01',
          title: 'First greetings',
          wordCount: 2,
          typeLabel: 'Core lesson'
        }
      },
      catalogComplete: false,
      firstDay: true,
      units: [
        {
          unitCode: 'u01',
          unitLabel: 'Unit 1',
          title: 'Greetings & Check-ins',
          masteredWords: 0,
          totalWords: 2,
          masteryPercent: 0,
          completedLessons: 0,
          totalLessons: 2,
          lessons: [
            {
              id: 'fixture_cajun_u01_l01',
              title: 'First greetings',
              wordCount: 2,
              typeLabel: 'Core lesson',
              complete: false
            },
            {
              id: 'fixture_cajun_u01_review',
              title: 'Greetings review',
              wordCount: 1,
              typeLabel: 'Review',
              complete: false
            }
          ]
        },
        {
          unitCode: 'u02',
          unitLabel: 'Unit 2',
          title: 'Names & Introductions',
          masteredWords: 0,
          totalWords: 1,
          masteryPercent: 0,
          completedLessons: 0,
          totalLessons: 1,
          lessons: [{
            id: 'fixture_cajun_u02_l01',
            title: 'Everyday phrases',
            wordCount: 1,
            typeLabel: 'Core lesson',
            complete: false
          }]
        },
        {
          unitCode: 'u03',
          unitLabel: 'Unit 3',
          title: 'To Be & To Have',
          masteredWords: 0,
          totalWords: 1,
          masteryPercent: 0,
          completedLessons: 0,
          totalLessons: 1,
          lessons: [{
            id: 'fixture_cajun_u03_l01',
            title: 'To Be & To Have',
            wordCount: 1,
            typeLabel: 'Core lesson',
            complete: false
          }]
        }
      ],
      initialExpandedUnit: null
    });

    expect(projection.units[0].lessons[0]).not.toBe(
      fixtureCatalog.getUnits('cajun')[0].lessons[0]
    );
    expect(projection).not.toEqual(expect.objectContaining({ getProfile: expect.any(Function) }));
    expect(JSON.stringify(projection)).not.toContain('prompt');
    expect(JSON.stringify(projection)).not.toContain('english');
    expect(JSON.stringify(projection)).not.toContain('target');
  });

  it('keeps Day 1 through two Lessons and active-Language Daily Review completion', async () => {
    const learnedWord = { 'cajun:fixture_cajun_w01': wordMastery.learningAfterWrong };

    useProgress({
      lessonProgress: homeProjectionProgress.lessonToday,
      wordProgress: learnedWord
    });
    const oneLesson = await getHomeProjection('cajun');

    expect(oneLesson.firstDay).toBe(true);
    expect(oneLesson.dashboard.reviewEnabled).toBe(true);
    expect(oneLesson.plan.steps).toEqual([
      { id: 'lesson-1', label: 'Lesson', complete: true },
      { id: 'lesson-2', label: 'Lesson', complete: false },
      { id: 'review', label: 'Review', complete: false }
    ]);
    expect(oneLesson.plan.activeAction).toEqual({
      kind: 'lesson',
      label: 'Continue lesson · Greetings review',
      destination: 'Lesson',
      params: { language: 'cajun', lessonId: 'fixture_cajun_u01_review' }
    });

    useProgress({
      lessonProgress: homeProjectionProgress.twoLessonsToday,
      wordProgress: learnedWord
    });
    const twoLessons = await getHomeProjection('cajun');

    expect(twoLessons.firstDay).toBe(true);
    expect(twoLessons.plan.steps.map((step) => step.complete)).toEqual([true, true, false]);
    expect(twoLessons.plan.activeAction).toEqual({
      kind: 'review',
      label: 'Start Daily Review · ~1 min',
      destination: 'DailyReview',
      params: { language: 'cajun' }
    });

    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.twoLessonsToday,
      wordProgress: learnedWord
    });
    const reviewComplete = await getHomeProjection('cajun');

    expect(reviewComplete.firstDay).toBe(true);
    expect(reviewComplete.plan.steps.map((step) => step.complete)).toEqual([true, true, true]);
    expect(reviewComplete.plan).toEqual(expect.objectContaining({
      completedCount: 3,
      activeAction: null,
      allDone: true
    }));
  });

  it('selects the returning plan after a Lesson completed before today', async () => {
    useProgress({ lessonProgress: homeProjectionProgress.lessonYesterday });

    const projection = await getHomeProjection('cajun');

    expect(projection.firstDay).toBe(false);
    expect(projection.dashboard.reviewEnabled).toBe(true);
    expect(projection.plan.steps).toEqual([
      { id: 'review', label: 'Review', complete: false },
      { id: 'lesson', label: 'Lesson', complete: false },
      { id: 'practice', label: 'Speech', complete: false }
    ]);
    expect(projection.plan.activeAction).toEqual(expect.objectContaining({
      kind: 'review',
      destination: 'DailyReview'
    }));
  });

  it('uses the local date for Lesson completion and preserves later completed steps', async () => {
    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.establishedLessonToday,
      pending: [],
      practice: practiceLogs.todaySpeech['2026-03-05']
    });

    const projection = await getHomeProjection('cajun');

    expect(projection.plan.steps).toEqual([
      { id: 'review', label: 'Review', complete: true },
      { id: 'lesson', label: 'Lesson', complete: true },
      { id: 'practice', label: 'Speech', complete: true }
    ]);
    expect(projection.plan.completedCount).toBe(3);
    expect(projection.plan.activeAction).toBeNull();
    expect(projection.plan.helperText).toBeNull();
    expect(projection.plan.allDone).toBe(true);

    useProgress({
      lessonProgress: homeProjectionProgress.establishedLessonToday,
      practice: practiceLogs.todaySpeech['2026-03-05']
    });

    const outOfOrder = await getHomeProjection('cajun');

    expect(outOfOrder.plan.steps).toEqual([
      { id: 'review', label: 'Review', complete: false },
      { id: 'lesson', label: 'Lesson', complete: true },
      { id: 'practice', label: 'Speech', complete: true }
    ]);
    expect(outOfOrder.plan.completedCount).toBe(2);
    expect(outOfOrder.plan.activeAction.kind).toBe('review');

    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.lessonYesterday,
      practice: practiceLogs.todaySpeech['2026-03-05']
    });

    const yesterday = await getHomeProjection('cajun');

    expect(yesterday.plan.steps[1].complete).toBe(false);
    expect(yesterday.plan.activeAction).toEqual({
      kind: 'lesson',
      label: 'Continue lesson · Greetings review',
      destination: 'Lesson',
      params: { language: 'cajun', lessonId: 'fixture_cajun_u01_review' }
    });
  });

  it.each([0, 1, 3, 4, 8, 15])(
    'uses the shared bounded queue for the Review estimate at length %i',
    async (length) => {
      useProgress({ reviewQueue: Array.from({ length }, (_, index) => ({ cardId: `card-${index}` })) });
      getLessonProgress.mockResolvedValue(homeProjectionProgress.lessonYesterday);

      const projection = await getHomeProjection('cajun');

      expect(projection.dashboard.reviewCount).toBe(length);
      expect(projection.plan.activeAction.label).toBe(
        `Start Daily Review · ~${Math.max(1, Math.ceil(length / 3))} min`
      );
    }
  );

  it('invalidates Practice with a new Card and selects the Mistake Review action', async () => {
    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.establishedLessonToday,
      pending: [pendingMistakes.cajun.greetingChoice],
      practice: practiceLogs.todayMistakeReview['2026-03-05']
    });

    const projection = await getHomeProjection('cajun');

    expect(projection.plan.steps[2]).toEqual({
      id: 'practice',
      label: 'Mistakes',
      complete: false
    });
    expect(projection.plan.activeAction).toEqual({
      kind: 'mistakes',
      label: 'Fix 1 mistake',
      destination: 'MistakeReview',
      params: { language: 'cajun', source: 'home' }
    });
  });

  it('projects unique Word mastery and Catalog completion without division errors', async () => {
    const wordProgress = {
      'cajun:fixture_cajun_w01': wordMastery.mastered
    };
    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.allLessonsComplete,
      wordProgress
    });

    const complete = await getHomeProjection('cajun');

    expect(complete.catalogComplete).toBe(true);
    expect(complete.currentUnit).toBeNull();
    expect(complete.units[0]).toEqual(expect.objectContaining({
      masteredWords: 1,
      totalWords: 2,
      masteryPercent: 50,
      completedLessons: 2,
      totalLessons: 2
    }));
    expect(complete.dashboard).toEqual(expect.objectContaining({
      masteredWords: 1,
      totalWords: 4,
      masteryPercent: 25,
      reviewEnabled: true
    }));
    expect(complete.plan.steps).toEqual([
      { id: 'review', label: 'Review', complete: true },
      { id: 'lesson', label: 'Lesson', complete: true },
      { id: 'practice', label: 'Speech', complete: false }
    ]);
    expect(complete.plan.activeAction).toEqual({
      kind: 'speech',
      label: 'Practice Speech',
      destination: 'Advanced',
      params: { language: 'cajun' }
    });

    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.allLessonsComplete,
      pending: [pendingMistakes.cajun.greetingChoice]
    });
    const mistakes = await getHomeProjection('cajun');
    expect(mistakes.plan.activeAction).toEqual({
      kind: 'mistakes',
      label: 'Fix 1 mistake',
      destination: 'MistakeReview',
      params: { language: 'cajun', source: 'home' }
    });

    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.allLessonsComplete,
      practice: practiceLogs.todaySpeech['2026-03-05']
    });
    const allDone = await getHomeProjection('cajun');
    expect(allDone.plan).toEqual(expect.objectContaining({
      completedCount: 3,
      activeAction: null,
      allDone: true
    }));

    useProgress({
      dailyReview: dailyReviewLogs.today,
      lessonProgress: homeProjectionProgress.allLessonsComplete
    });
    getUnits.mockReturnValue([]);
    getAllWords.mockReturnValue([]);
    const empty = await getHomeProjection('kreole');

    expect(empty.catalogComplete).toBe(true);
    expect(empty.currentUnit).toBeNull();
    expect(empty.units).toEqual([]);
    expect(empty.dashboard).toEqual(expect.objectContaining({
      masteredWords: 0,
      totalWords: 0,
      masteryPercent: 0
    }));
    expect(empty.plan.steps[1]).toEqual({ id: 'lesson', label: 'Lesson', complete: true });
    expect(empty.plan.activeAction).toEqual({
      kind: 'speech',
      label: 'Practice Speech',
      destination: 'Advanced',
      params: { language: 'kreole' }
    });
  });

  it('keeps Language data independent while returning the same sanitized structure', async () => {
    getUnits.mockImplementation(catalogLessons);
    getAllWords.mockImplementation(catalogWords);
    getProfile.mockResolvedValue(profiles.fresh);
    getLessonProgress.mockResolvedValue({});
    getWordProgress.mockResolvedValue({});
    getPendingMistakes.mockImplementation(async (language) =>
      language === 'kreole' ? [pendingMistakes.kreole.pronounsChoice] : []
    );
    getLanguageDailyReviewLog.mockImplementation(async (language) =>
      language === 'cajun' ? dailyReviewLogs.today : {}
    );
    getTodayPractice.mockResolvedValue(null);
    getTodayKey.mockReturnValue('2026-03-05');
    getDailyReviewQueue.mockResolvedValue([]);

    const cajun = await getHomeProjection('cajun');
    const kreole = await getHomeProjection('kreole');

    expect(cajun.language).toBe('cajun');
    expect(cajun.firstDay).toBe(true);
    expect(cajun.plan.steps[2].complete).toBe(true);
    expect(cajun.dashboard.pendingMistakeCount).toBe(0);
    expect(kreole.language).toBe('kreole');
    expect(kreole.firstDay).toBe(true);
    expect(kreole.plan.steps[2].complete).toBe(false);
    expect(kreole.dashboard.pendingMistakeCount).toBe(1);
    expect(kreole.plan.steps.map((step) => step.label)).toEqual(['Lesson', 'Lesson', 'Review']);
    expect(kreole.currentUnit.title).toBe('Greetings & Check-ins');
  });
});

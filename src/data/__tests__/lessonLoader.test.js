import {
  getLessonsByLanguage,
  getLessonById,
  getUnits,
  getAllActivities,
  getAllWords
} from '../lessonLoader';
import cajunLessons from '../cajunLessons.json';
import kreoleLessons from '../kreoleLessons.json';

// Characterizes the current Catalog module interface (`src/data/lessonLoader.js`)
// against the bundled JSON data for both Languages. See
// `.scratch/architecture-modernization/issues/02-characterize-catalog-and-progress.md`.

describe('getLessonsByLanguage', () => {
  it('returns the bundled Cajun French lessons for "cajun"', () => {
    expect(getLessonsByLanguage('cajun')).toEqual(cajunLessons);
  });

  it('returns the bundled Kouri-Vini lessons for "kreole"', () => {
    expect(getLessonsByLanguage('kreole')).toEqual(kreoleLessons);
  });

  it('falls back to the Cajun French lessons for an unrecognized Language identity', () => {
    // Current interface: any value other than 'kreole' resolves to the
    // Cajun French bundle. Characterized as-is; not asserted as desirable.
    expect(getLessonsByLanguage('not-a-real-language')).toEqual(cajunLessons);
  });
});

describe('getLessonById', () => {
  it('finds an existing Cajun French Lesson by id', () => {
    const lesson = getLessonById('cajun', 'cajun_u01_l01');
    expect(lesson).toBeDefined();
    expect(lesson.id).toBe('cajun_u01_l01');
    expect(lesson.unit).toBe('u01');
  });

  it('finds an existing Kouri-Vini Lesson by id', () => {
    const lesson = getLessonById('kreole', 'kreole_u01_l01');
    expect(lesson).toBeDefined();
    expect(lesson.id).toBe('kreole_u01_l01');
  });

  it('returns undefined for an unknown Lesson id', () => {
    expect(getLessonById('cajun', 'does-not-exist')).toBeUndefined();
  });
});

describe('getUnits', () => {
  it('orders Units ascending by unit code for Cajun French', () => {
    const units = getUnits('cajun');
    const codes = units.map((u) => u.unit);
    expect(codes).toEqual([...codes].sort());
    expect(codes).toEqual(['u01', 'u02', 'u03', 'u04', 'u05']);
  });

  it('orders Units ascending by unit code for Kouri-Vini', () => {
    const units = getUnits('kreole');
    const codes = units.map((u) => u.unit);
    expect(codes).toEqual([...codes].sort());
    expect(codes).toEqual(['u01', 'u02', 'u03', 'u04', 'u05']);
  });

  it('annotates each Unit and its Lessons with the configured Unit title', () => {
    const units = getUnits('cajun');
    const u01 = units.find((u) => u.unit === 'u01');
    expect(u01.unitTitle).toBe('Greetings & Check-ins');
    expect(u01.lessons.every((lesson) => lesson.unitTitle === 'Greetings & Check-ins')).toBe(true);
  });

  it('orders Lessons within a Unit ascending by lessonNumberInUnit', () => {
    const units = getUnits('cajun');
    const u01 = units.find((u) => u.unit === 'u01');
    const numbers = u01.lessons.map((lesson) => lesson.lessonNumberInUnit);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    // The bundled u01 Unit contains 5 core Lessons plus a review Lesson.
    expect(u01.lessons.map((lesson) => lesson.id)).toEqual([
      'cajun_u01_l01',
      'cajun_u01_l02',
      'cajun_u01_l03',
      'cajun_u01_l04',
      'cajun_u01_l05',
      'cajun_u01_review'
    ]);
  });
});

describe('getAllActivities', () => {
  it('projects lessonId, lessonTitle, unit, and unitTitle onto every Activity', () => {
    const activities = getAllActivities('cajun');
    expect(activities.length).toBeGreaterThan(0);

    const fromFirstLesson = activities.filter((a) => a.lessonId === 'cajun_u01_l01');
    expect(fromFirstLesson.length).toBeGreaterThan(0);
    expect(fromFirstLesson[0].unit).toBe('u01');
    expect(fromFirstLesson[0].unitTitle).toBe('Greetings & Check-ins');
    expect(fromFirstLesson[0].lessonTitle).toBe(
      cajunLessons.find((l) => l.id === 'cajun_u01_l01').lessonTitle
    );
  });

  it('flattens Activities across every Lesson for the Language', () => {
    const expectedCount = cajunLessons.reduce((sum, lesson) => sum + (lesson.activities || []).length, 0);
    expect(getAllActivities('cajun')).toHaveLength(expectedCount);
  });
});

describe('getAllWords', () => {
  it('deduplicates a Word that is repeated across a core Lesson and its review Lesson', () => {
    const coreLesson = cajunLessons.find((l) => l.id === 'cajun_u01_l01');
    const reviewLesson = cajunLessons.find((l) => l.id === 'cajun_u01_review');
    const repeatedRowId = coreLesson.words[0].rowId;

    // Confirm the fixture actually repeats this Word before asserting dedup.
    expect(reviewLesson.words.some((w) => w.rowId === repeatedRowId)).toBe(true);

    const words = getAllWords('cajun');
    const matches = words.filter((w) => w.rowId === repeatedRowId);
    expect(matches).toHaveLength(1);
  });

  it('returns every unique rowId exactly once', () => {
    const words = getAllWords('cajun');
    const rowIds = words.map((w) => w.rowId);
    expect(new Set(rowIds).size).toBe(rowIds.length);
  });

  it('returns Words sorted ascending by rowId', () => {
    const rowIds = getAllWords('cajun').map((w) => w.rowId);
    const sorted = [...rowIds].sort((a, b) => String(a).localeCompare(String(b)));
    expect(rowIds).toEqual(sorted);
  });
});

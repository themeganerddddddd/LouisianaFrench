import {
  getLessonsByLanguage,
  getLessonById,
  getUnits,
  getAllActivities,
  getAllWords
} from '../lessonLoader';

const supportedActivityTypes = [
  'intro_card',
  'listening_target_choice',
  'match_pairs',
  'multiple_choice',
  'sentence_build',
  'typing'
];

const languages = [
  {
    language: 'cajun',
    anchorLesson: { id: 'cajun_u01_l01', unit: 'u01' },
    audioWord: {
      rowId: 'u01_w0002',
      target: 'Comment ça va?',
      audioKey: 'u01_w00002_cajun'
    }
  },
  {
    language: 'kreole',
    anchorLesson: { id: 'kreole_u01_l01', unit: 'u01' },
    audioWord: {
      rowId: 'u01_w0004',
      target: "Ç'ap kouri",
      audioKey: 'u01_w0004_kreole'
    }
  }
];

describe('bundled Catalog', () => {
  it.each(languages)('ships non-empty $language Lessons with a stable anchor', ({
    language,
    anchorLesson
  }) => {
    expect(getLessonsByLanguage(language).length).toBeGreaterThan(0);
    expect(getLessonById(language, anchorLesson.id)).toEqual(
      expect.objectContaining(anchorLesson)
    );
    expect(getLessonById(language, 'does-not-exist')).toBeUndefined();
  });

  it('retains the characterized fallback for an unrecognized Language identity', () => {
    // Characterized as-is; this is not a canonical fixture expectation.
    expect(getLessonsByLanguage('not-a-real-language')).toBe(getLessonsByLanguage('cajun'));
  });

  it.each(languages)('preserves $language Lesson identities and ordering invariants', ({
    language
  }) => {
    const lessons = getLessonsByLanguage(language);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const units = getUnits(language);

    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    expect(
      lessons.every(
        (lesson) =>
          typeof lesson.id === 'string' &&
          lesson.id.startsWith(`${language}_`) &&
          /^u\d{2}$/.test(lesson.unit) &&
          Number.isInteger(lesson.lessonNumberInUnit) &&
          ['core', 'review'].includes(lesson.type)
      )
    ).toBe(true);

    for (let index = 1; index < units.length; index += 1) {
      expect(units[index - 1].unit.localeCompare(units[index].unit)).toBeLessThan(0);
    }

    for (const unit of units) {
      expect(unit.unitTitle).toEqual(expect.any(String));
      for (let index = 1; index < unit.lessons.length; index += 1) {
        expect(unit.lessons[index - 1].lessonNumberInUnit).toBeLessThan(
          unit.lessons[index].lessonNumberInUnit
        );
      }
    }
  });

  it.each(languages)('ships every supported Activity type for $language', ({ language }) => {
    const activities = getAllActivities(language);
    const activityTypes = [...new Set(activities.map((activity) => activity.type))].sort();

    expect(activityTypes).toEqual(supportedActivityTypes);
    expect(
      activities.every(
        (activity) =>
          typeof activity.cardId === 'string' &&
          activity.cardId.length > 0 &&
          typeof activity.lessonId === 'string' &&
          typeof activity.unit === 'string'
      )
    ).toBe(true);
  });

  it.each(languages)('preserves $language Word, Unicode, and Audio identities', ({
    language,
    audioWord
  }) => {
    const words = getAllWords(language);
    const rowIds = words.map((word) => word.rowId);

    expect(words.length).toBeGreaterThan(0);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    expect(words.some((word) => /[^\u0000-\u007f]/.test(word.target))).toBe(true);
    expect(words).toEqual(expect.arrayContaining([expect.objectContaining(audioWord)]));
    expect(
      words.every(
        (word) =>
          typeof word.audioKey === 'string' && word.audioKey.endsWith(`_${language}`)
      )
    ).toBe(true);
  });

  it('ships Unit 03 regional Extra details for the supported Louisiana French forms', () => {
    const activities = getAllActivities('cajun');
    const regionalRowIds = ['u03_w0017', 'u03_w0021', 'u03_w0022', 'u03_w0024'];
    const regionalActivities = activities.filter((activity) =>
      regionalRowIds.includes(activity.rowId)
    );

    expect(regionalActivities.length).toBeGreaterThan(0);
    expect(regionalActivities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowId: 'u03_w0017', extraDetails: expect.stringContaining('ils') }),
        expect.objectContaining({ rowId: 'u03_w0021', extraDetails: expect.stringContaining('Eux-autres') }),
        expect.objectContaining({ rowId: 'u03_w0022', extraDetails: expect.stringContaining('have') }),
        expect.objectContaining({ rowId: 'u03_w0024', extraDetails: expect.stringContaining('Ça') })
      ])
    );
    expect(regionalActivities.every((activity) => !/test|prototype/i.test(activity.extraDetails))).toBe(
      true
    );
  });
});

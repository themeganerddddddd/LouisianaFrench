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
    anchorLesson: {
      id: 'cajun_u01_l01',
      unit: 'u01'
    },
    audioWord: {
      rowId: 'u01_w0002',
      audioKey: 'u01_w00002_cajun'
    }
  },
  {
    language: 'kreole',
    anchorLesson: {
      id: 'kreole_u01_l01',
      unit: 'u01'
    },
    audioWord: {
      rowId: 'u01_w0004',
      audioKey: 'u01_w0004_kreole'
    }
  }
];

function hasValidAudioKeyForLanguage(language, audioKey) {
  if (typeof audioKey !== 'string' || audioKey.length === 0) {
    return false;
  }

  if (language === 'cajun') {
    return audioKey.endsWith('_cajun') || audioKey.endsWith('_lf');
  }

  if (language === 'kreole') {
    return audioKey.endsWith('_kreole');
  }

  return false;
}

describe('bundled Catalog', () => {
  it.each(languages)(
    'ships non-empty $language Lessons with a stable anchor',
    ({ language, anchorLesson }) => {
      expect(
        getLessonsByLanguage(language).length
      ).toBeGreaterThan(0);

      expect(
        getLessonById(language, anchorLesson.id)
      ).toEqual(
        expect.objectContaining(anchorLesson)
      );

      expect(
        getUnits(language)[0].lessons[0]
      ).toEqual(
        expect.objectContaining({
          ...anchorLesson,
          wordCount: 5
        })
      );

      expect(
        getLessonById(language, 'does-not-exist')
      ).toBeUndefined();
    }
  );

  it(
    'retains the characterized fallback for an unrecognized Language identity',
    () => {
      expect(
        getLessonsByLanguage('not-a-real-language')
      ).toBe(
        getLessonsByLanguage('cajun')
      );
    }
  );

  it.each(languages)(
    'preserves $language Lesson identities and ordering invariants',
    ({ language }) => {
      const lessons = getLessonsByLanguage(language);
      const lessonIds = lessons.map((lesson) => lesson.id);
      const units = getUnits(language);

      expect(
        new Set(lessonIds).size
      ).toBe(lessonIds.length);

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

      for (
        let index = 1;
        index < units.length;
        index += 1
      ) {
        expect(
          units[index - 1].unit.localeCompare(
            units[index].unit
          )
        ).toBeLessThan(0);
      }

      for (const unit of units) {
        expect(
          unit.unitTitle
        ).toEqual(
          expect.any(String)
        );

        for (
          let index = 1;
          index < unit.lessons.length;
          index += 1
        ) {
          expect(
            unit.lessons[index - 1].lessonNumberInUnit
          ).toBeLessThan(
            unit.lessons[index].lessonNumberInUnit
          );
        }
      }
    }
  );

  it.each(languages)(
    'ships every supported Activity type for $language',
    ({ language }) => {
      const activities = getAllActivities(language);

      const activityTypes = [
        ...new Set(
          activities.map(
            (activity) => activity.type
          )
        )
      ].sort();

      expect(
        activityTypes
      ).toEqual(
        supportedActivityTypes
      );

      expect(
        activities.every(
          (activity) =>
            typeof activity.cardId === 'string' &&
            activity.cardId.length > 0 &&
            typeof activity.lessonId === 'string' &&
            typeof activity.unit === 'string'
        )
      ).toBe(true);
    }
  );

  it.each(languages)(
    'preserves $language Word, Unicode, and Audio identities',
    ({ language, audioWord }) => {
      const words = getAllWords(language);
      const rowIds = words.map((word) => word.rowId);

      expect(
        words.length
      ).toBeGreaterThan(0);

      expect(
        new Set(rowIds).size
      ).toBe(rowIds.length);

      expect(
        words.some(
          (word) =>
            /[^\u0000-\u007f]/.test(word.target)
        )
      ).toBe(true);

      expect(
        words
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining(audioWord)
        ])
      );

      expect(
        words.every(
          (word) =>
            hasValidAudioKeyForLanguage(
              language,
              word.audioKey
            )
        )
      ).toBe(true);
    }
  );

  it(
    'ships Unit 03 Louisiana French activities with valid bundled data',
    () => {
      const activities =
        getAllActivities('cajun');

      const unit03Activities =
        activities.filter(
          (activity) =>
            activity.unit === 'u03'
        );

      expect(
        unit03Activities.length
      ).toBeGreaterThan(0);

      /*
       * Some generated activities, especially match_pairs,
       * do not have a rowId of their own.
       *
       * Only validate rowId for activities that actually have one.
       */
      const activitiesWithRowIds =
        unit03Activities.filter(
          (activity) =>
            typeof activity.rowId === 'string'
        );

      expect(
        activitiesWithRowIds.length
      ).toBeGreaterThan(0);

      expect(
        activitiesWithRowIds.every(
          (activity) =>
            activity.rowId.startsWith('u03_')
        )
      ).toBe(true);

      /*
       * Make sure Unit 03 contains playable Cajun/LF audio.
       */
      expect(
        unit03Activities.some(
          (activity) =>
            typeof activity.audioKey === 'string' &&
            hasValidAudioKeyForLanguage(
              'cajun',
              activity.audioKey
            )
        )
      ).toBe(true);

      /*
       * Keep accidental test/prototype metadata
       * out of extraDetails.
       */
      expect(
        unit03Activities.every(
          (activity) =>
            !/test|prototype/i.test(
              activity.extraDetails || ''
            )
        )
      ).toBe(true);
    }
  );

  it(
    'does not ship test or prototype text in Extra details',
    () => {
      for (const language of [
        'cajun',
        'kreole'
      ]) {
        const activities =
          getAllActivities(language);

        expect(
          activities.every(
            (activity) =>
              !/test|prototype/i.test(
                activity.extraDetails || ''
              )
          )
        ).toBe(true);
      }
    }
  );
});

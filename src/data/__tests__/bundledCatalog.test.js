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
      unit: 'u01',
      lessonTitle: 'Part 1 — Hello!, How’s it going?, Are things okay?'
    },
    audioWord: {
      rowId: 'u01_w0002',
      target: 'Comment ça va?',
      audioKey: 'u01_w00002_cajun'
    }
  },
  {
    language: 'kreole',
    anchorLesson: {
      id: 'kreole_u01_l01',
      unit: 'u01',
      lessonTitle: 'Part 1 — Hello, How is it going?, How goes it?'
    },
    audioWord: {
      rowId: 'u01_w0004',
      target: "Ç'apé kouri",
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
    ({
      language,
      anchorLesson
    }) => {
      expect(
        getLessonsByLanguage(language).length
      ).toBeGreaterThan(0);

      expect(
        getLessonById(
          language,
          anchorLesson.id
        )
      ).toEqual(
        expect.objectContaining(
          anchorLesson
        )
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
        getLessonById(
          language,
          'does-not-exist'
        )
      ).toBeUndefined();
    }
  );

  it(
    'retains the characterized fallback for an unrecognized Language identity',
    () => {
      // Characterized as-is; this is not a canonical fixture expectation.
      expect(
        getLessonsByLanguage(
          'not-a-real-language'
        )
      ).toBe(
        getLessonsByLanguage('cajun')
      );
    }
  );

  it.each(languages)(
    'preserves $language Lesson identities and ordering invariants',
    ({
      language
    }) => {
      const lessons =
        getLessonsByLanguage(language);

      const lessonIds =
        lessons.map(
          (lesson) => lesson.id
        );

      const units =
        getUnits(language);

      expect(
        new Set(lessonIds).size
      ).toBe(
        lessonIds.length
      );

      expect(
        lessons.every(
          (lesson) =>
            typeof lesson.id === 'string' &&
            lesson.id.startsWith(
              `${language}_`
            ) &&
            /^u\d{2}$/.test(
              lesson.unit
            ) &&
            Number.isInteger(
              lesson.lessonNumberInUnit
            ) &&
            ['core', 'review'].includes(
              lesson.type
            )
        )
      ).toBe(true);

      for (
        let index = 1;
        index < units.length;
        index += 1
      ) {
        expect(
          units[
            index - 1
          ].unit.localeCompare(
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
            unit.lessons[
              index - 1
            ].lessonNumberInUnit
          ).toBeLessThan(
            unit.lessons[
              index
            ].lessonNumberInUnit
          );
        }
      }
    }
  );

  it.each(languages)(
    'ships every supported Activity type for $language',
    ({
      language
    }) => {
      const activities =
        getAllActivities(language);

      const activityTypes = [
        ...new Set(
          activities.map(
            (activity) =>
              activity.type
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
            typeof activity.cardId ===
              'string' &&
            activity.cardId.length > 0 &&
            typeof activity.lessonId ===
              'string' &&
            typeof activity.unit ===
              'string'
        )
      ).toBe(true);
    }
  );

  it.each(languages)(
    'preserves $language Word, Unicode, and Audio identities',
    ({
      language,
      audioWord
    }) => {
      const words =
        getAllWords(language);

      const rowIds =
        words.map(
          (word) => word.rowId
        );

      expect(
        words.length
      ).toBeGreaterThan(0);

      expect(
        new Set(rowIds).size
      ).toBe(
        rowIds.length
      );

      expect(
        words.some(
          (word) =>
            /[^\u0000-\u007f]/.test(
              word.target
            )
        )
      ).toBe(true);

      expect(
        words
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining(
            audioWord
          )
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
    'ships Unit 03 extra details for supported Louisiana French forms',
    () => {
      const activities =
        getAllActivities('cajun');

      const detailRowIds = [
        'u03_w0002',
        'u03_w0015',
        'u03_w0018',
        'u03_w0020'
      ];

      const detailActivities =
        activities.filter(
          (activity) =>
            detailRowIds.includes(
              activity.rowId
            )
        );

      expect(
        detailActivities.length
      ).toBeGreaterThan(0);

      expect(
        detailActivities
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rowId: 'u03_w0002',
            extraDetails:
              expect.stringContaining(
                'not automatically capitalized'
              )
          }),

          expect.objectContaining({
            rowId: 'u03_w0015',
            extraDetails:
              expect.stringContaining(
                'gender'
              )
          }),

          expect.objectContaining({
            rowId: 'u03_w0018',
            extraDetails:
              expect.stringContaining(
                'icitte'
              )
          }),

          expect.objectContaining({
            rowId: 'u03_w0020',
            extraDetails:
              expect.stringContaining(
                'ending changes'
              )
          })
        ])
      );

      expect(
        detailActivities.every(
          (activity) =>
            !/test|prototype/i.test(
              activity.extraDetails || ''
            )
        )
      ).toBe(true);

      expect(
        activities.every(
          (activity) =>
            !/test|prototype/i.test(
              activity.extraDetails || ''
            )
        )
      ).toBe(true);
    }
  );
});

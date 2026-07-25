import { createCatalog } from '../catalog';

function createSource(lessonsByLanguage) {
  return {
    getLessonsByLanguage(language) {
      return lessonsByLanguage[language] || lessonsByLanguage.cajun;
    }
  };
}

describe('createCatalog', () => {
  it('runs the Catalog interface against supplied Lesson data', () => {
    const cajunLessons = [
      {
        id: 'fixture_l02',
        unit: 'u01',
        lessonNumberInUnit: 2,
        lessonTitle: 'Second',
        activities: [{ cardId: 'fixture:choice' }],
        words: [{ rowId: 'fixture_w02' }]
      },
      {
        id: 'fixture_l01',
        unit: 'u01',
        lessonNumberInUnit: 1,
        lessonTitle: 'First',
        activities: [{ cardId: 'fixture:intro' }],
        words: [{ rowId: 'fixture_w01' }, { rowId: 'fixture_w02' }]
      }
    ];
    const catalog = createCatalog(createSource({ cajun: cajunLessons }));

    expect(catalog.getLessonsByLanguage('cajun')).toBe(cajunLessons);
    expect(catalog.getLessonById('cajun', 'fixture_l01')).toBe(cajunLessons[1]);
    expect(catalog.getUnits('cajun')[0].lessons.map((lesson) => lesson.id)).toEqual([
      'fixture_l01',
      'fixture_l02'
    ]);
    expect(catalog.getAllActivities('cajun').map((activity) => activity.lessonId)).toEqual([
      'fixture_l02',
      'fixture_l01'
    ]);
    expect(catalog.getAllWords('cajun').map((word) => word.rowId)).toEqual([
      'fixture_w01',
      'fixture_w02'
    ]);
  });

  it('keeps supplied sources isolated between Catalog instances', () => {
    const firstLessons = [{ id: 'first' }];
    const secondLessons = [{ id: 'second' }];
    const firstCatalog = createCatalog(createSource({ cajun: firstLessons }));
    const secondCatalog = createCatalog(createSource({ cajun: secondLessons }));

    expect(firstCatalog.getLessonsByLanguage('cajun')).toBe(firstLessons);
    expect(secondCatalog.getLessonsByLanguage('cajun')).toBe(secondLessons);
    expect(firstCatalog.getLessonsByLanguage('cajun')).toBe(firstLessons);
  });
});

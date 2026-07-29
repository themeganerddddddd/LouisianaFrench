import { createCatalog } from '../catalog';
import {
  compactCatalogLessons,
  compactCatalogSource
} from '../../test/fixtures/catalog/compactCatalog';

function createSource(lessonsByLanguage) {
  return {
    getLessonsByLanguage(language) {
      return lessonsByLanguage[language] || lessonsByLanguage.cajun;
    }
  };
}

describe('createCatalog', () => {
  const catalog = createCatalog(compactCatalogSource);

  it.each([
    ['cajun', 'fixture_cajun_u01_l01'],
    ['kreole', 'fixture_kreole_u01_l01']
  ])('returns and looks up supplied %s Lessons', (language, lessonId) => {
    expect(catalog.getLessonsByLanguage(language)).toBe(compactCatalogLessons[language]);
    expect(catalog.getLessonById(language, lessonId)).toBe(
      compactCatalogLessons[language][2]
    );
    expect(catalog.getLessonById(language, 'missing_lesson')).toBeUndefined();
  });

  it('keeps the compact fixture immutable at every depth', () => {
    expect(Object.isFrozen(compactCatalogLessons)).toBe(true);
    expect(Object.isFrozen(compactCatalogLessons.cajun)).toBe(true);
    expect(Object.isFrozen(compactCatalogLessons.cajun[2].words[0])).toBe(true);
    expect(Object.isFrozen(compactCatalogLessons.cajun[2].activities[1].options)).toBe(true);
  });

  it.each([
    [
      'cajun',
      'Pronouns & Greetings',
      ['fixture_cajun_u01_l01', 'fixture_cajun_u01_review']
    ],
    [
      'kreole',
      'Greetings & Check-ins',
      ['fixture_kreole_u01_l01', 'fixture_kreole_u01_review']
    ]
  ])('orders %s Units and Lessons and annotates their titles', (language, unitTitle, lessonIds) => {
    const units = catalog.getUnits(language);

    expect(units.map((unit) => unit.unit)).toEqual(['u01', 'u02']);
    expect(units[0].unitTitle).toBe(unitTitle);
    expect(units[0].lessons.map((lesson) => lesson.id)).toEqual(lessonIds);
    expect(units[0].lessons.every((lesson) => lesson.unitTitle === unitTitle)).toBe(true);
  });

  it('flattens every Activity type and projects its Lesson and Unit context', () => {
    const activities = catalog.getAllActivities('cajun');
    const projected = activities.find(
      (activity) => activity.cardId === 'fixture:cajun:greeting:listen'
    );

    expect(activities.map((activity) => activity.type).sort()).toEqual([
      'intro_card',
      'listening_target_choice',
      'match_pairs',
      'multiple_choice',
      'sentence_build',
      'typing'
    ]);
    expect(projected).toEqual(
      expect.objectContaining({
        lessonId: 'fixture_cajun_u01_l01',
        lessonTitle: 'First greetings',
        unit: 'u01',
        unitTitle: 'Pronouns & Greetings'
      })
    );
    expect(catalog.getAllActivities('kreole').map((activity) => activity.lessonId)).toEqual([
      'fixture_kreole_u02_l01',
      'fixture_kreole_u01_review',
      'fixture_kreole_u01_l01'
    ]);
  });

  it.each([
    [
      'cajun',
      ['fixture_cajun_w01', 'fixture_cajun_w02', 'fixture_cajun_w03'],
      'Greetings & Check-ins'
    ],
    [
      'kreole',
      ['fixture_kreole_w01', 'fixture_kreole_w02', 'fixture_kreole_w03'],
      'Greetings & Check-ins'
    ]
  ])('deduplicates, sorts, and annotates %s Words', (language, rowIds, firstUnitTitle) => {
    const words = catalog.getAllWords(language);

    expect(words.map((word) => word.rowId)).toEqual(rowIds);
    expect(words[0].unitTitle).toBe(firstUnitTitle);
    expect(words.some((word) => word.audioKey)).toBe(true);
    expect(words.some((word) => !word.audioKey)).toBe(true);
  });

  it('preserves accented text and straight and curly apostrophes', () => {
    expect(catalog.getAllWords('cajun')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ english: 'How’s it going?', target: 'Ça va?' }),
        expect.objectContaining({ english: "It's ready", target: "C'est paré" })
      ])
    );
    expect(catalog.getAllWords('kreole')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ english: "y'all", target: 'vouzòt' })
      ])
    );
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

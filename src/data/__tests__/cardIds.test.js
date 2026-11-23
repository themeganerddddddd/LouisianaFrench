import cajunLessons from '../cajunLessons.json';
import kreoleLessons from '../kreoleLessons.json';
import legacyCardIds from '../legacyCardIds.json';

const shipped = { cajun: cajunLessons, kreole: kreoleLessons };

function cardIdProblems(lessonsByLanguage, map) {
  const problems = [];

  for (const [language, lessons] of Object.entries(lessonsByLanguage)) {
    const seen = new Map();

    for (const lesson of lessons) {
      for (const activity of lesson.activities || []) {
        const previous = seen.get(activity.cardId);
        if (previous) {
          problems.push(`repeat ${activity.cardId} in ${previous} and ${lesson.id}`);
        } else {
          seen.set(activity.cardId, lesson.id);
        }
      }
    }

    for (const [oldId, copies] of Object.entries(map?.[language] || {})) {
      if (seen.has(oldId)) problems.push(`retired ${oldId} is in the catalog`);

      for (const [lessonId, newId] of Object.entries(copies || {})) {
        const lesson = lessons.find((item) => item.id === lessonId);
        const activity = lesson?.activities?.find((item) => item.cardId === newId);
        if (!activity) problems.push(`missing ${newId}`);
      }
    }
  }

  return problems;
}

function assertSound(lessonsByLanguage, map) {
  const problems = cardIdProblems(lessonsByLanguage, map);
  if (problems.length) throw new Error(problems.join('\n'));
}

describe('card ids', () => {
  it('keeps every shipped card id unique and pointed at by the legacy map', () => {
    assertSound(shipped, legacyCardIds);
    expect(Object.keys(legacyCardIds.cajun)).toHaveLength(15);
    expect(Object.keys(legacyCardIds.kreole)).toHaveLength(9);
    expect(legacyCardIds.version).toBe(1);
  });

  it('fails on a repeated card id', () => {
    expect(() => assertSound({
      cajun: [
        { id: 'a', activities: [{ cardId: 'same' }] },
        { id: 'b', activities: [{ cardId: 'same' }] }
      ]
    }, { cajun: {} })).toThrow(/repeat same/);
  });

  it('fails when a map target is missing from the catalog', () => {
    expect(() => assertSound({
      cajun: [{ id: 'a', activities: [{ cardId: 'kept' }] }]
    }, {
      cajun: { old: { a: 'old::a' } }
    })).toThrow(/missing old::a/);
  });

  it('fails when a retired id is used again', () => {
    expect(() => assertSound({
      cajun: [{ id: 'a', activities: [{ cardId: 'old' }, { cardId: 'old::b' }] }]
    }, {
      cajun: { old: { a: 'old::b' } }
    })).toThrow(/retired old/);
  });
});

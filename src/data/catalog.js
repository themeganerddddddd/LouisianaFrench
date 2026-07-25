import { getUnitTitle } from '../constants/unitTitles';

export function createCatalog(source) {
  function getLessonsByLanguage(language) {
    return source.getLessonsByLanguage(language);
  }

  function getLessonById(language, lessonId) {
    const lessons = getLessonsByLanguage(language);
    return lessons.find((lesson) => lesson.id === lessonId || String(lesson.id) === String(lessonId));
  }

  function getUnits(language) {
    const lessons = getLessonsByLanguage(language);
    const map = new Map();

    for (const lesson of lessons) {
      const unitCode = lesson.unit || lesson.unitCode || 'u00';

      if (!map.has(unitCode)) {
        map.set(unitCode, {
          unit: unitCode,
          unitTitle: getUnitTitle(language, unitCode),
          lessons: []
        });
      }

      map.get(unitCode).lessons.push({
        ...lesson,
        unit: unitCode,
        unitTitle: getUnitTitle(language, unitCode)
      });
    }

    return Array.from(map.values())
      .sort((a, b) => a.unit.localeCompare(b.unit))
      .map((unitObj) => ({
        ...unitObj,
        lessons: unitObj.lessons.sort((a, b) => {
          const aNum = Number(a.lessonNumberInUnit || a.order || 0);
          const bNum = Number(b.lessonNumberInUnit || b.order || 0);
          return aNum - bNum;
        })
      }));
  }

  function getAllActivities(language) {
    return getLessonsByLanguage(language).flatMap((lesson) =>
      (lesson.activities || []).map((activity) => ({
        ...activity,
        lessonId: lesson.id,
        lessonTitle: lesson.lessonTitle || lesson.title || 'Lesson',
        unit: lesson.unit || lesson.unitCode || 'u00',
        unitTitle: getUnitTitle(language, lesson.unit || lesson.unitCode || 'u00')
      }))
    );
  }

  function getAllWords(language) {
    const lessons = getLessonsByLanguage(language);
    const seen = new Set();
    const words = [];

    for (const lesson of lessons) {
      const unitCode = lesson.unit || lesson.unitCode || 'u00';
      const unitTitle = getUnitTitle(language, unitCode);

      for (const word of lesson.words || []) {
        const rowId = word.rowId || word.id;
        const key = `${language}:${rowId}`;
        if (!rowId || seen.has(key)) continue;

        seen.add(key);
        words.push({
          ...word,
          rowId,
          unit: unitCode,
          unitTitle
        });
      }
    }

    return words.sort((a, b) => String(a.rowId).localeCompare(String(b.rowId)));
  }

  return {
    getLessonsByLanguage,
    getLessonById,
    getUnits,
    getAllActivities,
    getAllWords
  };
}

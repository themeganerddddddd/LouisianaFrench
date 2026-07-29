import { getUnitTitle } from '../constants/unitTitles';
import cajunLessons from './cajunLessons.json';
import kreoleLessons from './kreoleLessons.json';

export function getLessonsByLanguage(language) {
  return language === 'kreole' ? kreoleLessons : cajunLessons;
}

export function getLessonById(language, lessonId) {
  const lessons = getLessonsByLanguage(language);

  return lessons.find(
    (lesson) => lesson.id === lessonId || String(lesson.id) === String(lessonId)
  );
}

export function getLessonUnitTitle(language, lessonOrUnitCode) {
  if (typeof lessonOrUnitCode === 'object' && lessonOrUnitCode !== null) {
    const unitCode = lessonOrUnitCode.unit || lessonOrUnitCode.unitCode || 'u00';
    return lessonOrUnitCode.unitTitle || getUnitTitle(language, unitCode);
  }

  return getUnitTitle(language, lessonOrUnitCode || 'u00');
}

export function getUnits(language) {
  const lessons = getLessonsByLanguage(language);
  const map = new Map();

  for (const lesson of lessons) {
    const unitCode = lesson.unit || lesson.unitCode || 'u00';
    const unitTitle = getLessonUnitTitle(language, lesson);

    if (!map.has(unitCode)) {
      map.set(unitCode, {
        unit: unitCode,
        unitTitle,
        lessons: []
      });
    }

    map.get(unitCode).lessons.push({
      ...lesson,
      unit: unitCode,
      unitTitle
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

export function getAllActivities(language) {
  return getLessonsByLanguage(language).flatMap((lesson) => {
    const unitCode = lesson.unit || lesson.unitCode || 'u00';
    const unitTitle = getLessonUnitTitle(language, lesson);

    return (lesson.activities || []).map((activity) => ({
      ...activity,
      lessonId: lesson.id,
      lessonTitle: lesson.lessonTitle || lesson.title || 'Lesson',
      unit: unitCode,
      unitTitle
    }));
  });
}

export function getAllWords(language) {
  const lessons = getLessonsByLanguage(language);
  const seen = new Set();
  const words = [];

  for (const lesson of lessons) {
    const unitCode = lesson.unit || lesson.unitCode || 'u00';
    const unitTitle = getLessonUnitTitle(language, lesson);

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
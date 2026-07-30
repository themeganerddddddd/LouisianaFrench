import cajunLessons from './cajunLessons.json';
import kreoleLessons from './kreoleLessons.json';
import { UNIT_PREFACES } from '../constants/unitPrefaces';
import { createCatalog } from './catalog';

const bundledCatalog = createCatalog({
  getLessonsByLanguage(language) {
    return language === 'kreole' ? kreoleLessons : cajunLessons;
  },
  getUnitPreface(language, unitCode) {
    return UNIT_PREFACES[language]?.[unitCode];
  }
});

export function getLessonsByLanguage(language) {
  return bundledCatalog.getLessonsByLanguage(language);
}

export function getLessonById(language, lessonId) {
  return bundledCatalog.getLessonById(language, lessonId);
}

export function getUnits(language) {
  return bundledCatalog.getUnits(language);
}

export function getAllActivities(language) {
  return bundledCatalog.getAllActivities(language);
}

export function getAllWords(language) {
  return bundledCatalog.getAllWords(language);
}

export function getUnitPreface(language, unitCode) {
  return bundledCatalog.getUnitPreface(language, unitCode);
}

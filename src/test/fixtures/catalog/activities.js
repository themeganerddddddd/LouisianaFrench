import { createCatalog } from '../../../data/catalog';
import {
  compactCatalogLessons,
  compactCatalogSource
} from './compactCatalog';

export const fixtureCatalog = createCatalog(compactCatalogSource);

export function activityByCardId(cardId, language = 'cajun') {
  const activity = fixtureCatalog
    .getAllActivities(language)
    .find((item) => item.cardId === cardId);

  if (!activity) {
    throw new Error(`Missing fixture Activity: ${cardId}`);
  }

  return activity;
}

export function lessonById(lessonId, language = 'cajun') {
  const lesson = fixtureCatalog.getLessonById(language, lessonId);

  if (!lesson) {
    throw new Error(`Missing fixture Lesson: ${lessonId}`);
  }

  return lesson;
}

export const fixtureActivities = Object.freeze({
  intro: activityByCardId('fixture:cajun:greeting:intro'),
  listening: activityByCardId('fixture:cajun:greeting:listen'),
  multipleChoice: activityByCardId('fixture:cajun:greeting:choice'),
  typing: activityByCardId('fixture:cajun:greeting:typing'),
  sentenceBuild: activityByCardId('fixture:cajun:ready:build'),
  matchPairs: activityByCardId('fixture:cajun:greetings:match')
});

export { compactCatalogLessons, compactCatalogSource };

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

// Compact select_multiple Activity kept outside the Lesson lists so Unit
// preface and Lesson progress fixtures that assume fixed Activity counts stay stable.
export const selectMultipleActivity = Object.freeze({
  cardId: 'fixture:cajun:they-are:select-all',
  type: 'select_multiple',
  prompt: 'Select all options that mean ‘they are’.',
  english: 'they are',
  target: 'ils sont',
  options: ['ils sont', 'eux-autres est', 'eusse est', 'ils ont'],
  answers: ['ils sont', 'eux-autres est', 'eusse est'],
  answerDisplay: 'ils sont, eux-autres est, eusse est',
  optionAudioMap: {}
});

export const fixtureActivities = Object.freeze({
  intro: activityByCardId('fixture:cajun:greeting:intro'),
  listening: activityByCardId('fixture:cajun:greeting:listen'),
  multipleChoice: activityByCardId('fixture:cajun:greeting:choice'),
  typing: activityByCardId('fixture:cajun:greeting:typing'),
  sentenceBuild: activityByCardId('fixture:cajun:ready:build'),
  matchPairs: activityByCardId('fixture:cajun:greetings:match'),
  toBeIntro: activityByCardId('fixture:cajun:to-be:intro'),
  selectMultiple: selectMultipleActivity
});

export { compactCatalogLessons, compactCatalogSource };

import { getAllWords, getUnits } from '../data/lessonLoader';
import {
  getLanguageDailyReviewLog,
  getLessonProgress,
  getPendingMistakes,
  getProfile,
  getTodayKey,
  getTodayPractice,
  getWordProgress
} from './storage';
import { getDailyReviewQueue } from './reviewQueue';
function unitLabel(unitCode) {
  const match = String(unitCode || '').match(/u(\d+)/i);
  return match ? `Unit ${Number(match[1])}` : 'Unit';
}
function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}
function completedToday(progress, language, today) {
  return Object.entries(progress).some(([key, record]) => {
    if (!key.startsWith(`${language}:`) || !record?.completedAt || !record.completed) {
      return false;
    }
    const completedAt = new Date(record.completedAt);
    return !Number.isNaN(completedAt.getTime()) && localDateKey(completedAt) === today;
  });
}
function percentage(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

function summarizeUnit(unit, language, lessonProgress, wordProgress) {
  const words = new Map();
  const lessons = unit.lessons || [];

  lessons.forEach((lesson) => {
    (lesson.words || []).forEach((word) => {
      const rowId = word.rowId || word.id;
      if (rowId && !words.has(rowId)) words.set(rowId, rowId);
    });
  });

  const masteredWords = [...words.values()].filter(
    (rowId) => wordProgress[`${language}:${rowId}`]?.status === 'mastered'
  ).length;
  const lessonSummaries = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.lessonTitle || lesson.title || 'Lesson',
    wordCount: lesson.wordCount || (lesson.words || []).length || 0,
    typeLabel: lesson.type === 'review' ? 'Review' : 'Core lesson',
    complete: Boolean(lessonProgress[`${language}:${lesson.id}`]?.completed)
  }));

  return {
    unitCode: unit.unit,
    unitLabel: unitLabel(unit.unit),
    title: unit.unitTitle || unitLabel(unit.unit),
    masteredWords,
    totalWords: words.size,
    masteryPercent: percentage(masteredWords, words.size),
    completedLessons: lessonSummaries.filter((lesson) => lesson.complete).length,
    totalLessons: lessonSummaries.length,
    lessons: lessonSummaries
  };
}

function currentUnitFor(units) {
  const current = units.find((unit) => unit.lessons.some((lesson) => !lesson.complete));
  if (!current) return null;

  const nextLesson = current.lessons.find((lesson) => !lesson.complete);
  const { lessons, ...summary } = current;
  return {
    ...summary,
    nextLesson: {
      id: nextLesson.id,
      title: nextLesson.title,
      wordCount: nextLesson.wordCount,
      typeLabel: nextLesson.typeLabel
    }
  };
}

function actionFor(index, language, reviewMinutes, nextLesson, pendingCount) {
  if (index === 0) {
    return {
      kind: 'review',
      label: `Start Daily Review · ~${reviewMinutes} min`,
      destination: 'DailyReview',
      params: { language }
    };
  }

  if (index === 1 && nextLesson) {
    return {
      kind: 'lesson',
      label: `Continue lesson · ${nextLesson.title}`,
      destination: 'Lesson',
      params: { language, lessonId: nextLesson.id }
    };
  }

  if (index === 2 && pendingCount) {
    return {
      kind: 'mistakes',
      label: `Fix ${pendingCount} mistake${pendingCount === 1 ? '' : 's'}`,
      destination: 'MistakeReview',
      params: { language, source: 'home' }
    };
  }

  if (index === 2) {
    return {
      kind: 'speech',
      label: 'Practice Speech',
      destination: 'Advanced',
      params: { language }
    };
  }

  return null;
}

export async function getHomeProjection(language) {
  const [catalogUnits, catalogWords, profile, lessonProgress, wordProgress, reviewLog,
    reviewQueue, pendingMistakes, todayPractice, today] = await Promise.all([
    getUnits(language),
    getAllWords(language),
    getProfile(),
    getLessonProgress(),
    getWordProgress(),
    getLanguageDailyReviewLog(language),
    getDailyReviewQueue(language),
    getPendingMistakes(language),
    getTodayPractice(language),
    getTodayKey()
  ]);

  const uniqueWords = new Map();
  catalogWords.forEach((word) => {
    const rowId = word.rowId || word.id;
    if (rowId && !uniqueWords.has(rowId)) uniqueWords.set(rowId, rowId);
  });
  const masteredWords = [...uniqueWords.values()].filter(
    (rowId) => wordProgress[`${language}:${rowId}`]?.status === 'mastered'
  ).length;
  const units = catalogUnits.map((unit) =>
    summarizeUnit(unit, language, lessonProgress, wordProgress)
  );
  const currentUnit = currentUnitFor(units);
  const pendingCount = pendingMistakes.length;
  const practiceComplete = todayPractice !== null && pendingCount === 0;
  const steps = [
    { id: 'review', label: 'Review', complete: Boolean(reviewLog[today]) },
    { id: 'lesson', label: 'Lesson', complete: completedToday(lessonProgress, language, today) },
    { id: 'practice', label: pendingCount ? 'Mistakes' : 'Speech', complete: practiceComplete }
  ];
  const firstIncomplete = steps.findIndex((step) => !step.complete);
  const nextLesson = currentUnit?.nextLesson || null;
  const helperText = pendingCount === 0 && !practiceComplete
    ? 'No mistakes to fix — speech practice instead.'
    : null;

  return {
    language,
    dashboard: {
      xp: profile.xp || 0,
      streak: profile.streak || 0,
      masteredWords,
      totalWords: uniqueWords.size,
      masteryPercent: percentage(masteredWords, uniqueWords.size),
      reviewCount: reviewQueue.length,
      pendingMistakeCount: pendingCount
    },
    plan: {
      steps,
      completedCount: steps.filter((step) => step.complete).length,
      activeAction: firstIncomplete < 0
        ? null
        : actionFor(
          firstIncomplete,
          language,
          Math.max(1, Math.ceil(reviewQueue.length / 3)),
          nextLesson,
          pendingCount
        ),
      helperText,
      allDone: firstIncomplete < 0
    },
    currentUnit,
    catalogComplete: currentUnit === null,
    units,
    initialExpandedUnit: null
  };
}

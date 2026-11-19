const RECENT_WORD_COUNT = 3;
const WEAKNESS = { strong: 1, mastered: 2 };

function progressKey(lesson, id) {
  if (!lesson.language) throw new Error(`Lesson ${lesson.id} has no language`);
  return `${lesson.language}:${id}`;
}

export function pickSpeechWords({ lessons, lessonProgress, wordProgress, limit }) {
  const audioWords = (lesson) => lesson.words
    .filter((word) => word.audioKey)
    .map((word) => ({ word, progress: wordProgress[progressKey(lesson, word.rowId)] }));
  const completedAt = (lesson) => lessonProgress[progressKey(lesson, lesson.id)]?.completedAt;
  const completed = lessons
    .filter(completedAt)
    .sort((a, b) => completedAt(b).localeCompare(completedAt(a)));

  if (completed.length === 0) {
    const first = lessons.find((lesson) => audioWords(lesson).length > 0);
    return first ? audioWords(first).slice(0, limit).map(({ word }) => word) : [];
  }

  const picked = new Map();
  const take = (entries, upTo) => entries.forEach(({ word }) => {
    if (picked.size < upTo && !picked.has(word.rowId)) picked.set(word.rowId, word);
  });

  const recentCount = Math.min(RECENT_WORD_COUNT, limit);
  const recent = [];
  for (const lesson of completed) {
    if (picked.size >= recentCount) break;
    recent.push(lesson);
    take(audioWords(lesson), recentCount);
  }

  const outsideRecent = (lesson) => !recent.includes(lesson);
  const weakness = ({ progress }) => WEAKNESS[progress?.status] ?? 0;
  take([
    ...completed.filter(outsideRecent).flatMap(audioWords),
    ...lessons.filter(outsideRecent).flatMap(audioWords).filter(({ progress }) => progress?.seen > 0)
  ].sort((a, b) => weakness(a) - weakness(b)), limit);
  take(recent.flatMap(audioWords), limit);

  return [...picked.values()];
}

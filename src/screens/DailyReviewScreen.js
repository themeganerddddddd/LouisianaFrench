import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ActivityRenderer from '../components/ActivityRenderer';
import ProgressHeader from '../components/ProgressHeader';
import { getAllActivities } from '../data/lessonLoader';
import {
  getDueReviewItems,
  getWeakItems,
  updateCardReview
} from '../utils/spacedRepetition';
import {
  getTodayKey,
  markDailyReviewDone,
  recordStudyAndXp,
  updateWordProgress
} from '../utils/storage';

function dedupeByCardId(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.cardId)) return false;
    seen.add(item.cardId);
    return true;
  });
}

export default function DailyReviewScreen({ route, navigation }) {
  const { language } = route.params;
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [mistakes, setMistakes] = useState([]);

  useEffect(() => {
    init();
  }, [language]);

  async function init() {
    const allActivities = getAllActivities(language).filter((a) => a.type !== 'intro_card');
    const due = await getDueReviewItems(allActivities);
    const weak = await getWeakItems(allActivities);

    const merged = dedupeByCardId([
      ...due.map((x) => ({ ...x, isReview: true })),
      ...weak.map((x) => ({ ...x, isReview: true }))
    ]).slice(0, 15);

    setQueue(
      merged.length
        ? merged
        : allActivities.slice(0, 10).map((x) => ({ ...x, isReview: true }))
    );
  }

  if (!queue.length) return null;

  const current = queue[index];

  async function handleCorrect() {
    await updateCardReview(current.cardId, 5);
    if (current.rowId) {
      await updateWordProgress(language, current.rowId, true);
    }

    const nextXp = xp + 8;
    setXp(nextXp);

    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
      return;
    }

    await markDailyReviewDone(getTodayKey());
    const profile = await recordStudyAndXp(nextXp);

    navigation.replace('LessonComplete', {
      lessonTitle: 'Daily Review',
      xpEarned: nextXp,
      mistakesCount: mistakes.length,
      streak: profile.streak,
      scoreEarned: null,
      scorePossible: null
    });
  }

  async function handleWrong(userAnswer) {
    await updateCardReview(current.cardId, 2);
    if (current.rowId) {
      await updateWordProgress(language, current.rowId, false);
    }

    setMistakes((prev) => [...prev, { ...current, userAnswer }]);

    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
    } else {
      await handleCorrect();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
      <ProgressHeader
      current={index + 1}
      total={queue.length}
      xp={xp}
      title="Daily Review"
      modeLabel="Across all units"
      language={language}
      />

        <Text style={styles.sub}>Due cards, weak words, and review practice.</Text>

        <ActivityRenderer
          key={current.cardId}
          activity={current}
          language={language}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  inner: { flex: 1, paddingHorizontal: 18, paddingBottom: 18 },
  sub: { marginBottom: 14, color: '#475569', fontWeight: '700' }
});
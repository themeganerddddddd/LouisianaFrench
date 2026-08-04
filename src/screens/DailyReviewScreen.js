import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActivityRenderer from '../components/ActivityRenderer';
import ProgressHeader from '../components/ProgressHeader';
import SafeScreenView from '../components/SafeScreenView';
import { updateCardReview } from '../utils/spacedRepetition';
import { getDailyReviewQueue } from '../utils/reviewQueue';
import {
  getTodayKey,
  markLanguageDailyReviewDone,
  recordStudyAndXp,
  upsertPendingMistake,
  updateWordProgress
} from '../utils/storage';

export default function DailyReviewScreen({ route, navigation }) {
  const { language } = route.params;
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setQueue(await getDailyReviewQueue(language));
      setLoading(false);
    }

    init();
  }, [language]);

  if (loading) return null;

  if (!queue.length) {
    return (
      <SafeScreenView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Daily Review</Text>
          <Text style={styles.emptyMessage}>No review cards are due right now.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.emptyButton}
            onPress={() => navigation.replace('Home', { language })}
          >
            <Text style={styles.emptyButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeScreenView>
    );
  }

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

    await markLanguageDailyReviewDone(language, getTodayKey());
    const profile = await recordStudyAndXp(nextXp);

    navigation.replace('LessonComplete', {
      lessonTitle: 'Daily Review',
      xpEarned: nextXp,
      mistakesCount: mistakes.length,
      streak: profile.streak,
      scoreEarned: null,
      scorePossible: null,
      language
    });
  }

  async function handleWrong(userAnswer) {
    await updateCardReview(current.cardId, 2);
    if (current.rowId) {
      await updateWordProgress(language, current.rowId, false);
    }

    await upsertPendingMistake(language, current.cardId, {
      answer: userAnswer,
      source: 'dailyReview',
      sourceId: null
    });

    const nextMistakes = [...mistakes, { ...current, userAnswer }];
    setMistakes(nextMistakes);

    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
    } else {
      await markLanguageDailyReviewDone(language, getTodayKey());
      const profile = await recordStudyAndXp(xp);

      navigation.replace('LessonComplete', {
        lessonTitle: 'Daily Review',
        xpEarned: xp,
        mistakesCount: nextMistakes.length,
        streak: profile.streak,
        scoreEarned: null,
        scorePossible: null,
        language
      });
    }
  }

  return (
    <SafeScreenView style={styles.container}>
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
    </SafeScreenView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  inner: { flex: 1, paddingHorizontal: 18, paddingBottom: 18 },
  sub: { marginBottom: 14, color: '#475569', fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 28, fontWeight: '900', color: '#17324D' },
  emptyMessage: { marginTop: 10, color: '#475569', fontWeight: '700', textAlign: 'center' },
  emptyButton: {
    marginTop: 22,
    backgroundColor: '#2771CB',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minWidth: 180,
    alignItems: 'center'
  },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 }
});

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ActivityRenderer from '../components/ActivityRenderer';
import ProgressHeader from '../components/ProgressHeader';
import SafeScreenView from '../components/SafeScreenView';
import { getAllActivities } from '../data/lessonLoader';
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

  useEffect(() => {
    async function init() {
      const queue = await getDailyReviewQueue(language);
      if (queue.length) {
        setQueue(queue);
        return;
      }

      const fallback = getAllActivities(language)
        .filter((activity) => activity.type !== 'intro_card')
        .slice(0, 10)
        .map((activity) => ({ ...activity, isReview: true }));
      setQueue(fallback);
    }

    init();
  }, [language]);

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
  sub: { marginBottom: 14, color: '#475569', fontWeight: '700' }
});

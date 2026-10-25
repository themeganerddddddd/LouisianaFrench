import {
  useEffect,
  useState
} from 'react';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import ActivityRenderer from '../components/ActivityRenderer';
import ProgressHeader from '../components/ProgressHeader';
import SafeScreenView from '../components/SafeScreenView';

import { recordActivityOutcome } from '../utils/activityOutcome';
import { stopLessonAudio } from '../utils/audioPlayer';

import {
  getDailyReviewQueue
} from '../utils/reviewQueue';

import {
  getTodayKey,
  markLanguageDailyReviewDone,
  recordStudyAndXp
} from '../utils/storage';

export default function DailyReviewScreen({
  route,
  navigation
}) {
  const {
    language
  } = route.params;

  const [
    queue,
    setQueue
  ] = useState([]);

  const [
    index,
    setIndex
  ] = useState(0);

  const [
    xp,
    setXp
  ] = useState(0);

  const [
    mistakes,
    setMistakes
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        setQueue(
          await getDailyReviewQueue(
            language
          )
        );
      } catch {
        setQueue([]);
      }
      setLoading(false);
    }

    init();
  }, [language]);

  if (loading) {
    return null;
  }

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

  const current =
    queue[index];

  async function finishDailyReview(totalXp, nextMistakes) {
    await markLanguageDailyReviewDone(
      language,
      getTodayKey()
    );

    const profile =
      await recordStudyAndXp(
        language,
        totalXp
      );

    navigation.replace(
      'LessonComplete',
      {
        lessonTitle:
          'Daily Review',

        xpEarned:
          totalXp,

        mistakesCount:
          nextMistakes.length,

        streak:
          profile.streak,

        scoreEarned:
          null,

        scorePossible:
          null,

        language
      }
    );
  }

  async function applyOutcome(outcome, {
    nextMistakes,
    nextXp
  }) {
    setXp(nextXp);

    if (outcome.nextStep === 'advance') {
      stopLessonAudio();
      setIndex((i) => i + 1);
      return;
    }

    await finishDailyReview(nextXp, nextMistakes);
  }

  async function handleCorrect() {
    const outcome = await recordActivityOutcome({
      sessionKind: 'dailyReview',
      language,
      activity: current,
      wasCorrect: true,
      userAnswer: null,
      isLastActivity: index >= queue.length - 1,
      mistakeCount: mistakes.length
    });

    await applyOutcome(outcome, {
      nextMistakes: mistakes,
      nextXp: xp + outcome.xpDelta
    });
  }

  async function handleWrong(userAnswer) {
    const nextMistakes = [
      ...mistakes,
      {
        ...current,
        userAnswer
      }
    ];

    const outcome = await recordActivityOutcome({
      sessionKind: 'dailyReview',
      language,
      activity: current,
      wasCorrect: false,
      userAnswer,
      isLastActivity: index >= queue.length - 1,
      mistakeCount: nextMistakes.length
    });

    setMistakes(nextMistakes);

    await applyOutcome(outcome, {
      nextMistakes,
      nextXp: xp + outcome.xpDelta
    });
  }

  return (
    <SafeScreenView
      style={
        styles.container
      }
    >
      <View
        style={
          styles.inner
        }
      >
        <ProgressHeader
          current={
            index + 1
          }
          total={
            queue.length
          }
          xp={
            xp
          }
          title="Daily Review"
          modeLabel="Across all units"
          language={
            language
          }
        />

        <Text
          style={
            styles.sub
          }
        >
          Cards due now, with missed Cards first.
        </Text>

        <ActivityRenderer
          key={
            current.cardId
          }
          activity={
            current
          }
          language={
            language
          }
          onCorrect={
            handleCorrect
          }
          onWrong={
            handleWrong
          }
        />
      </View>
    </SafeScreenView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F0F9FF'
    },

    inner: {
      flex: 1,
      paddingHorizontal:
        18,
      paddingBottom:
        18
    },

    sub: {
      marginBottom:
        14,
      color:
        '#475569',
      fontWeight:
        '700'
    },

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

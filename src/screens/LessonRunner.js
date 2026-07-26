import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, View } from 'react-native';
import ActivityRenderer from '../components/ActivityRenderer';
import ProgressHeader from '../components/ProgressHeader';
import { getLessonById } from '../data/lessonLoader';
import {
  getDueReviewItems
} from '../utils/spacedRepetition';
import {
  markLessonComplete,
  recordStudyAndXp
} from '../utils/storage';
import { applyOutcome, correctAnswer, wrongAnswer } from '../learning/sessionRules';

export default function LessonRunner({ route, navigation }) {
  const { language, lessonId } = route.params;
  const lesson = useMemo(() => getLessonById(language, lessonId), [language, lessonId]);

  const [activities, setActivities] = useState([]);
  const [index, setIndex] = useState(0);
  const [lessonXp, setLessonXp] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [scoreEarned, setScoreEarned] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!lesson) {
      navigation.replace('Home', { language });
      return;
    }

    async function init() {
      const due = await getDueReviewItems(lesson.activities || []);
      const dueIds = new Set(due.map((d) => d.cardId));

      const merged = (lesson.activities || []).map((a) => ({
        ...a,
        isReview: dueIds.has(a.cardId)
      }));

      setActivities(merged);
    }

    init();
  }, [lesson, language, navigation]);

  // fadeAnim and slideAnim are useRef().current values — stable across renders
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true
      })
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  function animateToNext(cb) {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: -12,
        duration: 160,
        useNativeDriver: true
      })
    ]).start(() => {
      cb();
      slideAnim.setValue(12);
      fadeAnim.setValue(0);
    });
  }

  if (!lesson || activities.length === 0) return null;

  const current = activities[index];
  const scoredPossible =
    lesson.type === 'review'
      ? 0
      : activities.filter((a) => a.type !== 'intro_card').length;

  async function handleCorrect() {
    const outcome = correctAnswer('lesson', current.isReview);
    await applyOutcome(outcome, language, current.cardId, current.rowId);

    if (lesson.type !== 'review' && current.type !== 'intro_card') {
      setScoreEarned((v) => v + 1);
    }

    const nextXp = lessonXp + outcome.xp;
    setLessonXp(nextXp);

    if (index < activities.length - 1) {
      animateToNext(() => setIndex((i) => i + 1));
    } else if (mistakes.length > 0) {
      navigation.replace('MistakeReview', {
        language,
        lessonId,
        lessonTitle: `${lesson.unitTitle} — ${lesson.lessonTitle}`,
        mistakes,
        lessonXp: nextXp
      });
    } else {
      await finishLesson(nextXp, scoreEarned + (lesson.type !== 'review' && current.type !== 'intro_card' ? 1 : 0));
    }
  }

  async function handleWrong(userAnswer) {
    const outcome = wrongAnswer('lesson');
    await applyOutcome(outcome, language, current.cardId, current.rowId);

    const nextMistake = { ...current, userAnswer };
    setMistakes((prev) => [...prev, nextMistake]);

    if (index < activities.length - 1) {
      animateToNext(() => setIndex((i) => i + 1));
    } else {
      navigation.replace('MistakeReview', {
        language,
        lessonId,
        lessonTitle: `${lesson.unitTitle} — ${lesson.lessonTitle}`,
        mistakes: [...mistakes, nextMistake],
        lessonXp,
      });
    }
  }

  async function finishLesson(totalLessonXp, finalScoreEarned = scoreEarned) {
    const profile = await recordStudyAndXp(totalLessonXp);
    await markLessonComplete(language, lesson.id);

    navigation.replace('LessonComplete', {
      lessonTitle: `${lesson.unitTitle} — ${lesson.lessonTitle}`,
      xpEarned: totalLessonXp,
      mistakesCount: mistakes.length,
      streak: profile.streak,
      scoreEarned: lesson.type === 'review' ? null : finalScoreEarned,
      scorePossible: lesson.type === 'review' ? null : scoredPossible
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <ProgressHeader
        current={index + 1}
        total={activities.length}
        xp={lessonXp}
        title={lesson.unitTitle}
        modeLabel={lesson.lessonTitle}
        language={language}
        />

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }}
        >
          <ActivityRenderer
            key={current.cardId}
            activity={current}
            language={language}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  inner: { flex: 1, paddingHorizontal: 18, paddingBottom: 18 }
});
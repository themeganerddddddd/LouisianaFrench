import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ActivityRenderer from '../components/ActivityRenderer';
import SafeScreenView from '../components/SafeScreenView';
import { recordStudyAndXp } from '../utils/storage';

export default function MistakeReviewScreen({ route, navigation }) {
  const { language, lessonTitle, mistakes, lessonXp } = route.params;
  const [queue] = useState(mistakes || []);
  const [index, setIndex] = useState(0);

  if (!queue.length) {
    navigation.replace('LessonComplete', {
      lessonTitle,
      xpEarned: lessonXp || 0,
      mistakesCount: 0,
      streak: null,
      scoreEarned: null,
      scorePossible: null,
      language
    });
    return null;
  }

  const current = queue[index];

  async function handleCorrect() {
    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
    } else {
      const updatedProfile = await recordStudyAndXp(10);

      navigation.replace('LessonComplete', {
        lessonTitle,
        xpEarned: (lessonXp || 0) + 10,
        mistakesCount: queue.length,
        streak: updatedProfile.streak,
        scoreEarned: null,
        scorePossible: null,
        language
      });
    }
  }

  function handleWrong() {
    // keep user on this same mistake card;
    // ActivityRenderer handles the red feedback / try again state inline
  }

  return (
    <SafeScreenView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.header}>Mistake Review</Text>
        <Text style={styles.sub}>
          Let’s fix the questions you missed.
        </Text>

        <ActivityRenderer
          key={`${current.cardId}-mistake-${index}`}
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
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  inner: { flex: 1, padding: 18 },
  header: {
    fontSize: 28,
    fontWeight: '900',
    color: '#9A3412',
    marginBottom: 6
  },
  sub: {
    color: '#7C2D12',
    marginBottom: 18,
    fontWeight: '600'
  }
});

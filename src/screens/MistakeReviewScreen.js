import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ActivityRenderer from '../components/ActivityRenderer';
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
      scorePossible: null
    });
    return null;
  }

  const current = queue[index];

  const totalMistakes = queue.length;
  const currentMistakeNumber = Math.min(index + 1, totalMistakes);
  const progressPct = totalMistakes
    ? Math.round((currentMistakeNumber / totalMistakes) * 100)
    : 0;

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
        scorePossible: null
      });
    }
  }

  function handleWrong() {
    // Keep user on this same mistake card.
    // ActivityRenderer handles the red feedback and try-again state inline.
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.reviewHeader}>
          <Text style={styles.header}>Mistake Review</Text>

          <Text style={styles.sub}>
            Let’s fix the questions you missed.
          </Text>

          <Text style={styles.reviewCount}>
            {currentMistakeNumber} / {totalMistakes}
          </Text>

          <View style={styles.reviewProgressBg}>
            <View
              style={[
                styles.reviewProgressFill,
                { width: `${progressPct}%` }
              ]}
            />
          </View>
        </View>

        <ActivityRenderer
          key={`${current.cardId}-mistake-${index}`}
          activity={current}
          language={language}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
          allowSkip={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED'
  },

  inner: {
    flex: 1,
    padding: 18
  },

  reviewHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FED7AA'
  },

  header: {
    fontSize: 28,
    fontWeight: '900',
    color: '#9A3412',
    marginBottom: 6,
    textAlign: 'center'
  },

  sub: {
    color: '#7C2D12',
    marginBottom: 10,
    fontWeight: '700',
    textAlign: 'center'
  },

  reviewCount: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '900',
    color: '#9A3412',
    textAlign: 'center'
  },

  reviewProgressBg: {
    height: 10,
    backgroundColor: '#FED7AA',
    borderRadius: 999,
    marginTop: 12,
    overflow: 'hidden'
  },

  reviewProgressFill: {
    height: 10,
    backgroundColor: '#F97316',
    borderRadius: 999
  }
});
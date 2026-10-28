import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { unitPresentationStyles as shared } from './unitPresentationStyles';

export default function CurrentUnit({
  currentUnit,
  catalogComplete,
  hasLessons,
  firstDay,
  firstLesson,
  theme,
  onContinue
}) {
  if (!currentUnit) {
    if (!catalogComplete) return null;

    return (
      <View testID="home-catalog-complete" style={[shared.unitCard, styles.catalogComplete]}>
        <Text style={styles.catalogCompleteTitle}>Catalog complete</Text>
        <Text style={styles.catalogCompleteText}>
          {hasLessons
            ? 'You completed every Lesson in this Language.'
            : 'No Lessons are available for this Language yet.'}
        </Text>
      </View>
    );
  }

  const { nextLesson } = currentUnit;

  return (
    <>
      <View style={styles.currentUnitEyebrow}>
        <Feather
          testID="home-current-unit-arrow"
          name="arrow-right"
          size={14}
          color="#64748B"
        />
        <Text style={styles.currentUnitEyebrowText}>
          {firstDay ? 'START HERE' : 'WHERE YOU LEFT OFF'}
        </Text>
      </View>
      <View testID="home-current-unit" style={shared.unitCard}>
        <LinearGradient
          testID="home-current-unit-header"
          colors={theme.headerGrad}
          style={shared.unitHeader}
        >
          <View style={shared.unitNumberPill}>
            <Text style={[shared.unitNumberText, { color: theme.accent }]}>
              {currentUnit.unitLabel}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[shared.unitTitle, styles.currentUnitTitle]}>{currentUnit.title}</Text>
            <Text style={[shared.unitMeta, styles.currentUnitMeta]}>
              {currentUnit.masteredWords} / {currentUnit.totalWords} words ·{' '}
              {currentUnit.completedLessons} / {currentUnit.totalLessons} lessons
            </Text>
          </View>
        </LinearGradient>
        <View style={shared.progressBarBg}>
          <View
            testID="home-current-unit-progress"
            style={[
              shared.progressBarFill,
              {
                width: `${currentUnit.masteryPercent}%`,
                backgroundColor: theme.progressFill
              }
            ]}
          />
        </View>
        <View style={shared.lessonRow}>
          <View style={{ flex: 1 }}>
            <Text style={[shared.lessonTitle, styles.currentLessonTitle]}>{nextLesson.title}</Text>
            <Text style={shared.lessonDesc}>
              {firstLesson
                ? `New lesson · ${nextLesson.wordCount} words`
                : `Next up · ${nextLesson.wordCount} words · ${nextLesson.typeLabel}`}
            </Text>
          </View>
          <Pressable
            testID="home-current-unit-continue"
            accessibilityRole="button"
            accessibilityLabel={`${firstLesson ? 'Start' : 'Continue'} ${nextLesson.title}`}
            hitSlop={6}
            onPress={onContinue}
            style={[shared.badge, styles.currentUnitContinue, { backgroundColor: theme.accent }]}
          >
            <Text style={[shared.badgeText, styles.currentUnitContinueText]}>
              {firstLesson ? 'Start' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  currentUnitEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 2,
    marginTop: 2,
    marginBottom: 8
  },

  currentUnitEyebrowText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.48,
    marginLeft: 6
  },

  currentUnitTitle: {
    fontSize: 17
  },

  currentUnitMeta: {
    fontSize: 12.5
  },

  currentLessonTitle: {
    fontSize: 15
  },

  currentUnitContinue: {
    paddingHorizontal: 14
  },

  currentUnitContinueText: {
    fontSize: 13
  },

  catalogComplete: {
    padding: 18
  },

  catalogCompleteTitle: {
    color: '#102A43',
    fontSize: 17,
    fontWeight: '800'
  },

  catalogCompleteText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4
  }
});

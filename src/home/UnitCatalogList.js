import { LinearGradient } from 'expo-linear-gradient';
import { Text, TouchableOpacity, View } from 'react-native';
import { unitPresentationStyles as styles } from './unitPresentationStyles';

function getLessonButtonText(done, locked = false) {
  if (done) return 'Done';
  if (locked) return 'Locked';
  return 'Start';
}

function getUnitNumber(unitCode) {
  const match = String(unitCode || '').match(/u(\d+)/i);

  if (!match) return 'Unit';

  return `Unit ${Number(match[1])}`;
}

export default function UnitCatalogList({
  units,
  expandedUnit,
  theme,
  onToggleUnit,
  onOpenLesson
}) {
  return units.map((unitObj) => {
    return (
      <View key={unitObj.unitCode} style={styles.unitCard}>
        <TouchableOpacity
          testID={`unit-toggle-${unitObj.unitCode}`}
          onPress={() => onToggleUnit(unitObj.unitCode)}
          accessibilityRole="button"
          accessibilityLabel={`Toggle ${unitObj.title}`}
          accessibilityState={{ expanded: expandedUnit === unitObj.unitCode }}
        >
          <LinearGradient colors={theme.headerGrad} style={styles.unitHeader}>
            <View style={styles.unitNumberPill}>
              <Text style={[styles.unitNumberText, { color: theme.accent }]}>
                {getUnitNumber(unitObj.unitCode)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.unitTitle}>{unitObj.title}</Text>

              <Text style={styles.unitMeta}>
                {unitObj.masteredWords} / {unitObj.totalWords} words mastered ·{' '}
                {unitObj.completedLessons} / {unitObj.totalLessons} lessons done
              </Text>
            </View>

            <View style={styles.unitToggleIcon}>
              <Text style={styles.unitToggleIconText}>
                {expandedUnit === unitObj.unitCode ? '-' : '+'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${unitObj.masteryPercent}%`,
                backgroundColor: theme.progressFill
              }
            ]}
          />
        </View>

        {expandedUnit === unitObj.unitCode
          ? unitObj.lessons.map((lesson) => {
              const done = lesson.complete;
              const buttonText = getLessonButtonText(done);

              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonRow,
                    done && {
                      backgroundColor: theme.doneSoft,
                      borderTopColor: theme.doneSoft
                    }
                  ]}
                  onPress={() => onOpenLesson(lesson.id)}
                  accessibilityRole="button"
                  accessibilityLabel={lesson.title}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.lessonTitle,
                        done && styles.lessonTitleDone
                      ]}
                    >
                      {lesson.title}
                    </Text>

                    <Text
                      style={[
                        styles.lessonDesc,
                        done && styles.lessonDescDone
                      ]}
                    >
                      {lesson.wordCount} words · {lesson.typeLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      done
                        ? styles.badgeDone
                        : { backgroundColor: theme.start }
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        done && styles.badgeTextDone
                      ]}
                    >
                      {buttonText}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          : null}
      </View>
    );
  });
}

import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { getUnits } from '../data/lessonLoader';
import { formatActivityNavLabel } from '../utils/debugCatalogUnlock';

function getUnitNumber(unitCode) {
  const match = String(unitCode || '').match(/u(\d+)/i);
  return match ? `Unit ${Number(match[1])}` : 'Unit';
}

export default function DebugCatalogModal({
  visible,
  language,
  accentColor,
  onClose,
  onJump
}) {
  const units = getUnits(language);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [expandedLesson, setExpandedLesson] = useState(null);

  function closeModal() {
    setExpandedUnit(null);
    setExpandedLesson(null);
    onClose();
  }

  function toggleUnit(unitCode) {
    setExpandedUnit((current) => (current === unitCode ? null : unitCode));
    setExpandedLesson(null);
  }

  function toggleLesson(lessonId) {
    setExpandedLesson((current) => (current === lessonId ? null : lessonId));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet} testID="debug-catalog-modal">
          <View style={styles.header}>
            <Text style={styles.title}>Catalog navigator</Text>
            <Pressable
              onPress={closeModal}
              accessibilityRole="button"
              accessibilityLabel="Close catalog navigator"
              testID="debug-catalog-close"
            >
              <Text style={[styles.closeText, { color: accentColor }]}>Close</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Jump to any Activity for troubleshooting. Learner locks are bypassed.
          </Text>

          <ScrollView style={styles.scroll} testID="debug-catalog-scroll">
            {units.map((unitObj) => {
              const unitExpanded = expandedUnit === unitObj.unit;

              return (
                <View key={unitObj.unit} style={styles.unitBlock}>
                  <Pressable
                    onPress={() => toggleUnit(unitObj.unit)}
                    style={({ pressed }) => [
                      styles.unitHeader,
                      { borderColor: accentColor },
                      pressed && styles.pressed
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: unitExpanded }}
                    testID={`debug-catalog-unit-${unitObj.unit}`}
                  >
                    <Text style={[styles.unitCode, { color: accentColor }]}>
                      {getUnitNumber(unitObj.unit)}
                    </Text>
                    <Text style={styles.unitTitle}>{unitObj.unitTitle}</Text>
                    <Text style={styles.toggle}>{unitExpanded ? '−' : '+'}</Text>
                  </Pressable>

                  {unitExpanded
                    ? unitObj.lessons.map((lesson) => {
                        const lessonExpanded = expandedLesson === lesson.id;
                        const activities = lesson.activities || [];

                        return (
                          <View key={lesson.id} style={styles.lessonBlock}>
                            <Pressable
                              onPress={() => toggleLesson(lesson.id)}
                              style={({ pressed }) => [
                                styles.lessonHeader,
                                pressed && styles.pressed
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ expanded: lessonExpanded }}
                              testID={`debug-catalog-lesson-${lesson.id}`}
                            >
                              <View style={styles.lessonText}>
                                <Text style={styles.lessonTitle}>
                                  {lesson.lessonTitle || lesson.title || 'Lesson'}
                                </Text>
                                <Text style={styles.lessonMeta}>
                                  {activities.length} activities · {lesson.type || 'core'}
                                </Text>
                              </View>
                              <Text style={styles.toggle}>{lessonExpanded ? '−' : '+'}</Text>
                            </Pressable>

                            {lessonExpanded
                              ? activities.map((activity, index) => (
                                  <Pressable
                                    key={activity.cardId || `${lesson.id}:${index}`}
                                    onPress={() =>
                                      onJump({
                                        lessonId: lesson.id,
                                        startActivityIndex: index,
                                        activity
                                      })
                                    }
                                    style={({ pressed }) => [
                                      styles.activityRow,
                                      pressed && styles.pressed
                                    ]}
                                    accessibilityRole="button"
                                    testID={`debug-catalog-activity-${activity.cardId || index}`}
                                  >
                                    <Text style={styles.activityLabel}>
                                      {formatActivityNavLabel(activity, index)}
                                    </Text>
                                  </Pressable>
                                ))
                              : null}
                          </View>
                        );
                      })
                    : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 67, 0.55)',
    justifyContent: 'center',
    padding: 16
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#102A43'
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600'
  },
  subtitle: {
    fontSize: 14,
    color: '#486581',
    marginBottom: 12
  },
  scroll: {
    flexGrow: 0
  },
  unitBlock: {
    marginBottom: 10
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F0F4F8'
  },
  unitCode: {
    fontSize: 12,
    fontWeight: '700'
  },
  unitTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#102A43'
  },
  toggle: {
    fontSize: 22,
    lineHeight: 24,
    color: '#486581'
  },
  lessonBlock: {
    marginTop: 6,
    marginLeft: 10
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#EEF2F7'
  },
  lessonText: {
    flex: 1
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#243B53'
  },
  lessonMeta: {
    fontSize: 12,
    color: '#627D98',
    marginTop: 2
  },
  activityRow: {
    marginTop: 4,
    marginLeft: 12,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#D9E2EC'
  },
  activityLabel: {
    fontSize: 13,
    color: '#334E68'
  },
  pressed: {
    opacity: 0.75
  }
});

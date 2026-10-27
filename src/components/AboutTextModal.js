import { useEffect } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function headingColor(heading) {
  if (heading === 'Louisiana French') return '#2771CB';
  if (heading === 'Kouri-Vini') return '#08834C';
  return '#64748B';
}

export default function AboutTextModal({
  visible,
  content,
  accentColor,
  reduceMotion,
  onClose
}) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && content?.title) {
      AccessibilityInfo.announceForAccessibility?.(content.title);
    }
  }, [content, visible]);

  if (!content) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View
        testID="about-text-modal-backdrop"
        style={[
          styles.overlay,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }
        ]}
      >
        <Pressable
          testID="about-text-backdrop-dismiss"
          accessibilityLabel="Dismiss modal"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          testID="about-text-modal"
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={[styles.header, { backgroundColor: accentColor }]}>
            <Pressable
              testID="about-text-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>{content.title}</Text>
          </View>
          <ScrollView
            testID="about-text-scroll"
            accessibilityLabel={`${content.title} content`}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {content.sections
              ? content.sections.map((section) => (
                <View key={section.heading} style={styles.section}>
                  <Text
                    accessibilityRole="header"
                    style={[styles.sectionHeading, { color: headingColor(section.heading) }]}
                  >
                    {section.heading}
                  </Text>
                  {section.names?.map((name) => (
                    <Text key={name} style={styles.name}>{name}</Text>
                  ))}
                  {section.paragraphs?.map((paragraph) => (
                    <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
                  ))}
                </View>
              ))
              : content.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,42,67,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16
  },
  title: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26
  },
  closeText: {
    alignSelf: 'flex-end',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  scroll: {
    flexShrink: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 28
  },
  section: {
    marginBottom: 20
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  name: {
    color: '#102A43',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 2
  },
  paragraph: {
    color: '#486581',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 16
  }
});

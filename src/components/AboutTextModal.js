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
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{content.title}</Text>
            <Pressable
              testID="about-text-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: accentColor }]}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
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
                  <Text accessibilityRole="header" style={styles.sectionHeading}>
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
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  header: {
    minHeight: 64,
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  title: {
    flex: 1,
    color: '#102A43',
    fontSize: 20,
    fontWeight: '900'
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700'
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
    color: '#102A43',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8
  },
  name: {
    color: '#486581',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4
  },
  paragraph: {
    color: '#486581',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 16
  }
});

import { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
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

export default function PersonCarouselModal({
  visible,
  people,
  accentColor,
  reduceMotion,
  onClose
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    AccessibilityInfo.announceForAccessibility?.('The team');
  }, [visible]);

  function updatePage(event) {
    const offset = event.nativeEvent.contentOffset?.x || 0;
    const width = pageWidth || event.nativeEvent.layoutMeasurement?.width;
    if (!width) return;
    const index = Math.round(offset / width);
    setActiveIndex(Math.max(0, Math.min(index, people.length - 1)));
  }

  function handleCarouselLayout(event) {
    const width = event.nativeEvent.layout?.width || 0;
    if (width && width !== pageWidth) setPageWidth(width);
  }

  function moveToPage(index) {
    if (index < 0 || index >= people.length) return;
    setActiveIndex(index);
    if (!pageWidth) return;
    scrollRef.current?.scrollTo?.({
      x: pageWidth * index,
      y: 0,
      animated: !reduceMotion
    });
  }

  if (!people?.length) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }
        ]}
      >
        <Pressable
          testID="about-team-backdrop-dismiss"
          accessibilityLabel="Dismiss modal"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View testID="about-team-modal" accessibilityViewIsModal style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text accessibilityRole="header" style={styles.title}>The team</Text>
              <Text style={styles.subtitle}>Core team and voice contributors</Text>
            </View>
            <Pressable
              testID="about-team-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.carouselFrame}>
            <ScrollView
              ref={scrollRef}
              testID="about-team-carousel"
              horizontal
              pagingEnabled
              snapToInterval={pageWidth || undefined}
              snapToAlignment="center"
              decelerationRate="fast"
              disableIntervalMomentum
              style={styles.carousel}
              showsHorizontalScrollIndicator={false}
              onLayout={handleCarouselLayout}
              onScroll={updatePage}
              onScrollEndDrag={updatePage}
              onMomentumScrollEnd={updatePage}
              scrollEventThrottle={16}
              contentContainerStyle={styles.carouselContent}
            >
              {people.map((person) => (
                <View
                  key={person.id}
                  testID={`about-team-card-${person.id}`}
                  style={[styles.personCard, pageWidth ? { width: pageWidth } : null]}
                >
                  <View
                    testID={`about-team-portrait-${person.id}`}
                    accessibilityRole="image"
                    accessibilityLabel={`${person.name} placeholder portrait`}
                    style={[styles.portrait, { backgroundColor: person.color }]}
                  >
                    <Text style={styles.initials}>{person.initials}</Text>
                  </View>
                  <Text style={styles.personName}>{person.name}</Text>
                  {person.role ? (
                    <Text style={[styles.personRole, { color: accentColor }]}>{person.role}</Text>
                  ) : null}
                  <Text style={styles.detailLabel}>Bio</Text>
                  <Text style={styles.personCopy}>{person.bio}</Text>
                  <Text style={[styles.detailLabel, styles.contributionLabel]}>Contribution</Text>
                  <Text style={styles.personCopy}>{person.contribution}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable
              testID="about-team-previous"
              accessibilityRole="button"
              accessibilityLabel="Previous person"
              accessibilityState={{ disabled: activeIndex === 0 }}
              disabled={activeIndex === 0}
              onPress={() => moveToPage(activeIndex - 1)}
              style={[styles.navButton, styles.previousButton, activeIndex === 0 && styles.disabledButton]}
            >
              <Feather
                testID="about-team-previous-icon"
                name="chevron-left"
                size={28}
                color={accentColor}
              />
            </Pressable>
            <Pressable
              testID="about-team-next"
              accessibilityRole="button"
              accessibilityLabel="Next person"
              accessibilityState={{ disabled: activeIndex === people.length - 1 }}
              disabled={activeIndex === people.length - 1}
              onPress={() => moveToPage(activeIndex + 1)}
              style={[styles.navButton, styles.nextButton, activeIndex === people.length - 1 && styles.disabledButton]}
            >
              <Feather
                testID="about-team-next-icon"
                name="chevron-right"
                size={28}
                color={accentColor}
              />
            </Pressable>
          </View>
          <Text
            testID="about-team-page-indicator"
            accessibilityLabel={`Team page ${activeIndex + 1} of ${people.length}`}
            style={styles.pageIndicator}
          >
            {activeIndex + 1} / {people.length}
          </Text>
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
    height: '88%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  header: {
    minHeight: 76,
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  title: {
    color: '#102A43',
    fontSize: 20,
    fontWeight: '900'
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: {
    color: '#64748B',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700'
  },
  carouselFrame: {
    flex: 1,
    minHeight: 0,
    position: 'relative'
  },
  carousel: {
    flex: 1
  },
  carouselContent: {
    alignItems: 'flex-start'
  },
  personCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 52
  },
  portrait: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: '#E2E8F0'
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900'
  },
  personName: {
    color: '#102A43',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 20
  },
  personRole: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6
  },
  personCopy: {
    color: '#486581',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4
  },
  detailLabel: {
    color: '#102A43',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 14
  },
  contributionLabel: {
    marginTop: 16
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    marginTop: -24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  previousButton: {
    left: 8
  },
  nextButton: {
    right: 8
  },
  disabledButton: {
    opacity: 0.35
  },
  pageIndicator: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingBottom: 16
  }
});

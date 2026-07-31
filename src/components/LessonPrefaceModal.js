import { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import TBoySpeechBubble from './TBoySpeechBubble';

const tBoyImage = require('../../assets/images/mainscreen.png');

export default function LessonPrefaceModal({
  preface,
  visible,
  mode,
  onContinue,
  onClose,
  accentColor
}) {
  const [showingDetails, setShowingDetails] = useState(false);

  const isStart = mode === 'start';

  function handleClose() {
    setShowingDetails(false);
    onClose();
  }

  function handleLearnMore() {
    setShowingDetails(true);
  }

  function handleBackToSummary() {
    setShowingDetails(false);
  }

  if (!preface) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {!showingDetails ? (
          /* ---- Summary view (centered) ---- */
          <ScrollView
            style={styles.summaryScroll}
            contentContainerStyle={styles.summaryScrollContent}
            showsVerticalScrollIndicator
            testID="preface-summary-scroll"
          >
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
              {/* Close button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close preface"
              >
                <Text style={styles.closeButtonText}>X</Text>
              </TouchableOpacity>

              <Text style={[styles.kicker, { color: accentColor }]}>A note before you begin</Text>

              <View style={styles.tBoyPrefaceRow}>
                <View style={styles.tBoyArtPocket}>
                  <Image
                    source={tBoyImage}
                    style={styles.tBoyImage}
                    resizeMode="contain"
                    testID="preface-tboy-image"
                    accessibilityRole="image"
                    accessibilityLabel="T-Boy"
                  />
                </View>
                <TBoySpeechBubble
                  heading={preface.title}
                  body={preface.summary}
                  accentColor={accentColor}
                  layout="row"
                  tailPosition="left"
                  testID="preface-tboy-bubble"
                />
              </View>

              {preface.terms && preface.terms.length > 0 && (
                <View style={styles.chipRow}>
                  {preface.terms.map((term, index) => (
                    <View
                      key={term}
                      style={[styles.chip, { borderColor: accentColor }]}
                      testID={`term-chip-${index}`}
                    >
                      <Text style={[styles.chipText, { color: accentColor }]}>
                        {term}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Reassurance row with green background */}
              <View style={styles.reassuranceRow}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.reassuranceText}>{preface.reassurance}</Text>
              </View>

              <View style={styles.actions}>
                {preface.sections && preface.sections.length > 0 && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EAF3FF' }]}
                    onPress={handleLearnMore}
                    accessibilityRole="button"
                    accessibilityLabel="Learn more"
                  >
                    <Text style={[styles.actionText, { color: accentColor }]}>
                      Learn more
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={onContinue}
                  accessibilityRole="button"
                  accessibilityLabel={isStart ? 'Start lesson' : 'Back to lesson'}
                >
                  <Text style={[styles.actionText, styles.primaryText]}>
                    {isStart ? 'Start lesson' : 'Back to lesson'}
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* ---- Details view (left-aligned, scrollable) ---- */
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <TouchableOpacity
                onPress={handleBackToSummary}
                accessibilityRole="button"
                accessibilityLabel="Back to summary"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.backArrow, { color: accentColor }]}>
                  {'< Back'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.detailsTitle}>{preface.detailsTitle}</Text>
            </View>

            <ScrollView
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsContent}
            >
              {preface.sections &&
                preface.sections.map((section, idx) => (
                  <View key={idx} style={styles.section}>
                    <Text style={styles.sectionHeading}>{section.heading}</Text>
                    {section.paragraphs &&
                      section.paragraphs.map((para, pIdx) => (
                        <Text key={pIdx} style={styles.paragraph}>
                          {para}
                        </Text>
                      ))}
                    {section.quote && (
                      <View style={styles.quoteBlock}>
                        <Text style={styles.quoteText}>{section.quote.text}</Text>
                        <Text style={styles.quoteAttribution}>
                          {section.quote.attribution}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
            </ScrollView>

            <View style={styles.detailsActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, { backgroundColor: accentColor }]}
                onPress={onContinue}
                accessibilityRole="button"
                accessibilityLabel={isStart ? 'Start lesson' : 'Back to lesson'}
              >
                <Text style={[styles.actionText, styles.primaryText]}>
                  {isStart ? 'Start lesson' : 'Back to lesson'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  /* Summary */
  summaryScroll: {
    flex: 1,
    width: '100%'
  },
  summaryScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8
  },
  summaryContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center'
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#D5E2EF',
    padding: 20,
    alignItems: 'center'
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 12
  },
  tBoyPrefaceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    marginBottom: 18
  },
  tBoyArtPocket: {
    width: 86,
    height: 100,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  tBoyImage: {
    width: 82,
    height: 96
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#64748B'
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700'
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A'
  },
  reassuranceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534'
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44
  },
  actionText: {
    fontSize: 15,
    fontWeight: '900'
  },
  primaryText: {
    color: '#fff'
  },
  /* Details */
  detailsContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden'
  },
  detailsHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backArrow: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#17324D'
  },
  detailsScroll: {
    flex: 1
  },
  detailsContent: {
    padding: 20,
    paddingBottom: 24
  },
  section: {
    marginBottom: 22
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17324D',
    marginBottom: 8
  },
  paragraph: {
    fontSize: 15,
    fontWeight: '600',
    color: '#486581',
    lineHeight: 22,
    marginBottom: 10
  },
  quoteBlock: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#2771CB',
    padding: 14,
    borderRadius: 8,
    marginTop: 4
  },
  quoteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17324D',
    fontStyle: 'italic',
    marginBottom: 4
  },
  quoteAttribution: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  detailsActions: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  }
});

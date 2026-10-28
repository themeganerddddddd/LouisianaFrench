import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  scrollShell: {
    // Bound height in the Lesson/Daily Review flex chain so tall content
    // (e.g. New-word intro on Galaxy S24) can scroll to Continue.
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent'
  },

  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 36,
    overflow: 'visible'
  },

  bottomSpacer: {
    height: 120
  },

  cardCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC'
  },

  cardWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },

  kicker: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center'
  },

  contextBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14
  },

  contextBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },

  prompt: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
    color: '#102A43',
    textAlign: 'center',
    marginBottom: 20
  },

  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4
  },

  speakerBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },

  introWordCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18
  },

  introWord: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center'
  },

  introTranslation: {
    marginTop: 10,
    fontSize: 18,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center'
  },

  introAltList: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4
  },

  introAltListTranslation: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginTop: 10
  },

  tapToHear: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800'
  },

  tapToHearAlternative: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8
  },

  option: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10
  },

  optionLocked: {
    opacity: 0.72
  },

  optionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A43',
    textAlign: 'center'
  },

  primaryBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12
  },

  primaryBtnDisabled: {
    opacity: 0.45
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  },

  secondarySmallBtn: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 8,
    marginBottom: 8
  },

  secondarySmallBtnText: {
    fontSize: 14,
    fontWeight: '900'
  },

  input: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#102A43',
    backgroundColor: '#FFFFFF'
  },

  targetTapCard: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14
  },

  targetTapText: {
    fontSize: 16,
    fontWeight: '900'
  },

  targetTapSub: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700'
  },

  hintText: {
    textAlign: 'center',
    color: '#475569',
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8
  },

  wordBankLabel: {
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 10
  },

  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 10
  },

  wordChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },

  wordChipSelected: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },

  wordChipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A43'
  },

  selectedBox: {
    minHeight: 78,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'center'
  },

  placeholder: {
    textAlign: 'center',
    color: '#94A3B8',
    fontWeight: '800'
  },

  matchInstruction: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 14
  },

  matchGrid: {
    width: '100%'
  },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 10
  },

  matchItem: {
    flex: 1,
    minHeight: 58,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center'
  },

  matchedItem: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    opacity: 0.8
  },

  matchText: {
    textAlign: 'center',
    color: '#102A43',
    fontWeight: '800'
  },

  correctPairAnswer: {
    marginBottom: 14
  },

  correctPairLabel: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10
  },

  correctPairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },

  correctPairChip: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 8
  },

  correctPairText: {
    color: '#102A43',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center'
  },

  correctPairArrow: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '900'
  },

  tBoyWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
    overflow: 'visible'
  },

  tBoyStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative'
  },

  tBoyImage: {
    width: 106,
    height: 106,
    alignSelf: 'center',
    marginTop: 2,
    zIndex: 1,
    transform: [{ scaleX: -1 }]
  },

  tBoyAction: {
    alignItems: 'center',
    minWidth: 106,
    minHeight: 130,
    borderRadius: 40
  },

  tBoyActionPressed: {
    backgroundColor: '#EAF3FF'
  },

  tBoyArtPocket: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center'
  },

  tBoyActionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },

  tBoyActionText: {
    maxWidth: 112,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center'
  },

  altButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 16
  },

  altButton: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    maxWidth: '100%'
  },

  altButtonText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },

  answerAltWrap: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 14
  },

  answerAltBlock: {
    alignItems: 'center',
    width: '100%'
  },

  answerAltList: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    gap: 4
  },

  answerAltText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800'
  },

  alternativeListItem: {
    textAlign: 'center'
  },

  skipButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC'
  },

  skipButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900'
  },

  disabledButton: {
    opacity: 0.45
  },

  footer: {
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
    marginBottom: 22
  },

  footerGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC'
  },

  footerRed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },

  footerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102A43',
    textAlign: 'center',
    marginBottom: 8
  },

  footerSub: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12
  },

  footerButtonGreen: {
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center'
  },

  footerButtonRed: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center'
  },

  footerButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
});

export default styles;
import { StyleSheet } from 'react-native';

export const unitPresentationStyles = StyleSheet.create({
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },

  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },

  unitToggleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },

  unitToggleIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22
  },

  unitNumberPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10
  },

  unitNumberText: {
    fontSize: 12,
    fontWeight: '900'
  },

  unitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  unitMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 5,
    fontWeight: '600'
  },

  progressBarBg: {
    height: 10,
    backgroundColor: '#E2E8F0'
  },

  progressBarFill: {
    height: 10
  },

  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },

  lessonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A43'
  },

  lessonTitleDone: {
    color: '#FFFFFF'
  },

  lessonDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },

  lessonDescDone: {
    color: 'rgba(255,255,255,0.88)'
  },

  badge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12
  },

  badgeDone: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)'
  },

  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },

  badgeTextDone: {
    color: '#FFFFFF'
  }
});

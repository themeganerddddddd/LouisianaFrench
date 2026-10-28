import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function DashboardControl({
  controlId,
  iconId,
  icon,
  label,
  accessibilityLabel,
  badge,
  badgeBackgroundColor = '#FFCD00',
  badgeTestId,
  badgeTextColor,
  disabled = false,
  reduceMotion,
  onPress
}) {
  return (
    <Pressable
      testID={controlId}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dashboardControl,
        disabled && styles.controlDisabled,
        pressed && (reduceMotion ? styles.controlPressedReduced : styles.controlPressed)
      ]}
    >
      <View testID={`${controlId.replace('-control', '')}-circle`} style={styles.dashboardCircle}>
        <Feather testID={iconId} name={icon} size={21} color="#FFFFFF" />
        {badge ? (
          <View
            testID={badgeTestId}
            style={[styles.reviewBadge, { backgroundColor: badgeBackgroundColor }]}
          >
            <Text style={[styles.reviewBadgeText, { color: badgeTextColor }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.dashboardLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dashboardControl: {
    flex: 1,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    position: 'relative'
  },

  dashboardCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },

  dashboardLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6
  },

  controlDisabled: {
    opacity: 0.55
  },

  controlPressed: {
    transform: [{ scale: 0.94 }]
  },

  controlPressedReduced: {
    opacity: 0.7
  },

  reviewBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '900'
  }
});

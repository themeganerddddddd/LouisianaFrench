import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const LEAVES = [
  ['team', 'The team'],
  ['securityPrivacy', 'Security/Privacy'],
  ['faq', 'FAQ'],
  ['support', 'Support']
];

export default function HomeAboutMenu({
  visible,
  anchorTop,
  anchorLeft,
  accentColor,
  expanded,
  onToggle,
  onSelect,
  onDismiss
}) {
  if (!visible) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable
        testID="about-menu-backdrop"
        accessibilityLabel="Dismiss About menu"
        onPress={onDismiss}
        style={StyleSheet.absoluteFill}
      />
      <View
        testID="home-about-menu"
        accessibilityViewIsModal
        style={[
          styles.menu,
          { top: anchorTop, left: anchorLeft, borderColor: accentColor }
        ]}
      >
        <Pressable
          testID="about-menu-section"
          accessibilityRole="button"
          accessibilityLabel="About Us"
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={styles.sectionButton}
        >
          <Text style={styles.sectionLabel}>About Us</Text>
          <Feather
            testID="about-menu-disclosure"
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={accentColor}
          />
        </Pressable>

        {expanded ? (
          <View testID="about-menu-leaves" style={styles.leaves}>
            {LEAVES.map(([kind, label]) => (
              <Pressable
                key={kind}
                testID={`about-menu-leaf-${kind}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onSelect(kind)}
                style={styles.leafButton}
              >
                <Text style={styles.leafLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 12
  },
  menu: {
    position: 'absolute',
    width: 236,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#102A43',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  sectionButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF'
  },
  sectionLabel: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '900'
  },
  leaves: {
    paddingVertical: 4,
    backgroundColor: '#FFFFFF'
  },
  leafButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  leafLabel: {
    color: '#102A43',
    fontSize: 14,
    fontWeight: '700'
  }
});

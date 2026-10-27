import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const LEAVES = [
  ['acknowledgements', 'Acknowledgements'],
  ['privacy', 'Privacy'],
  ['faq', 'FAQ']
];

// Identity continuation branch: show Account for sign-in work. Keep false on
// release/`main` until Identity is ready to ship (see #344).
const SHOW_ACCOUNT_MENU_ENTRY = true;

export default function HomeAboutMenu({
  visible,
  anchorTop,
  anchorLeft,
  accentColor,
  expanded,
  accountDetail,
  onAccount,
  onToggle,
  onSelect,
  onDismiss
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
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
            { top: anchorTop, left: anchorLeft }
          ]}
        >
          {SHOW_ACCOUNT_MENU_ENTRY ? (
            <Pressable
              testID="about-menu-account"
              accessibilityRole="button"
              accessibilityLabel={accountDetail ? `Account, ${accountDetail}` : 'Account'}
              onPress={onAccount}
              style={styles.sectionButton}
            >
              <View style={[styles.accountRow, { borderLeftColor: accentColor }]}>
                <Text style={styles.eyebrow}>{accountDetail ? 'Signed in' : 'Account'}</Text>
                <Text style={styles.who} numberOfLines={1}>
                  {accountDetail || 'Sign in'}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            testID="about-menu-section"
            accessibilityRole="button"
            accessibilityLabel="About Us"
            accessibilityState={{ expanded }}
            onPress={onToggle}
            style={[
              styles.sectionButton,
              SHOW_ACCOUNT_MENU_ENTRY ? styles.dividedSection : null
            ]}
          >
            <Text style={styles.sectionLabel}>About Us</Text>
            <Feather
              testID="about-menu-disclosure"
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#102A43"
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

          <Pressable
            testID="about-menu-support"
            accessibilityRole="button"
            accessibilityLabel="Support"
            onPress={() => onSelect('support')}
            style={[styles.sectionButton, styles.dividedSection]}
          >
            <Text style={styles.sectionLabel}>Support</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1
  },
  menu: {
    position: 'absolute',
    width: 236,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    overflow: 'hidden'
  },
  sectionButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF'
  },
  dividedSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  accountRow: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginLeft: -10
  },
  eyebrow: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  who: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '800'
  },
  sectionLabel: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '800'
  },
  leaves: {
    paddingVertical: 4,
    backgroundColor: '#FFFFFF'
  },
  leafButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingLeft: 28,
    paddingRight: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  leafLabel: {
    color: '#102A43',
    fontSize: 13,
    fontWeight: '600'
  }
});

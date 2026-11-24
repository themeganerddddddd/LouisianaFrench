import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const LEAVES = [
  ['acknowledgements', 'Acknowledgements'],
  ['privacy', 'Privacy'],
  ['faq', 'FAQ']
];

// English placeholders. Louisiana French and Kouri-Vini are TBD-copy.
const GUEST_PROMPT = 'Sign in or create one'; // TBD-copy
const LEARNER_NAME = 'Learner'; // TBD-copy
const INK = '#102A43';
const MIST_BORDER = '#E2E8F0';

function accountName(identity) {
  if (!identity) return null;
  const username = typeof identity.username === 'string' ? identity.username : '';
  return username.length > 0 ? username : LEARNER_NAME;
}

function avatarInitial(name) {
  return Array.from(name)[0].toUpperCase();
}

export default function HomeAboutMenu({
  visible,
  anchorTop,
  anchorLeft,
  accentColor,
  expanded,
  showAccountEntry = false,
  identity = null,
  onAccount,
  onToggle,
  onSelect,
  onDismiss
}) {
  const name = accountName(identity);
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
            { top: anchorTop, left: anchorLeft, borderColor: accentColor },
            showAccountEntry ? styles.accountCard : null
          ]}
        >
          {showAccountEntry ? (
            <Pressable
              testID="about-menu-account"
              accessibilityRole="button"
              accessibilityLabel={name ? `Account, ${name}` : GUEST_PROMPT}
              onPress={onAccount}
              style={styles.accountRow}
            >
              {name ? (
                <View
                  testID="about-menu-account-avatar"
                  style={[styles.avatar, { backgroundColor: accentColor }]}
                >
                  <Text style={styles.avatarInitial}>{avatarInitial(name)}</Text>
                </View>
              ) : (
                <Feather
                  testID="about-menu-account-icon"
                  name="user"
                  size={22}
                  color={accentColor}
                />
              )}
              <Text style={styles.accountLabel}>{name || GUEST_PROMPT}</Text>
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
              showAccountEntry ? styles.dividedSection : null
            ]}
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
    borderWidth: 2,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 24,
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
  accountCard: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: MIST_BORDER
  },
  dividedSection: {
    borderTopWidth: 1,
    borderTopColor: MIST_BORDER
  },
  accountRow: {
    minHeight: 48,
    maxWidth: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  accountLabel: {
    flex: 1,
    flexShrink: 1,
    marginLeft: 12,
    color: INK,
    fontSize: 15,
    fontWeight: '800'
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

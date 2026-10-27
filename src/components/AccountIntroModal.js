import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export default function AccountIntroModal({
  visible,
  accentColor = '#2771CB',
  subtitleColor = '#DCEBFF',
  onDismiss
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} testID="account-intro-backdrop">
        <Pressable onPress={() => {}} testID="account-intro-modal">
          <View style={styles.card}>
            <View style={[styles.band, { backgroundColor: accentColor }]}>
              <Text style={[styles.eyebrow, { color: subtitleColor }]}>Accounts</Text>
              <Text style={styles.title}>Saved progress</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.copy}>
                You can study as a guest. Learner Progress stays on this phone.
              </Text>
              <Text style={styles.copy}>
                Sign in to keep Saved Learner Progress for each language, apart from this device. Open Account in the menu. On a new phone, sign in and Restore a language that has no progress there yet.
              </Text>
              <Pressable
                onPress={onDismiss}
                testID="account-intro-dismiss"
                accessibilityRole="button"
                accessibilityLabel="Got it"
                style={[styles.button, { backgroundColor: accentColor }]}
              >
                <Text style={styles.buttonText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 67, 0.45)',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    overflow: 'hidden'
  },
  band: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  title: { marginTop: 4, color: '#FFFFFF', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  body: { padding: 18 },
  copy: { color: '#102A43', fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 12 },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 }
});

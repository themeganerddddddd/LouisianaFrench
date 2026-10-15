import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const EMPTY = { email: '', password: '', displayName: '' };

export default function SignInModal({ visible, identity, connector, onClose }) {
  const [mode, setMode] = useState('signIn');
  const [fields, setFields] = useState(EMPTY);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      setFields(EMPTY);
      setMessage('');
      setMode('signIn');
    }
  }, [visible]);

  function close() {
    setFields(EMPTY);
    setMessage('');
    onClose();
  }

  async function submit() {
    const email = fields.email.trim();
    const password = fields.password;
    let result;
    if (mode === 'create') {
      result = await connector.signUpWithPassword({
        email,
        password,
        displayName: fields.displayName.trim()
      });
    } else if (mode === 'reset') {
      result = await connector.sendPasswordReset(email);
      setMessage(result.message || 'Check your email.');
      return;
    } else {
      result = await connector.signInWithPassword({ email, password });
    }

    if (result.identity) {
      close();
      return;
    }
    setMessage(result.message || 'Sign-in failed.');
    setFields((current) => ({ ...current, password: '' }));
  }

  async function signOut() {
    await connector.signOut();
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} testID="sign-in-backdrop">
        <Pressable onPress={() => {}} testID="sign-in-modal">
          <View style={styles.card}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close sign in">
            <Text style={styles.close}>Close</Text>
          </Pressable>
          {identity ? (
            <View>
              <Text style={styles.title}>{identity.displayName}</Text>
              <Pressable onPress={signOut} testID="sign-out" accessibilityRole="button">
                <Text style={styles.primary}>Sign out</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>
                {mode === 'create' ? 'Create an identity' : mode === 'reset' ? 'Reset password' : 'Sign in'}
              </Text>
              {mode === 'create' ? (
                <TextInput
                  testID="sign-in-display-name"
                  value={fields.displayName}
                  onChangeText={(displayName) => setFields((current) => ({ ...current, displayName }))}
                  placeholder="Display name"
                  autoCapitalize="words"
                  style={styles.input}
                />
              ) : null}
              <TextInput
                testID="sign-in-email"
                value={fields.email}
                onChangeText={(email) => setFields((current) => ({ ...current, email }))}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              {mode === 'reset' ? null : (
                <TextInput
                  testID="sign-in-password"
                  value={fields.password}
                  onChangeText={(password) => setFields((current) => ({ ...current, password }))}
                  placeholder="Password"
                  secureTextEntry
                  style={styles.input}
                />
              )}
              {message ? <Text testID="sign-in-message">{message}</Text> : null}
              <Pressable onPress={submit} testID="sign-in-submit" accessibilityRole="button">
                <Text style={styles.primary}>
                  {mode === 'create' ? 'Create' : mode === 'reset' ? 'Send reset email' : 'Sign in'}
                </Text>
              </Pressable>
              <View style={styles.modes}>
                <Pressable onPress={() => setMode('signIn')} testID="sign-in-email-mode"><Text>Sign in</Text></Pressable>
                <Pressable onPress={() => setMode('create')} testID="sign-in-create-mode"><Text>Create</Text></Pressable>
                <Pressable onPress={() => setMode('reset')} testID="sign-in-reset-mode"><Text>Reset</Text></Pressable>
              </View>
            </View>
          )}
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
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center'
  },
  close: { alignSelf: 'flex-end', color: '#52677A' },
  title: { fontSize: 20, color: '#17324D', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#D5E0EA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  primary: { color: '#2771CB', fontWeight: '700', paddingVertical: 8 },
  modes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }
});

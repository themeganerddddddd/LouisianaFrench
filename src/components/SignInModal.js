import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import TBoySpeechBubble from './TBoySpeechBubble';

const EMPTY = { email: '', password: '', displayName: '' };
const CHECK_EMAIL = 'Check your email.';
const TBOY_LINES = {
  signIn:
    "Sign in with an email, Google, or Facebook. I don't store any of your personal information that I don't need to make the app work!",
  create: "A name, an email, and a password. That’s the account."
};
const tBoyImage = require('../../assets/images/mainscreen.png');

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
    } else if (mode === 'forgot') {
      result = await connector.sendPasswordReset(email);
      setMessage(result.message || CHECK_EMAIL);
      setFields((current) => ({ ...current, password: '' }));
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

  async function continueWith(provider) {
    const result = await connector.signInWithProvider(provider);
    if (result.identity) {
      close();
      return;
    }
    if (result.message) setMessage(result.message);
  }

  async function signOut() {
    await connector.signOut();
    close();
  }

  const note = mode === 'create' ? TBOY_LINES.create : TBOY_LINES.signIn;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} testID="sign-in-backdrop">
        <Pressable onPress={() => {}} testID="sign-in-modal">
          <View style={styles.card}>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close sign in"
            >
              <Text style={styles.close}>Close</Text>
            </Pressable>

            {identity ? (
              <View>
                <Text style={styles.title}>{identity.displayName}</Text>
                <Pressable onPress={signOut} testID="sign-out" accessibilityRole="button">
                  <Text style={styles.primaryFilledText}>Sign out</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <View style={styles.noteRow}>
                  <Image
                    source={tBoyImage}
                    style={styles.tBoy}
                    resizeMode="contain"
                    testID="sign-in-tboy"
                    accessibilityRole="image"
                    accessibilityLabel="T-Boy"
                  />
                  <TBoySpeechBubble
                    body={note}
                    accentColor="#2771CB"
                    layout="row"
                    tailPosition="left"
                    testID="sign-in-tboy-bubble"
                  />
                </View>

                {mode === 'forgot' ? null : (
                  <View style={styles.logoRow}>
                    <Pressable
                      onPress={() => continueWith('google')}
                      testID="sign-in-google"
                      accessibilityRole="button"
                      accessibilityLabel="Sign in with Google"
                      style={styles.logoButton}
                    >
                      <FontAwesome5 name="google" size={22} color="#DB4437" />
                    </Pressable>
                    <Pressable
                      onPress={() => continueWith('facebook')}
                      testID="sign-in-facebook"
                      accessibilityRole="button"
                      accessibilityLabel="Sign in with Facebook"
                      style={styles.logoButton}
                    >
                      <FontAwesome5 name="facebook-f" size={22} color="#1877F2" />
                    </Pressable>
                  </View>
                )}

                {mode === 'create' ? (
                  <TextInput
                    testID="sign-in-display-name"
                    value={fields.displayName}
                    onChangeText={(displayName) =>
                      setFields((current) => ({ ...current, displayName }))
                    }
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

                {mode === 'forgot' ? null : (
                  <TextInput
                    testID="sign-in-password"
                    value={fields.password}
                    onChangeText={(password) =>
                      setFields((current) => ({ ...current, password }))
                    }
                    placeholder="Password"
                    secureTextEntry
                    style={styles.input}
                  />
                )}

                {message ? <Text testID="sign-in-message">{message}</Text> : null}

                <Pressable
                  onPress={submit}
                  testID="sign-in-submit"
                  accessibilityRole="button"
                  style={styles.primaryFilled}
                >
                  <Text style={styles.primaryFilledText}>
                    {mode === 'create'
                      ? 'Create an account'
                      : mode === 'forgot'
                        ? 'Email me a link'
                        : 'Sign in'}
                  </Text>
                </Pressable>

                {mode === 'signIn' ? (
                  <View style={styles.textActions}>
                    <Pressable
                      onPress={() => {
                        setMode('create');
                        setMessage('');
                      }}
                      testID="sign-in-create-mode"
                      accessibilityRole="button"
                    >
                      <Text style={styles.textAction}>Create an account</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setMode('forgot');
                        setMessage('');
                        setFields((current) => ({ ...current, password: '' }));
                      }}
                      testID="sign-in-forgot"
                      accessibilityRole="button"
                    >
                      <Text style={styles.textAction}>Forgot password?</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setMode('signIn');
                      setMessage('');
                    }}
                    testID="sign-in-email-mode"
                    accessibilityRole="button"
                  >
                    <Text style={styles.textAction}>Sign in</Text>
                  </Pressable>
                )}
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
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8
  },
  tBoy: { width: 72, height: 72 },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12
  },
  logoButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E0EA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D5E0EA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  primaryFilled: {
    backgroundColor: '#2771CB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4
  },
  primaryFilledText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  textActions: {
    marginTop: 12,
    gap: 8
  },
  textAction: {
    color: '#2771CB',
    fontWeight: '700',
    paddingVertical: 4
  }
});

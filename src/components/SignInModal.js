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
const TBOY_LINES = {
  signIn:
    "Sign in with an email or Google. I don't store any of your personal information that I don't need to make the app work!",
  create: "A name, an email, and a password. That’s the account.",
  forgot:
    'I can email a one-time link. It opens this app so you can choose a new password.',
  inbox: 'Check that inbox. I give the same reply for every address.',
  replace: 'Choose a new password. Home stays closed until it is saved.',
  done: 'You’re in. That link is finished.',
  deleteAccount:
    'Delete this account? The Saved Learner Progress kept for it goes away. Progress already on this phone stays.'
};
const tBoyImage = require('../../assets/images/mainscreen.png');

export default function SignInModal({
  visible,
  identity,
  connector,
  recoveryActive,
  onRecoveryFinished,
  onClose,
  accentColor = '#2771CB',
  subtitleColor = '#DCEBFF'
}) {
  const [mode, setMode] = useState('signIn');
  const [fields, setFields] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = mode === 'replace';

  useEffect(() => {
    if (!visible) {
      setFields(EMPTY);
      setMessage('');
      setBusy(false);
      setMode('signIn');
    }
  }, [visible]);

  useEffect(() => {
    if (recoveryActive) {
      setMode('replace');
      setMessage('');
      setFields(EMPTY);
    }
  }, [recoveryActive]);

  function close() {
    if (locked) return;
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
      if (result.message) {
        setMessage(result.message);
        return;
      }
      setMode('inbox');
      setMessage('');
      setFields((current) => ({ ...current, password: '' }));
      return;
    } else if (mode === 'replace') {
      result = await connector.updatePassword(password);
      if (result.identity) {
        setMode('done');
        setFields(EMPTY);
        setMessage('');
        onRecoveryFinished?.();
        return;
      }
      setMessage(result.message || 'Sign-in failed.');
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
    if (busy) return;
    setBusy(true);
    await connector.signOut();
    setBusy(false);
    close();
  }

  async function removeAccount() {
    if (busy) return;
    setBusy(true);
    const result = await connector.deleteAccount();
    setBusy(false);
    if (result.identity) {
      setMessage(result.message || 'The account could not be deleted. Try again.');
      return;
    }
    close();
  }

  const note = TBOY_LINES[mode] || TBOY_LINES.signIn;
  const showSignedIn =
    identity && mode !== 'replace' && mode !== 'done' && mode !== 'deleteAccount';
  const showLogos = mode === 'signIn' || mode === 'create';
  const showEmail = showLogos || mode === 'forgot';
  const showPassword = showLogos || mode === 'replace';
  const showSubmit = mode !== 'inbox' && mode !== 'done';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={styles.backdrop}
        onPress={locked ? undefined : close}
        testID="sign-in-backdrop"
      >
        <Pressable onPress={() => {}} testID="sign-in-modal">
          <View style={styles.card}>
            {locked || showSignedIn || mode === 'deleteAccount' ? null : (
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Close sign in"
              >
                <Text style={styles.close}>Close</Text>
              </Pressable>
            )}

            {showSignedIn ? (
              <View>
                <View style={[styles.band, { backgroundColor: accentColor }]}>
                  <Pressable
                    onPress={close}
                    accessibilityRole="button"
                    accessibilityLabel="Close sign in"
                  >
                    <Text style={styles.bandClose}>Close</Text>
                  </Pressable>
                  <Text style={[styles.eyebrow, { color: subtitleColor }]}>Signed in</Text>
                  <Text style={styles.displayName}>{identity.displayName}</Text>
                  {identity.email ? (
                    <Text style={[styles.email, { color: subtitleColor }]}>{identity.email}</Text>
                  ) : null}
                </View>
                <View style={styles.bandBody}>
                  <Pressable
                    onPress={signOut}
                    testID="sign-out"
                    accessibilityRole="button"
                    accessibilityLabel="Log out"
                    style={[styles.primaryFilled, { backgroundColor: accentColor }]}
                  >
                    <Text style={styles.primaryFilledText}>Log out</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setMode('deleteAccount');
                      setMessage('');
                    }}
                    testID="delete-account"
                    accessibilityRole="button"
                    accessibilityLabel="Delete account"
                  >
                    <Text style={styles.quietAction}>Delete account</Text>
                  </Pressable>
                </View>
              </View>
            ) : mode === 'deleteAccount' ? (
              <View style={styles.formPad}>
                <Pressable
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel="Close sign in"
                >
                  <Text style={styles.close}>Close</Text>
                </Pressable>
                <View style={styles.noteRow}>
                  <Image
                    source={tBoyImage}
                    style={styles.tBoy}
                    resizeMode="contain"
                    accessibilityRole="image"
                    accessibilityLabel="T-Boy"
                  />
                  <TBoySpeechBubble
                    body={TBOY_LINES.deleteAccount}
                    accentColor={accentColor}
                    layout="row"
                    tailPosition="left"
                    testID="delete-account-note"
                  />
                </View>
                {message ? <Text testID="sign-in-message">{message}</Text> : null}
                <Pressable
                  onPress={removeAccount}
                  testID="delete-account-confirm"
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                  style={styles.dangerFilled}
                >
                  <Text style={styles.primaryFilledText}>Delete account</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMode('signIn');
                    setMessage('');
                  }}
                  testID="delete-account-cancel"
                  accessibilityRole="button"
                  accessibilityLabel="Keep account"
                >
                  <Text style={styles.quietAction}>Keep account</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formPad}>
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
                    accentColor={accentColor}
                    layout="row"
                    tailPosition="left"
                    testID="sign-in-tboy-bubble"
                  />
                </View>

                {showLogos ? (
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
                  </View>
                ) : null}

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

                {showEmail ? (
                  <TextInput
                    testID="sign-in-email"
                    value={fields.email}
                    onChangeText={(email) => setFields((current) => ({ ...current, email }))}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                ) : null}

                {showPassword ? (
                  <TextInput
                    testID="sign-in-password"
                    value={fields.password}
                    onChangeText={(password) =>
                      setFields((current) => ({ ...current, password }))
                    }
                    placeholder={mode === 'replace' ? 'New password' : 'Password'}
                    secureTextEntry
                    style={styles.input}
                  />
                ) : null}

                {message ? <Text testID="sign-in-message">{message}</Text> : null}

                {showSubmit ? (
                  <Pressable
                    onPress={submit}
                    testID="sign-in-submit"
                    accessibilityRole="button"
                    style={[styles.primaryFilled, { backgroundColor: accentColor }]}
                  >
                    <Text style={styles.primaryFilledText}>
                      {mode === 'create'
                        ? 'Create an account'
                        : mode === 'forgot'
                          ? 'Email me a link'
                          : mode === 'replace'
                            ? 'Save password'
                            : 'Sign in'}
                    </Text>
                  </Pressable>
                ) : null}

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
                      <Text style={[styles.textAction, { color: accentColor }]}>Create an account</Text>
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
                      <Text style={[styles.textAction, { color: accentColor }]}>Forgot password?</Text>
                    </Pressable>
                  </View>
                ) : null}

                {mode === 'create' || mode === 'forgot' || mode === 'inbox' ? (
                  <Pressable
                    onPress={() => {
                      setMode('signIn');
                      setMessage('');
                    }}
                    testID="sign-in-email-mode"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.textAction, { color: accentColor }]}>Sign in</Text>
                  </Pressable>
                ) : null}

                {mode === 'done' ? (
                  <Pressable
                    onPress={close}
                    testID="sign-in-done"
                    accessibilityRole="button"
                    style={[styles.primaryFilled, { backgroundColor: accentColor }]}
                  >
                    <Text style={styles.primaryFilledText}>Continue</Text>
                  </Pressable>
                ) : null}
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    overflow: 'hidden'
  },
  formPad: { padding: 18 },
  close: { alignSelf: 'flex-end', color: '#64748B', fontSize: 13, fontWeight: '600', paddingTop: 14, paddingRight: 16 },
  band: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  bandClose: { alignSelf: 'flex-end', color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  eyebrow: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  displayName: { marginTop: 4, color: '#FFFFFF', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  email: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  bandBody: { padding: 18 },
  quietAction: {
    marginTop: 12,
    textAlign: 'center',
    color: '#102A43',
    fontWeight: '700',
    fontSize: 13
  },
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
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  primaryFilled: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4
  },
  primaryFilledText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15
  },
  dangerFilled: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4
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

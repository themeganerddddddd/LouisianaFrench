import { FontAwesome5 } from '@expo/vector-icons';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { canDismiss } from '../account/accountMachine';
import { accountName } from '../identity/username';
import TBoySpeechBubble from './TBoySpeechBubble';

const FAILURE_TEXT = {
  wrongCredentials: 'That email or password is not right.',
  emailTaken: 'That email is already registered.',
  network: 'The network failed. Try again.',
  unavailable: 'Sign-in is unavailable.'
};
const TBOY_LINES = {
  signIn:
    "Sign in with an email or Google. I don't store any of your personal information that I don't need to make the app work!",
  create: "A name, an email, and a password. That’s the account.",
  forgot:
    'I can email a one-time link. It opens this app so you can choose a new password.',
  inbox: 'Check that inbox. I give the same reply for every address.',
  replace: 'Choose a new password. Home stays closed until it is saved.',
  done: 'You’re in. That link is finished.'
};
const tBoyImage = require('../../assets/images/mainscreen.png');

function screenOf(view) {
  if (view.kind === 'setNewPassword') return 'replace';
  if (view.kind === 'passwordSaved' || view.kind === 'accountDeleted') return 'done';
  if (view.kind === 'signedIn' || view.kind === 'deleteAccount') return 'signedIn';
  return view.kind;
}

function failureText(view) {
  if (!view.submit || view.submit.status !== 'failed') return '';
  return FAILURE_TEXT[view.submit.failure] || 'Sign-in failed.';
}

export default function SignInModal({ visible, view, dispatch, onClose, accentColor }) {
  const mode = screenOf(view);
  const dismiss = canDismiss(view);
  const identity = view.kind === 'signedIn' || view.kind === 'deleteAccount' ? view.identity : null;
  const email = view.email || '';
  const password = view.password || '';
  const displayName = view.username || '';
  const message = failureText(view);

  function close() {
    if (!dismiss) return;
    onClose();
  }

  function edit(field, value) {
    dispatch({ type: 'edited', field, value });
  }

  const note = TBOY_LINES[mode] || TBOY_LINES.signIn;
  const filledStyle = [styles.primaryFilled, { backgroundColor: accentColor }];
  const linkStyle = [styles.textAction, { color: accentColor }];
  const showSignedIn = identity && mode !== 'replace' && mode !== 'done';
  const showLogos = mode === 'signIn' || mode === 'create';
  const showEmail = showLogos || mode === 'forgot';
  const showPassword = showLogos || mode === 'replace';
  const showSubmit = mode !== 'inbox' && mode !== 'done';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        testID="sign-in-backdrop"
      >
        <Pressable onPress={() => {}} testID="sign-in-modal">
          <View style={styles.card}>
            {dismiss ? (
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Close sign in"
              >
                <Text style={styles.close}>Close</Text>
              </Pressable>
            ) : null}

            {showSignedIn ? (
              <View>
                <Text style={styles.title}>{accountName(identity.username)}</Text>
                <Pressable
                  onPress={() => {
                    dispatch({ type: 'signOutRequested' });
                    onClose();
                  }}
                  testID="sign-out"
                  accessibilityRole="button"
                >
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
                    accentColor={accentColor}
                    layout="row"
                    tailPosition="left"
                    testID="sign-in-tboy-bubble"
                  />
                </View>

                {showLogos ? (
                  <View style={styles.logoRow}>
                    <Pressable
                      onPress={() => dispatch({ type: 'providerChosen', provider: 'google' })}
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
                    value={displayName}
                    onChangeText={(value) => edit('username', value)}
                    placeholder="Display name"
                    autoCapitalize="words"
                    style={styles.input}
                  />
                ) : null}

                {showEmail ? (
                  <TextInput
                    testID="sign-in-email"
                    value={email}
                    onChangeText={(value) => edit('email', value)}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                ) : null}

                {showPassword ? (
                  <TextInput
                    testID="sign-in-password"
                    value={password}
                    onChangeText={(value) => edit('password', value)}
                    placeholder={mode === 'replace' ? 'New password' : 'Password'}
                    secureTextEntry
                    style={styles.input}
                  />
                ) : null}

                {message ? <Text testID="sign-in-message">{message}</Text> : null}

                {showSubmit ? (
                  <Pressable
                    onPress={() => dispatch({ type: 'submitted' })}
                    testID="sign-in-submit"
                    accessibilityRole="button"
                    style={filledStyle}
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
                      onPress={() => dispatch({ type: 'navigated', to: 'create' })}
                      testID="sign-in-create-mode"
                      accessibilityRole="button"
                    >
                      <Text style={linkStyle}>Create an account</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => dispatch({ type: 'navigated', to: 'forgot' })}
                      testID="sign-in-forgot"
                      accessibilityRole="button"
                    >
                      <Text style={linkStyle}>Forgot password?</Text>
                    </Pressable>
                  </View>
                ) : null}

                {mode === 'create' || mode === 'forgot' || mode === 'inbox' ? (
                  <Pressable
                    onPress={() => dispatch({ type: 'navigated', to: 'signIn' })}
                    testID="sign-in-email-mode"
                    accessibilityRole="button"
                  >
                    <Text style={linkStyle}>Sign in</Text>
                  </Pressable>
                ) : null}

                {mode === 'done' ? (
                  <Pressable
                    onPress={onClose}
                    testID="sign-in-done"
                    accessibilityRole="button"
                    style={filledStyle}
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
    fontWeight: '700',
    paddingVertical: 4
  }
});

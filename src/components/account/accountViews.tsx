import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { usernameSaveBlocked, type AccountEvent, type AccountView } from '../../account/accountMachine';
import { usernameFormatIssue } from '../../account/usernameFormat';
import { Field, LinkButton, PrimaryButton } from './formControls';
// English placeholders. Louisiana French and Kouri-Vini are TBD-copy.
const SIGN_IN = { // TBD-copy
  google: 'Continue with Google',
  googleFailed: 'Google sign-in did not finish. Try again.',
  email: 'Email',
  password: 'Password',
  submit: 'Sign in',
  forgot: 'Forgot password?',
  wrongPassword: 'That email or password is not right.',
  network: 'The network failed. Try again.',
  unavailable: 'Sign-in is unavailable.',
  failed: 'Sign-in failed.'
};

const FORGOT = { // TBD-copy
  email: 'Email',
  submit: 'Email me a link',
  back: 'Back to sign in',
  network: 'The network failed. Try again.',
  unavailable: 'Sign-in is unavailable.',
  failed: 'Sign-in failed.'
};

const INBOX = { // TBD-copy
  title: 'Check your inbox',
  body: 'Check that inbox. I give the same reply for every address.',
  back: 'Sign in'
};

const USERNAME = { // TBD-copy
  title: 'Choose a username',
  body: 'Pick a username so people know you on the board. You can skip and set it later.',
  label: 'Username',
  placeholder: 'your_username',
  helper: '3–20 characters. Start with a letter. Letters, numbers, and underscores.',
  checking: 'Checking…',
  length: 'Use 3 to 20 characters.',
  charset: 'Use letters, numbers, or underscores, and start with a letter.',
  taken: 'That username is taken.',
  reserved: "That username isn't available. Try another.",
  skip: 'Skip for now',
  save: 'Save username'
};

type Dispatch = (event: AccountEvent) => void;
type SignIn = Extract<AccountView, { kind: 'signIn' }>;
type Forgot = Extract<AccountView, { kind: 'forgot' }>;
type Username = Extract<AccountView, { kind: 'username' }>;

function usernameMessage(view: Username): { kind: 'error' | 'checking' | 'available' | 'helper'; text: string } {
  const issue = usernameFormatIssue(view.draft);
  if (issue === 'length') return { kind: 'error', text: USERNAME.length };
  if (issue === 'charset') return { kind: 'error', text: USERNAME.charset };
  const found = view.availability;
  if (found.status === 'checking' && found.value === view.draft) return { kind: 'checking', text: USERNAME.checking };
  if (found.status === 'settled' && found.value === view.draft) {
    if (found.reply === 'available') return { kind: 'available', text: `${view.draft} is available.` };
    if (found.reply === 'taken') return { kind: 'error', text: USERNAME.taken };
    if (found.reply === 'reserved' || found.reply === 'invalid') return { kind: 'error', text: USERNAME.reserved };
  }
  return { kind: 'helper', text: USERNAME.helper };
}

function busy(status: string): boolean {
  return status === 'submitting' || status === 'oauth';
}

function otherFailure(failure: string, copy: { network: string; unavailable: string; failed: string }): string {
  if (failure === 'network') return copy.network;
  if (failure === 'unavailable') return copy.unavailable;
  return copy.failed;
}

export function SignInView({ view, dispatch, accentColor }: { view: SignIn; dispatch: Dispatch; accentColor: string }) {
  const locked = busy(view.submit.status);
  const oauth = view.submit.status === 'oauth';
  const failure = view.submit.status === 'failed' ? view.submit.failure : '';
  return (
    <View style={styles.stack}>
      {failure === 'oauthFailed' ? <GoogleError /> : null}
      <Pressable
        accessibilityLabel={SIGN_IN.google}
        accessibilityRole="button"
        accessibilityState={{ busy: oauth, disabled: locked }}
        disabled={locked}
        onPress={() => {
          if (!locked) dispatch({ type: 'providerChosen', provider: 'google' });
        }}
        style={[styles.google, locked ? styles.locked : null]}
        testID="account-google"
      >
        {oauth ? (
          <ActivityIndicator color={accentColor} testID="account-google-spinner" />
        ) : (
          <FontAwesome5 name="google" size={18} color="#DB4437" />
        )}
        <Text style={styles.googleLabel}>{SIGN_IN.google}</Text>
      </Pressable>
      <Field
        label={SIGN_IN.email}
        value={view.email}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'email', value })}
        accentColor={accentColor}
        editable={!locked}
        autoCapitalize="none"
        keyboardType="email-address"
        error={failure && failure !== 'wrongCredentials' && failure !== 'oauthFailed' ? otherFailure(failure, SIGN_IN) : undefined}
        testID="account-email"
      />
      <Field
        label={SIGN_IN.password}
        value={view.password}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'password', value })}
        accentColor={accentColor}
        editable={!locked}
        secureTextEntry
        error={failure === 'wrongCredentials' ? SIGN_IN.wrongPassword : undefined}
        testID="account-password"
      />
      <PrimaryButton
        label={SIGN_IN.submit}
        onPress={() => dispatch({ type: 'submitted' })}
        accentColor={accentColor}
        disabled={locked}
        loading={view.submit.status === 'submitting'}
        testID="account-submit"
      />
      <LinkButton
        label={SIGN_IN.forgot}
        onPress={() => dispatch({ type: 'navigated', to: 'forgot' })}
        accentColor={accentColor}
        disabled={locked}
        testID="account-forgot"
      />
    </View>
  );
}

export function ForgotView({ view, dispatch, accentColor }: { view: Forgot; dispatch: Dispatch; accentColor: string }) {
  const locked = busy(view.submit.status);
  const failure = view.submit.status === 'failed' ? view.submit.failure : '';
  return (
    <View style={styles.stack}>
      <Field
        label={FORGOT.email}
        value={view.email}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'email', value })}
        accentColor={accentColor}
        editable={!locked}
        autoCapitalize="none"
        keyboardType="email-address"
        error={failure ? otherFailure(failure, FORGOT) : undefined}
        testID="account-email"
      />
      <PrimaryButton
        label={FORGOT.submit}
        onPress={() => dispatch({ type: 'submitted' })}
        accentColor={accentColor}
        disabled={locked}
        loading={view.submit.status === 'submitting'}
        testID="account-send"
      />
      <LinkButton
        label={FORGOT.back}
        onPress={() => dispatch({ type: 'navigated', to: 'signIn' })}
        accentColor={accentColor}
        disabled={locked}
        testID="account-forgot-back"
      />
    </View>
  );
}

function CheckingRing({ color }: { color: string }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const spin = Animated.loop(Animated.timing(turn, {
      toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true
    }));
    spin.start();
    return () => spin.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View testID="account-username-checking" style={[styles.ring, { borderColor: color, transform: [{ rotate }] }]} />;
}

function GoogleError() {
  return <View style={styles.error}>
    <Feather accessible={false} color="#B91C1C" name="alert-circle" size={16} />
    <Text accessibilityRole="alert" style={styles.errorText} testID="account-google-error">{SIGN_IN.googleFailed}</Text>
  </View>;
}

export function UsernameView({ view, dispatch, accentColor }: { view: Username; dispatch: Dispatch; accentColor: string }) {
  const locked = view.submit.status === 'submitting';
  const message = usernameMessage(view);
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{USERNAME.title}</Text>
      <Text>{USERNAME.body}</Text>
      <Field
        label={USERNAME.label}
        value={view.draft}
        placeholder={USERNAME.placeholder}
        onChangeText={(value) => dispatch({ type: 'usernameEdited', value })}
        accentColor={accentColor}
        editable={!locked}
        autoCapitalize="none"
        error={message.kind === 'error' ? message.text : undefined}
        testID="account-username"
        trailing={message.kind === 'checking' ? <CheckingRing color={accentColor} /> : undefined}
      />
      {message.kind === 'checking' ? (
        <View>
          <Text accessibilityLiveRegion="polite" style={styles.checking}>{message.text}</Text>
        </View>
      ) : null}
      {message.kind === 'available' ? (
        <View style={styles.status}>
          <Feather accessible={false} color={accentColor} name="check" size={16} />
          <Text accessibilityLiveRegion="polite" style={[styles.available, { color: accentColor }]} testID="account-username-available">{message.text}</Text>
        </View>
      ) : null}
      {message.kind === 'helper' ? <Text>{message.text}</Text> : null}
      <PrimaryButton
        label={USERNAME.save}
        onPress={() => dispatch({ type: 'usernameSaved' })}
        accentColor={accentColor}
        disabled={usernameSaveBlocked(view)}
        loading={locked}
        testID="account-username-save"
      />
      <LinkButton
        label={USERNAME.skip}
        onPress={() => dispatch({ type: 'usernameSkipped' })}
        accentColor={accentColor}
        disabled={locked}
        testID="account-username-skip"
      />
    </View>
  );
}

export function InboxView({ dispatch, accentColor }: { dispatch: Dispatch; accentColor: string }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{INBOX.title}</Text>
      <Text>{INBOX.body}</Text>
      <LinkButton
        label={INBOX.back}
        onPress={() => dispatch({ type: 'navigated', to: 'signIn' })}
        accentColor={accentColor}
        testID="account-back"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  google: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#64748B', borderRadius: 12,
    borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48
  },
  googleLabel: { color: '#102A43', fontSize: 15, fontWeight: '800' },
  locked: { opacity: 0.55 },
  error: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  checking: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  ring: {
    borderRadius: 9, borderTopColor: 'transparent', borderWidth: 2, height: 18, width: 18
  },
  available: { flexShrink: 1, fontSize: 13, fontWeight: '700' },
  errorText: { color: '#B91C1C', flexShrink: 1, fontSize: 13, fontWeight: '700' },
  title: { color: '#102A43', fontSize: 20, fontWeight: '800' }
});

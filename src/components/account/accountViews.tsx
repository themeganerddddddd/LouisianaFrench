import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AccountEvent, AccountView } from '../../account/accountMachine';
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

type Dispatch = (event: AccountEvent) => void;
type SignIn = Extract<AccountView, { kind: 'signIn' }>;
type Forgot = Extract<AccountView, { kind: 'forgot' }>;

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

function GoogleError() {
  return <View style={styles.error}>
    <Feather accessible={false} color="#B91C1C" name="alert-circle" size={16} />
    <Text accessibilityRole="alert" style={styles.errorText} testID="account-google-error">{SIGN_IN.googleFailed}</Text>
  </View>;
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
  errorText: { color: '#B91C1C', flexShrink: 1, fontSize: 13, fontWeight: '700' },
  title: { color: '#102A43', fontSize: 20, fontWeight: '800' }
});

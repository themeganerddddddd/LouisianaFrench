import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { DELETE_WORD, isDeleteArmed, usernameSaveBlocked, type AccountEvent, type AccountView, type Submit, type SubmitFailure } from '../../account/accountMachine';
import { usernameFormatIssue } from '../../account/usernameFormat';
import { DestructiveButton, Field, LinkButton, PrimaryButton, SecondaryButton } from './formControls';
// English placeholders. Louisiana French and Kouri-Vini are TBD-copy.
const GOOGLE = { // TBD-copy
  label: 'Continue with Google',
  failed: 'Google sign-in did not finish. Try again.'
};

const SIGN_IN = { // TBD-copy
  email: 'Email',
  password: 'Password',
  submit: 'Sign in',
  forgot: 'Forgot password?',
  create: 'Create account',
  wrongPassword: 'That email or password is not right.',
  network: 'The network failed. Try again.',
  unavailable: 'Sign-in is unavailable.',
  failed: 'Sign-in failed.'
};

const CREATE = { // TBD-copy
  username: 'Username',
  email: 'Email',
  password: 'Password',
  passwordHint: 'At least 8 characters.',
  emailTaken: 'That email is already registered.',
  submit: 'Create account',
  back: 'Sign in',
  network: 'The network failed. Try again.',
  unavailable: 'Sign-in is unavailable.',
  failed: 'Sign-up failed.'
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
  passwordReset: { title: 'Check your inbox', body: 'Check that inbox. I give the same reply for every address.' },
  confirmSignUp: { title: 'Confirm your email', body: 'Open the link in your email to finish creating your account.' },
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
  save: 'Save username',
  change: {
    title: 'Change username',
    body: 'You can fix a typo for 24 hours after you first set your username. After that, you can change it once every 30 days.',
    skip: 'Cancel'
  },
  tooSoon: (date: string) => `You can change your username again on ${date}.`
};

const NEW_PASSWORD = { // TBD-copy
  title: 'Set a new password',
  label: 'New password',
  hint: 'At least 8 characters.',
  submit: 'Save password',
  network: 'The network failed. Try again.',
  unavailable: 'Sign-in is unavailable.',
  failed: 'Could not save the password.'
};

const SAVED = { // TBD-copy
  title: 'Password saved',
  body: 'Your password is updated and you are signed in.',
  next: 'Continue'
};

const SIGNED_IN = { // TBD-copy
  guest: 'Learner',
  email: 'Signed in with Email',
  google: 'Signed in with Google',
  note: 'Your progress stays on this device.',
  signOut: 'Sign out',
  setUsername: 'Set a username',
  changeUsername: 'Change username',
  delete: 'Delete account'
};

const DELETE = { // TBD-copy
  title: 'Delete your account?',
  goes: 'This deletes your login: your email and username.',
  stays: 'Your lessons and progress stay on this phone.',
  label: 'Type DELETE to confirm',
  confirm: 'Delete account',
  deleting: 'Deleting account…',
  keep: 'Keep my account',
  network: 'The network failed. Try again.',
  unknown: 'Could not delete the account. Try again.',
  doneTitle: 'Account deleted',
  done: "You're learning as a guest now.",
  back: 'Back to lessons'
};

type Dispatch = (event: AccountEvent) => void;
type SignIn = Extract<AccountView, { kind: 'signIn' }>;
type Create = Extract<AccountView, { kind: 'create' }>;
type Inbox = Extract<AccountView, { kind: 'inbox' }>;
type Forgot = Extract<AccountView, { kind: 'forgot' }>;
type Username = Extract<AccountView, { kind: 'username' }>;
type NewPassword = Extract<AccountView, { kind: 'setNewPassword' }>;
type Saved = Extract<AccountView, { kind: 'passwordSaved' }>;
type SignedIn = Extract<AccountView, { kind: 'signedIn' }>;
type DeleteAccount = Extract<AccountView, { kind: 'deleteAccount' }>;

function formatError(draft: string): string | undefined {
  const issue = usernameFormatIssue(draft);
  return issue ? USERNAME[issue] : undefined;
}

function usernameMessage(view: Username): { kind: 'error' | 'checking' | 'available' | 'helper'; text: string } {
  const invalid = formatError(view.draft);
  if (invalid) return { kind: 'error', text: invalid };
  if (view.submit.status === 'failed' && view.submit.failure === 'too_soon' && view.submit.retryAt) {
    const date = new Date(view.submit.retryAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    return { kind: 'error', text: USERNAME.tooSoon(date) };
  }
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

type Site = 'google' | 'username' | 'email' | 'password';
const SITE: Record<SubmitFailure, Site> = {
  oauthFailed: 'google', invalidUsername: 'username', weakPassword: 'password', wrongCredentials: 'password',
  emailTaken: 'email', emailNotConfirmed: 'email', rateLimited: 'email', network: 'email', unavailable: 'email', unknown: 'email'
};

function failedAt(submit: Submit, site: Site): boolean {
  return submit.status === 'failed' && SITE[submit.failure] === site;
}

function errorAt(submit: Submit, site: Site, text: (failure: SubmitFailure) => string | undefined): string | undefined {
  return submit.status === 'failed' && failedAt(submit, site) ? text(submit.failure) : undefined;
}

function otherFailure(failure: string, copy: { network: string; unavailable: string; failed: string }): string {
  if (failure === 'network') return copy.network;
  if (failure === 'unavailable') return copy.unavailable;
  return copy.failed;
}

export function SignInView({ view, dispatch, accentColor }: { view: SignIn; dispatch: Dispatch; accentColor: string }) {
  const locked = busy(view.submit.status);
  const oauth = view.submit.status === 'oauth';
  return (
    <View style={styles.stack}>
      {failedAt(view.submit, 'google') ? <GoogleError /> : null}
      <GoogleButton locked={locked} oauth={oauth} dispatch={dispatch} accentColor={accentColor} />
      <Field
        label={SIGN_IN.email}
        value={view.email}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'email', value })}
        accentColor={accentColor}
        editable={!locked}
        autoCapitalize="none"
        keyboardType="email-address"
        error={errorAt(view.submit, 'email', (failure) => otherFailure(failure, SIGN_IN))}
        testID="account-email"
      />
      <Field
        label={SIGN_IN.password}
        value={view.password}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'password', value })}
        accentColor={accentColor}
        editable={!locked}
        secureTextEntry
        error={errorAt(view.submit, 'password', () => SIGN_IN.wrongPassword)}
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
      <LinkButton
        label={SIGN_IN.create}
        onPress={() => dispatch({ type: 'navigated', to: 'create' })}
        accentColor={accentColor}
        disabled={locked}
        testID="account-create"
      />
    </View>
  );
}

export function CreateView({ view, dispatch, accentColor }: { view: Create; dispatch: Dispatch; accentColor: string }) {
  const locked = busy(view.submit.status);
  const weak = errorAt(view.submit, 'password', (failure) => failure === 'weakPassword' ? CREATE.passwordHint : undefined);
  return (
    <View style={styles.stack}>
      {failedAt(view.submit, 'google') ? <GoogleError /> : null}
      <GoogleButton locked={locked} oauth={view.submit.status === 'oauth'} dispatch={dispatch} accentColor={accentColor} />
      <Field
        label={CREATE.username}
        value={view.username}
        placeholder={USERNAME.placeholder}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'username', value })}
        accentColor={accentColor}
        editable={!locked}
        autoCapitalize="none"
        error={errorAt(view.submit, 'username', () => formatError(view.username))}
        testID="account-username"
      />
      <Field
        label={CREATE.email}
        value={view.email}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'email', value })}
        accentColor={accentColor}
        editable={!locked}
        autoCapitalize="none"
        keyboardType="email-address"
        error={errorAt(view.submit, 'email', (failure) => failure === 'emailTaken' ? CREATE.emailTaken : otherFailure(failure, CREATE))}
        testID="account-email"
      />
      <Field
        label={CREATE.password}
        value={view.password}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'password', value })}
        accentColor={accentColor}
        editable={!locked}
        secureTextEntry
        error={weak}
        testID="account-password"
      />
      {weak ? null : <Text>{CREATE.passwordHint}</Text>}
      <PrimaryButton
        label={CREATE.submit}
        onPress={() => dispatch({ type: 'submitted' })}
        accentColor={accentColor}
        disabled={locked}
        loading={view.submit.status === 'submitting'}
        testID="account-submit"
      />
      <LinkButton
        label={CREATE.back}
        onPress={() => dispatch({ type: 'navigated', to: 'signIn' })}
        accentColor={accentColor}
        disabled={locked}
        testID="account-create-back"
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

function GoogleButton({ locked, oauth, dispatch, accentColor }: {
  locked: boolean; oauth: boolean; dispatch: Dispatch; accentColor: string;
}) {
  return (
    <Pressable
      accessibilityLabel={GOOGLE.label}
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
      <Text style={styles.googleLabel}>{GOOGLE.label}</Text>
    </Pressable>
  );
}

function GoogleError() {
  return <View style={styles.error}>
    <Feather accessible={false} color="#B91C1C" name="alert-circle" size={16} />
    <Text accessibilityRole="alert" style={styles.errorText} testID="account-google-error">{GOOGLE.failed}</Text>
  </View>;
}

export function UsernameView({ view, dispatch, accentColor }: { view: Username; dispatch: Dispatch; accentColor: string }) {
  const locked = view.submit.status === 'submitting';
  const message = usernameMessage(view);
  const changing = view.mode === 'change';
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{changing ? USERNAME.change.title : USERNAME.title}</Text>
      <Text>{changing ? USERNAME.change.body : USERNAME.body}</Text>
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
        label={changing ? USERNAME.change.skip : USERNAME.skip}
        onPress={() => dispatch({ type: 'usernameSkipped' })}
        accentColor={accentColor}
        disabled={locked}
        testID="account-username-skip"
      />
    </View>
  );
}

export function InboxView({ view, dispatch, accentColor }: { view: Inbox; dispatch: Dispatch; accentColor: string }) {
  const copy = INBOX[view.reason];
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text>{copy.body}</Text>
      <LinkButton
        label={INBOX.back}
        onPress={() => dispatch({ type: 'navigated', to: 'signIn' })}
        accentColor={accentColor}
        testID="account-back"
      />
    </View>
  );
}

export function SetNewPasswordView({ view, dispatch, accentColor }: { view: NewPassword; dispatch: Dispatch; accentColor: string }) {
  const locked = busy(view.submit.status);
  const error = view.submit.status === 'failed'
    ? view.submit.failure === 'weakPassword' ? NEW_PASSWORD.hint : otherFailure(view.submit.failure, NEW_PASSWORD)
    : undefined;
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{NEW_PASSWORD.title}</Text>
      <Field
        label={NEW_PASSWORD.label}
        value={view.password}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'password', value })}
        accentColor={accentColor}
        editable={!locked}
        secureTextEntry
        error={error}
        testID="account-new-password"
      />
      {error ? null : <Text>{NEW_PASSWORD.hint}</Text>}
      <PrimaryButton
        label={NEW_PASSWORD.submit}
        onPress={() => dispatch({ type: 'submitted' })}
        accentColor={accentColor}
        disabled={locked}
        loading={view.submit.status === 'submitting'}
        testID="account-submit"
      />
    </View>
  );
}

export function PasswordSavedView({ view, onContinue, accentColor }: { view: Saved; onContinue: (identity: Saved['identity']) => void; accentColor: string }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{SAVED.title}</Text>
      <Text>{SAVED.body}</Text>
      <PrimaryButton label={SAVED.next} onPress={() => onContinue(view.identity)} accentColor={accentColor} testID="account-continue" />
    </View>
  );
}

export function SignedInView({ view, dispatch, accentColor }: { view: SignedIn; dispatch: Dispatch; accentColor: string }) {
  const { identity, signingOut } = view;
  const name = identity.username ?? SIGNED_IN.guest;
  return (
    <View style={styles.stack}>
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: accentColor }]}>
          <Text style={styles.initial} testID="account-avatar">{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{name}</Text>
        <Text>{identity.email}</Text>
        <Text>{identity.provider === 'google' ? SIGNED_IN.google : SIGNED_IN.email}</Text>
      </View>
      <Text>{SIGNED_IN.note}</Text>
      <SecondaryButton
        label={SIGNED_IN.signOut}
        onPress={() => dispatch({ type: 'signOutRequested' })}
        accentColor={accentColor}
        loading={signingOut}
        testID="account-sign-out"
      />
      <LinkButton
        label={identity.username === null ? SIGNED_IN.setUsername : SIGNED_IN.changeUsername}
        onPress={() => dispatch({ type: 'usernameEntryChosen' })}
        accentColor={accentColor}
        disabled={signingOut}
        testID="account-username-entry"
      />
      <DestructiveButton label={SIGNED_IN.delete} onPress={() => dispatch({ type: 'deleteRequested' })} accentColor={accentColor} disabled={signingOut} testID="account-delete" />
    </View>
  );
}

export function DeleteAccountView({ view, dispatch, accentColor }: { view: DeleteAccount; dispatch: Dispatch; accentColor: string }) {
  const { deletion } = view;
  const deleting = deletion.phase === 'deleting';
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{DELETE.title}</Text>
      <Text>{DELETE.goes}</Text>
      <Text>{DELETE.stays}</Text>
      <Field
        label={DELETE.label}
        value={deleting ? DELETE_WORD : deletion.typed}
        onChangeText={(value) => dispatch({ type: 'edited', field: 'typed', value })}
        accentColor={accentColor}
        autoCapitalize="characters"
        editable={!deleting}
        error={!deleting && deletion.failure ? DELETE[deletion.failure] : undefined}
        testID="account-delete-input"
      />
      <DestructiveButton
        label={deleting ? DELETE.deleting : DELETE.confirm}
        onPress={() => dispatch({ type: 'deleteConfirmed' })}
        accentColor={accentColor}
        disabled={!isDeleteArmed(deletion)}
        loading={deleting}
        confirm
        testID="account-delete-confirm"
      />
      <SecondaryButton
        label={DELETE.keep}
        onPress={() => dispatch({ type: 'deleteCancelled' })}
        accentColor={accentColor}
        disabled={deleting}
        testID="account-delete-keep"
      />
    </View>
  );
}

export function AccountDeletedView({ onBack, accentColor }: { onBack: () => void; accentColor: string }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{DELETE.doneTitle}</Text>
      <Text>{DELETE.done}</Text>
      <PrimaryButton label={DELETE.back} onPress={onBack} accentColor={accentColor} testID="account-deleted-back" />
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: 4 },
  avatar: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  initial: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
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

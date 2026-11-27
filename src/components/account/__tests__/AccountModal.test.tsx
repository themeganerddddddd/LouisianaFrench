import { describe, expect, it, jest } from '@jest/globals';
import { act, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AccountConnector } from '../../../account/accountConnector';
import type { AccountEvent, AccountView, AuthResult, Identity } from '../../../account/accountMachine';
import { useAccountMachine } from '../../../account/useAccountMachine';
import { accentFor } from '../../../theme/languageAccent';
import { AccountModal } from '../AccountModal';

const WRONG = 'That email or password is not right.';
const GOOGLE_FAILED = 'Google sign-in did not finish. Try again.';
const INBOX = 'Check that inbox. I give the same reply for every address.';

function connector(signIn: AccountConnector['signIn']): AccountConnector {
  return {
    signIn,
    signUp: async () => ({ ok: false, failure: 'unknown' }),
    sendReset: async () => ({ ok: true, pending: 'passwordReset' }),
    updatePassword: async () => ({ ok: false, failure: 'unknown' }),
    signInWithProvider: async () => ({ ok: false, failure: 'unknown' }),
    signOut: async () => {},
    deleteAccount: async () => ({ ok: false, failure: 'unknown' }),
    consumeAuthUrl: async () => null,
    setUsername: async () => ({ ok: false, reason: 'network' }),
    checkUsername: async () => ({ status: 'error' }),
    beginAttempt: () => 1,
    noteSuccess: () => {},
    orphaned: () => true
  };
}

function Host({ account, accent = accentFor('cajun') }: { account: AccountConnector; accent?: string }) {
  const [stable] = useState(() => account);
  const { view, dispatch } = useAccountMachine(stable, null);
  return (
    <AccountModal
      visible
      view={view}
      dispatch={dispatch}
      accentColor={accent}
      onClose={() => {}}
    />
  );
}

function sheet(view: AccountView, accent = accentFor('cajun'), onClose = () => {}) {
  return render(
    <AccountModal visible view={view} dispatch={() => {}} accentColor={accent} onClose={onClose} />
  );
}

const idle: AccountView = { kind: 'signIn', email: '', password: '', submit: { status: 'editing' } };
const oauth: AccountView = {
  kind: 'signIn',
  email: 'ada@example.com',
  password: 'secret',
  submit: { status: 'oauth', provider: 'google' }
};
const submitting: AccountView = {
  kind: 'signIn',
  email: 'ada@example.com',
  password: 'secret',
  submit: { status: 'submitting' }
};
const replacing: AccountView = { kind: 'setNewPassword', password: '', submit: { status: 'editing' } };
const learner: Identity = { id: 'learner-1', email: 'ada@example.com', username: 'Ada', provider: 'email' };
const inbox: AccountView = { kind: 'inbox', reason: 'passwordReset' };

describe('AccountModal', () => {
  it('clears the password and shows the error under it when the password is wrong', async () => {
    const signIn = jest.fn(async (_email: string, _password: string): Promise<AuthResult> => ({
      ok: false,
      failure: 'wrongCredentials'
    }));
    render(<Host account={connector(signIn)} />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByLabelText('Password').props.value).toBe(''));
    expect(screen.getByLabelText('Password').props.accessibilityHint).toBe(WRONG);
    expect(screen.getByRole('alert')).toHaveTextContent(WRONG);
    expect(signIn).toHaveBeenCalledWith('ada@example.com', 'secret');
  });

  it('calls Google sign-in once when Continue with Google is tapped twice', async () => {
    const signInWithProvider = jest.fn((_provider: string): Promise<AuthResult> => new Promise(() => {}));
    const account = connector(async () => ({ ok: false, failure: 'unknown' }));
    account.signInWithProvider = signInWithProvider;
    render(<Host account={account} />);
    const google = screen.getByRole('button', { name: 'Continue with Google' });
    fireEvent.press(google);
    fireEvent.press(google);
    await waitFor(() => expect(signInWithProvider).toHaveBeenCalledTimes(1));
    expect(signInWithProvider).toHaveBeenCalledWith('google');
  });

  it('blocks email submit, fields, and links while Google sign-in is in progress', async () => {
    const signIn = jest.fn(async (_email: string, _password: string): Promise<AuthResult> => ({
      ok: false,
      failure: 'unknown'
    }));
    const account = connector(signIn);
    account.signInWithProvider = () => new Promise(() => {});
    render(<Host account={account} />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(screen.getByTestId('account-google-spinner')).toBeOnTheScreen());
    expect(screen.getByLabelText('Email').props.editable).toBe(false);
    expect(screen.getByLabelText('Password').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState).toMatchObject({
      disabled: true
    });
    expect(screen.getByRole('link', { name: 'Forgot password?' }).props.accessibilityState).toMatchObject({
      disabled: true
    });
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
  });

  it('returns to an idle form after Google is cancelled, and shows a failure above the button', async () => {
    let release: (result: AuthResult) => void = () => {};
    const account = connector(async () => ({ ok: false, failure: 'unknown' }));
    account.signInWithProvider = () => new Promise<AuthResult>((resolve) => {
      release = resolve;
    });
    render(<Host account={account} />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await act(async () => {
      release({ ok: false, failure: 'oauthCancelled' });
    });
    expect(screen.queryByText(GOOGLE_FAILED)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Email').props.editable).toBe(true);
    expect(screen.getByTestId('account-close')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await act(async () => {
      release({ ok: false, failure: 'oauthFailed' });
    });
    expect(screen.getByText(GOOGLE_FAILED)).toBeOnTheScreen();
    expect(screen.getByLabelText('Email').props.editable).toBe(true);
    expect(screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState.disabled).toBeFalsy();
  });

  it('hides Close whenever the sheet cannot be dismissed', () => {
    const shown = sheet(idle);
    expect(screen.getByTestId('account-close')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('account-close').props.style).minHeight).toBe(44);
    shown.unmount();

    for (const view of [oauth, submitting, replacing]) {
      const hidden = sheet(view);
      expect(screen.queryByTestId('account-close')).toBeNull();
      hidden.unmount();
    }

    const mail = sheet(inbox);
    expect(screen.getByTestId('account-close')).toBeOnTheScreen();
    mail.unmount();
  });

  it('paints Close and Sign in with the Language accent', () => {
    const blue = sheet(idle, accentFor('cajun'));
    expect(StyleSheet.flatten(screen.getByText('Close').props.style).color).toBe('#2771CB');
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Sign in' }).props.style).backgroundColor).toBe(
      '#2771CB'
    );
    blue.unmount();

    sheet(idle, accentFor('kreole'));
    expect(StyleSheet.flatten(screen.getByText('Close').props.style).color).toBe('#08834C');
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Sign in' }).props.style).backgroundColor).toBe(
      '#08834C'
    );
    expect(StyleSheet.flatten(screen.getByText('Close').props.style).color).not.toBe('#2771CB');
  });

  it('goes back to sign in from Forgot, and locks that link while the email is sending', () => {
    const shown = render(<Host account={connector(async () => ({ ok: false, failure: 'unknown' }))} />);
    fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));
    expect(screen.queryByLabelText('Password')).toBeNull();
    fireEvent.press(screen.getByRole('link', { name: 'Back to sign in' }));
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
    shown.unmount();

    sheet({ kind: 'forgot', email: 'ada@example.com', submit: { status: 'submitting' } });
    expect(screen.getByRole('link', { name: 'Back to sign in' }).props.accessibilityState).toMatchObject({
      disabled: true
    });
  });

  it('asks for the email only, then shows the same inbox reply for every address', async () => {
    render(<Host account={connector(async () => ({ ok: false, failure: 'unknown' }))} />);
    fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));
    expect(screen.queryByLabelText('Password')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Email me a link' }));
    await waitFor(() => expect(screen.getByText('Check your inbox')).toBeOnTheScreen());
    expect(screen.getByText(INBOX)).toBeOnTheScreen();
    expect(screen.queryByText('ada@example.com')).toBeNull();

    fireEvent.press(screen.getByRole('link', { name: 'Sign in' }));
    fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));
    fireEvent.changeText(screen.getByLabelText('Email'), 'other@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Email me a link' }));
    await waitFor(() => expect(screen.getByText(INBOX)).toBeOnTheScreen());
    expect(screen.queryByText('other@example.com')).toBeNull();
  });
});

const HELPER = '3–20 characters. Start with a letter. Letters, numbers, and underscores.';
const LENGTH = 'Use 3 to 20 characters.';
const CHARSET = 'Use letters, numbers, or underscores, and start with a letter.';
const TAKEN = 'That username is taken.';
const RESERVED = "That username isn't available. Try another.";

function username(over: Partial<Extract<AccountView, { kind: 'username' }>> = {}): AccountView {
  return {
    kind: 'username',
    identity: { id: 'ada', email: 'ada@example.com', username: null, provider: 'google' },
    draft: '',
    availability: { status: 'unchecked' },
    submit: { status: 'editing' },
    mode: 'first',
    ...over
  };
}

function openUsername(view: AccountView, dispatch = jest.fn(), accent = accentFor('cajun')) {
  render(<AccountModal visible view={view} dispatch={dispatch} accentColor={accent} onClose={() => {}} />);
  return dispatch;
}

describe('username step view', () => {
  it('starts empty for Google and email, with the rules and Save disabled', () => {
    openUsername(username());
    expect(screen.getByText('Choose a username')).toBeOnTheScreen();
    expect(screen.getByText('Pick a username so people know you on the board. You can skip and set it later.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Username').props.value).toBe('');
    expect(screen.getByLabelText('Username').props.placeholder).toBe('your_username');
    expect(screen.getByText(HELPER)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState).toMatchObject({
      disabled: true
    });
    expect(screen.getByRole('link', { name: 'Skip for now' })).toBeOnTheScreen();
    expect(screen.queryByText('ada@example.com')).toBeNull();

    screen.unmount();
    openUsername(username({
      identity: { id: 'ada', email: 'ada@example.com', username: null, provider: 'email' }
    }));
    expect(screen.getByLabelText('Username').props.value).toBe('');
  });

  it('shows Checking while a check is in flight and keeps Save enabled', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'checking', value: 'Ada' }
    }));
    expect(screen.getByText('Checking…')).toBeOnTheScreen();
    expect(screen.getByTestId('account-username-checking')).toBeOnTheScreen();
    expect(screen.queryByText(HELPER)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(false);
  });

  it('draws the checking ring inside the field and leaves the helper as plain text', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'checking', value: 'Ada' }
    }), jest.fn(), accentFor('cajun'));
    const field = screen.getByTestId('account-username-field');
    const ring = within(field).getByTestId('account-username-checking');
    expect(StyleSheet.flatten(ring.props.style)).toMatchObject({
      width: 18,
      height: 18,
      borderWidth: 2,
      borderColor: '#2771CB',
      borderTopColor: 'transparent'
    });
    const input = within(field).getByLabelText('Username');
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ minHeight: 48, borderWidth: 1 });
    const line = screen.getByText('Checking…');
    if (!line.parent) throw new Error('Checking line has no row');
    expect(within(line.parent).queryByTestId('account-username-checking')).toBeNull();
    expect(line.props.accessibilityLiveRegion).toBe('polite');
    expect(StyleSheet.flatten(line.props.style)).toMatchObject({
      fontSize: 13,
      fontWeight: '600',
      color: '#64748B'
    });
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(false);

    screen.unmount();
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'available' }
    }));
    expect(screen.queryByTestId('account-username-checking')).toBeNull();
    expect(screen.getByText('Ada is available.').props.accessibilityLiveRegion).toBe('polite');
  });

  it('shows that the typed name is available', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'available' }
    }), jest.fn(), accentFor('kreole'));
    expect(screen.getByText('Ada is available.')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('account-username-available').props.style).color).toBe('#08834C');
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(false);
  });

  it('shows only the rules when the availability check cannot reach the server', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'error' }
    }));
    expect(screen.getByText(HELPER)).toBeOnTheScreen();
    expect(screen.queryByText('Checking…')).toBeNull();
    expect(screen.queryByText('Ada is available.')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(false);
  });

  it('shows a format error with an icon, and disables Save', () => {
    openUsername(username({ draft: 'lo' }));
    expect(screen.getByRole('alert')).toHaveTextContent(LENGTH);
    expect(screen.getByTestId('account-username-error-icon')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(true);

    screen.unmount();
    openUsername(username({ draft: 'a'.repeat(21) }));
    expect(screen.getByRole('alert')).toHaveTextContent(LENGTH);

    screen.unmount();
    openUsername(username({ draft: 'logan!' }));
    expect(screen.getByRole('alert')).toHaveTextContent(CHARSET);
    expect(screen.getByTestId('account-username-error-icon')).toBeOnTheScreen();

    screen.unmount();
    openUsername(username({ draft: '1ada' }));
    expect(screen.getByRole('alert')).toHaveTextContent(CHARSET);
  });

  it('shows taken, reserved, and invalid with an icon, and disables Save', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'taken' },
      submit: { status: 'failed', failure: 'taken' }
    }));
    expect(screen.getByRole('alert')).toHaveTextContent(TAKEN);
    expect(screen.getByTestId('account-username-error-icon')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(true);

    screen.unmount();
    for (const reply of ['reserved', 'invalid'] as const) {
      openUsername(username({
        draft: 'Ada',
        availability: { status: 'settled', value: 'Ada', reply }
      }));
      expect(screen.getByRole('alert')).toHaveTextContent(RESERVED);
      expect(screen.getByTestId('account-username-error-icon')).toBeOnTheScreen();
      screen.unmount();
    }
  });

  it('keeps Save enabled when the reply is current', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'current' }
    }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState.disabled).toBe(false);
  });

  it('dispatches Skip, Close, edit, and Save', () => {
    const skipped = openUsername(username());
    fireEvent.press(screen.getByRole('link', { name: 'Skip for now' }));
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(skipped).toHaveBeenNthCalledWith(1, { type: 'usernameSkipped' });
    expect(skipped).toHaveBeenNthCalledWith(2, { type: 'usernameSkipped' });
    screen.unmount();

    const edited = openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'available' }
    }));
    fireEvent.changeText(screen.getByLabelText('Username'), 'Adam');
    fireEvent.press(screen.getByRole('button', { name: 'Save username' }));
    expect(edited).toHaveBeenNthCalledWith(1, { type: 'usernameEdited', value: 'Adam' });
    expect(edited).toHaveBeenNthCalledWith(2, { type: 'usernameSaved' });
    screen.unmount();

    const blocked = openUsername(username({ draft: 'lo' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save username' }));
    expect(blocked).not.toHaveBeenCalled();
  });

  it('locks the field, Skip, and Close while Save is running', () => {
    openUsername(username({
      draft: 'Ada',
      availability: { status: 'settled', value: 'Ada', reply: 'available' },
      submit: { status: 'submitting' }
    }));
    expect(screen.getByLabelText('Username').props.editable).toBe(false);
    expect(screen.getByRole('link', { name: 'Skip for now' }).props.accessibilityState).toMatchObject({
      disabled: true
    });
    expect(screen.getByRole('button', { name: 'Save username' }).props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true
    });
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

describe('change username view', () => {
  const HELPER_17A = 'You can fix a typo for 24 hours after you first set your username. After that, you can change it once every 30 days.';
  const named: Identity = { ...learner, username: 'Elise' };

  function Flow({ account }: { account: AccountConnector }) {
    const [stable] = useState(() => account);
    const { view, dispatch } = useAccountMachine(stable, named);
    return <AccountModal visible view={view} dispatch={dispatch} accentColor={accentFor('cajun')} onClose={() => {}} />;
  }

  function changing(setUsername: AccountConnector['setUsername'], checkUsername: AccountConnector['checkUsername'] = async () => ({ status: 'current' })) {
    render(<Flow account={{ ...connector(async () => ({ ok: false, failure: 'unknown' })), setUsername, checkUsername }} />);
    fireEvent.press(screen.getByRole('link', { name: 'Change username' }));
  }

  const save = () => screen.getByRole('button', { name: 'Save username' });

  it('opens from Signed in with the current name, the 17A helper and Save disabled', () => {
    changing(jest.fn(async () => ({ ok: false as const, reason: 'network' as const })));
    expect(screen.getByText(HELPER_17A)).toBeOnTheScreen();
    expect(screen.getByLabelText('Username').props.value).toBe('Elise');
    expect(save().props.accessibilityState.disabled).toBe(true);
    fireEvent.press(save());
  });

  it('does not call the RPC for an identical value, and cancels back to Signed in', () => {
    const setUsername = jest.fn(async () => ({ ok: false as const, reason: 'network' as const }));
    changing(setUsername);
    fireEvent.press(save());
    expect(setUsername).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('link', { name: 'Cancel' }));
    expect(screen.getByText('Elise')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Change username' })).toBeOnTheScreen();
  });

  it('enables Save for a re-cased value, calls the RPC and returns to Signed in with the new name', async () => {
    const setUsername = jest.fn(async (name: string) => ({ ok: true as const, username: name }));
    changing(setUsername);
    fireEvent.changeText(screen.getByLabelText('Username'), 'ELISE');
    await waitFor(() => expect(save().props.accessibilityState.disabled).toBeFalsy());
    fireEvent.press(save());
    expect(setUsername).toHaveBeenCalledWith('ELISE');
    await waitFor(() => expect(screen.getByTestId('account-avatar')).toHaveTextContent('E'));
    expect(screen.getByText('ELISE')).toBeOnTheScreen();
  });

  it.each([
    ['taken', 'That username is taken.'],
    ['reserved', "That username isn't available. Try another."]
  ] as const)('shows the %s copy when Save is refused', async (reason, copy) => {
    changing(jest.fn(async () => ({ ok: false as const, reason })));
    fireEvent.changeText(screen.getByLabelText('Username'), 'Elisa');
    await waitFor(() => expect(save().props.accessibilityState.disabled).toBeFalsy());
    fireEvent.press(save());
    await waitFor(() => expect(screen.getByText(copy)).toBeOnTheScreen());
  });

  it('shows the date from retryAt when a change is too soon', async () => {
    changing(jest.fn(async () => ({ ok: false as const, reason: 'too_soon' as const, retryAt: '2026-12-24T12:00:00.000Z' })));
    fireEvent.changeText(screen.getByLabelText('Username'), 'Elisa');
    await waitFor(() => expect(save().props.accessibilityState.disabled).toBeFalsy());
    fireEvent.press(save());
    await waitFor(() => expect(screen.getByText(/^You can change your username again on .*2026\.$/)).toBeOnTheScreen());
    expect(screen.getByText(/December 24, 2026/)).toBeOnTheScreen();
  });
});

describe('create account view', () => {
  const createView = (over: Partial<Extract<AccountView, { kind: 'create' }>> = {}): AccountView => ({
    kind: 'create', username: '', email: '', password: '', submit: { status: 'editing' }, ...over
  });
  const ada = { id: 'ada', email: 'ada@example.com', username: null, provider: 'email' as const };
  const base = connector(async () => ({ ok: false, failure: 'unknown' }));

  function fill(name: string) {
    fireEvent.press(screen.getByRole('link', { name: 'Create account' }));
    if (name) fireEvent.changeText(screen.getByLabelText('Username'), name);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'secret12');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  }

  it('shows Username, Email, Password with the hint, Google, and no Display name', () => {
    sheet(createView());
    expect(screen.getByLabelText('Username')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
    expect(screen.getByText('At least 8 characters.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Display name')).toBeNull();
  });

  it('shows emailTaken under Email and the hint as an error for a weak password', () => {
    sheet(createView({ submit: { status: 'failed', failure: 'emailTaken' } }));
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe('That email is already registered.');
    screen.unmount();
    sheet(createView({ submit: { status: 'failed', failure: 'weakPassword' } }));
    expect(screen.getByLabelText('Password').props.accessibilityHint).toBe('At least 8 characters.');
  });

  it('does not show the password hint as an error for a wrong-credentials failure', () => {
    sheet(createView({ submit: { status: 'failed', failure: 'wrongCredentials' } }));
    expect(screen.getByLabelText('Password').props.accessibilityHint).toBeUndefined();
  });

  it('sends the typed name to sign-up and goes on without the step when it was saved', async () => {
    const signUp = jest.fn(async (_e: string, _p: string, _u: string | null): Promise<AuthResult> => ({
      ok: true, profileRead: false, identity: { ...ada, username: 'Elise' }
    }));
    render(<Host account={{ ...base, signUp }} />);
    fill('Elise');
    await waitFor(() => expect(signUp).toHaveBeenCalledWith('ada@example.com', 'secret12', 'Elise'));
    expect(screen.queryByText('Choose a username')).toBeNull();
  });

  it('lands in the step with the typed value and the taken error when set_username failed', async () => {
    const signUp = async (): Promise<AuthResult> => ({
      ok: true, profileRead: false, identity: ada, usernameFailed: { ok: false, reason: 'taken' }
    });
    render(<Host account={{ ...base, signUp }} />);
    fill('Elise');
    await waitFor(() => expect(screen.getByText('Choose a username')).toBeOnTheScreen());
    expect(screen.getByLabelText('Username').props.value).toBe('Elise');
    expect(screen.getAllByText('That username is taken.').length).toBeGreaterThan(0);
  });

  it('lands in the step for an empty username with a session', async () => {
    const signUp = async (): Promise<AuthResult> => ({ ok: true, profileRead: true, identity: ada });
    render(<Host account={{ ...base, signUp }} />);
    fill('');
    await waitFor(() => expect(screen.getByText('Choose a username')).toBeOnTheScreen());
    expect(screen.getByLabelText('Username').props.value).toBe('');
  });

  it('shows Confirm your email for confirmSignUp and calls no RPC', async () => {
    const setUsername = jest.fn(async () => ({ ok: false as const, reason: 'network' as const }));
    const signUp = async (): Promise<AuthResult> => ({ ok: true, pending: 'confirmSignUp' });
    render(<Host account={{ ...base, signUp, setUsername }} />);
    fill('Elise');
    await waitFor(() => expect(screen.getByText('Confirm your email')).toBeOnTheScreen());
    expect(screen.queryByText('Check your inbox')).toBeNull();
    expect(setUsername).not.toHaveBeenCalled();
  });

  it('paints Create account with the accent of each Language', () => {
    sheet(createView(), accentFor('cajun'));
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Create account' }).props.style).backgroundColor).toBe('#2771CB');
    screen.unmount();
    sheet(createView(), accentFor('kreole'));
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Create account' }).props.style).backgroundColor).toBe('#08834C');
  });

  it('cannot dismiss Set new password by backdrop or Android back, and shows its heading', () => {
    const onClose = jest.fn();
    sheet(replacing, accentFor('cajun'), onClose);
    fireEvent.press(screen.getByTestId('account-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId('account-close')).toBeNull();
    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Set a new password')).toBeOnTheScreen();
  });

  it('saves a new password, shows Password saved, and Continue opens the identity then closes', async () => {
    const onClose = jest.fn();
    const updatePassword = jest.fn(async (_password: string): Promise<AuthResult> => ({ ok: true, identity: learner }));
    const dispatched: AccountEvent[] = [];
    let open: () => void = () => {};
    function Flow() {
      const [account] = useState(() => ({ ...connector(async () => ({ ok: false, failure: 'unknown' })), updatePassword }));
      const { view, dispatch } = useAccountMachine(account, null);
      open = () => dispatch({ type: 'recoveryLinkOpened' });
      return (
        <AccountModal
          visible
          view={view}
          dispatch={(event) => { dispatched.push(event); dispatch(event); }}
          accentColor={accentFor('cajun')}
          onClose={onClose}
        />
      );
    }
    render(<Flow />);
    act(() => open());
    fireEvent.changeText(screen.getByLabelText('New password'), 'longenough1');
    fireEvent.press(screen.getByRole('button', { name: 'Save password' }));
    await waitFor(() => expect(screen.getByText('Password saved')).toBeOnTheScreen());
    expect(updatePassword).toHaveBeenCalledWith('longenough1');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(dispatched).toContainEqual({ type: 'opened', identity: learner });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['email', 'Ada', 'A', 'Signed in with Email'],
    ['google', null, 'L', 'Signed in with Google']
  ] as const)('shows Signed in for %s with username %s', (provider, username, initial, how) => {
    sheet({ kind: 'signedIn', identity: { ...learner, provider, username }, signingOut: false });
    expect(screen.getByTestId('account-avatar')).toHaveTextContent(initial);
    expect(screen.getByText(username ?? 'Learner')).toBeOnTheScreen();
    expect(screen.getByText('ada@example.com')).toBeOnTheScreen();
    expect(screen.getByText(how)).toBeOnTheScreen();
    expect(screen.getByText('Your progress stays on this device.')).toBeOnTheScreen();
    const entry = screen.getByRole('link', { name: username ? 'Change username' : 'Set a username' });
    expect(entry.props.accessibilityState.disabled).toBeFalsy();
    expect(screen.queryByText(username ? 'Set a username' : 'Change username')).toBeNull();
    expect(screen.getByText('Delete account')).toBeOnTheScreen();
  });

  it('paints the Sign out label differently from its background', () => {
    sheet({ kind: 'signedIn', identity: learner, signingOut: false });
    const button = StyleSheet.flatten(screen.getByRole('button', { name: 'Sign out' }).props.style);
    const label = StyleSheet.flatten(screen.getByText('Sign out').props.style);
    expect(label.color).not.toBe(button.backgroundColor);
    expect(button.borderWidth).toBe(1);
  });

  it('signs out to the guest view, leaves Learner Progress alone, and locks while signing out', async () => {
    await AsyncStorage.setItem('learner-progress', '{"xp":42}');
    let release: () => void = () => {};
    const signOut = jest.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    function Out() {
      const [account] = useState(() => ({ ...connector(async () => ({ ok: false, failure: 'unknown' })), signOut }));
      const { view, dispatch } = useAccountMachine(account, learner);
      return <AccountModal visible view={view} dispatch={dispatch} accentColor={accentFor('cajun')} onClose={() => {}} />;
    }
    render(<Out />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Sign out' }).props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(screen.getByTestId('account-sign-out-spinner')).toBeOnTheScreen();
    expect(screen.queryByTestId('account-close')).toBeNull();
    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen());
    expect(await AsyncStorage.getItem('learner-progress')).toBe('{"xp":42}');
  });
});

import { describe, expect, it, jest } from '@jest/globals';
import { act, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { AccountConnector } from '../../../account/accountConnector';
import type { AccountView, AuthResult } from '../../../account/accountMachine';
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

  it('blocks email submit, fields, and links while Google sign-in is in progress', () => {
    const signIn = jest.fn(async (): Promise<AuthResult> => ({ ok: false, failure: 'unknown' }));
    sheet(oauth);
    expect(screen.getByTestId('account-google-spinner')).toBeOnTheScreen();
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

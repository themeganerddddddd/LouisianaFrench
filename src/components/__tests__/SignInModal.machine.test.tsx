import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import type { AccountConnector } from '../../account/accountConnector';
import type { AuthResult, Identity } from '../../account/accountMachine';
import { useAccountMachine } from '../../account/useAccountMachine';
import { accentFor } from '../../theme/languageAccent';
import SignInModal from '../SignInModal';

const ADA: Identity = {
  id: 'learner-1',
  email: 'ada@example.com',
  username: 'Ada',
  provider: 'email'
};
const saved: AuthResult = { ok: true, identity: ADA };
const rejected: AuthResult = { ok: false, failure: 'weakPassword' };

function account(updatePassword: AccountConnector['updatePassword']): AccountConnector {
  return {
    signIn: async () => ({ ok: false, failure: 'unknown' }),
    signUp: async () => ({ ok: false, failure: 'unknown' }),
    sendReset: async () => ({ ok: false, failure: 'unknown' }),
    updatePassword,
    signInWithProvider: async () => ({ ok: false, failure: 'unknown' }),
    signOut: async () => {},
    deleteAccount: async () => ({ ok: false, failure: 'unknown' }),
    consumeAuthUrl: async () => null,
    beginAttempt: () => 1,
    noteSuccess: () => {},
    orphaned: () => false
  };
}

function RecoveryModal({ updatePassword }: { updatePassword: AccountConnector['updatePassword'] }) {
  const [connector] = useState(() => account(updatePassword));
  const { view, dispatch } = useAccountMachine(connector, null);
  useEffect(() => {
    dispatch({ type: 'recoveryLinkOpened' });
  }, [dispatch]);
  return (
    <SignInModal
      visible
      view={view}
      dispatch={dispatch}
      accentColor={accentFor('cajun')}
      onClose={() => {}}
    />
  );
}

describe('SignInModal account machine', () => {
  it('saves a recovery password through the machine', async () => {
    const user = userEvent.setup();
    const updatePassword = jest.fn(async (password: string) => (password === 'bad' ? rejected : saved));
    render(<RecoveryModal updatePassword={updatePassword} />);

    expect(screen.getByText(/Choose a new password/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Close sign in')).toBeNull();

    await user.type(screen.getByTestId('sign-in-password'), 'bad');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Sign-in failed.')).toBeOnTheScreen();
    expect(updatePassword).toHaveBeenCalledWith('bad');

    await user.clear(screen.getByTestId('sign-in-password'));
    await user.type(screen.getByTestId('sign-in-password'), 'new-secret');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText(/That link is finished/)).toBeOnTheScreen();
    expect(updatePassword).toHaveBeenCalledWith('new-secret');
  });
});

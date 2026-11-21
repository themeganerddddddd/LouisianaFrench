import { render, screen, userEvent } from '@testing-library/react-native';

import SignInModal from '../SignInModal';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome5: ({ name }) => React.createElement(Text, null, name)
  };
});

jest.mock('../TBoySpeechBubble', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function FakeBubble({ body, testID }) {
    return React.createElement(Text, { testID }, body);
  };
});

describe('SignInModal password recovery', () => {
  it('locks Home until a new password is saved from a recovery return', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onRecoveryFinished = jest.fn();
    const connector = {
      async updatePassword(password) {
        if (password === 'bad') {
          return { identity: null, message: 'That password was rejected.' };
        }
        return {
          identity: { id: 'learner-1', email: 'ada@example.com', displayName: 'Ada' },
          message: null
        };
      }
    };

    render(
      <SignInModal
        visible
        identity={{ id: 'learner-1', email: 'ada@example.com', displayName: 'Ada' }}
        connector={connector}
        recoveryActive
        onRecoveryFinished={onRecoveryFinished}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Choose a new password/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Close sign in')).toBeNull();

    await user.type(screen.getByTestId('sign-in-password'), 'bad');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('That password was rejected.')).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();

    await user.type(screen.getByTestId('sign-in-password'), 'new-secret');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText(/That link is finished/)).toBeOnTheScreen();
    expect(onRecoveryFinished).toHaveBeenCalled();

    await user.press(screen.getByTestId('sign-in-done'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows sign-in after an email confirmation return when no session was restored', async () => {
    const user = userEvent.setup();
    const connector = {
      async signInWithPassword({ email, password }) {
        if (email === 'ada@example.com' && password === 'secret') {
          return {
            identity: { id: 'learner-1', email, displayName: 'Ada' },
            message: null
          };
        }
        return { identity: null, message: 'That email or password is not right.' };
      }
    };
    const onClose = jest.fn();

    render(
      <SignInModal
        visible
        identity={null}
        connector={connector}
        emailConfirmedActive
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Email confirmed\. Sign in with your password/)).toBeOnTheScreen();
    expect(screen.getByTestId('sign-in-email')).toBeOnTheScreen();
    expect(screen.getByTestId('sign-in-password')).toBeOnTheScreen();

    await user.type(screen.getByTestId('sign-in-email'), 'ada@example.com');
    await user.type(screen.getByTestId('sign-in-password'), 'secret');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(onClose).toHaveBeenCalled();
  });
});

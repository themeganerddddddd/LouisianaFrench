import { render, screen, userEvent } from '@testing-library/react-native';

import { accentFor } from '../../theme/languageAccent';
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

const SIGNED_OUT_NAME = {
  kind: 'signedIn',
  signingOut: false,
  identity: { id: 'learner-1', email: 'ada@example.com', username: null, provider: 'email' }
};
const REPLACE = { kind: 'setNewPassword', password: '', submit: { status: 'editing' } };

describe('SignInModal password recovery', () => {
  it('shows Learner when the signed-in profile has no username', () => {
    render(
      <SignInModal
        visible
        view={SIGNED_OUT_NAME}
        dispatch={() => {}}
        onClose={() => {}}
        accentColor={accentFor('cajun')}
      />
    );
    expect(screen.getByText('Learner')).toBeOnTheScreen();
  });

  it('locks Home until a new password is saved from a recovery return', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { rerender } = render(
      <SignInModal
        visible
        view={REPLACE}
        dispatch={() => {}}
        accentColor={accentFor('cajun')}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Choose a new password/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Close sign in')).toBeNull();
    await user.press(screen.getByTestId('sign-in-backdrop'));
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <SignInModal
        visible
        view={{ kind: 'passwordSaved' }}
        dispatch={() => {}}
        accentColor={accentFor('cajun')}
        onClose={onClose}
      />
    );
    expect(screen.getByText(/That link is finished/)).toBeOnTheScreen();
    await user.press(screen.getByTestId('sign-in-done'));
    expect(onClose).toHaveBeenCalled();
  });
});

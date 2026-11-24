import { render, screen } from '@testing-library/react-native';

import { accentFor } from '../../theme/languageAccent';
import SignInModal from '../SignInModal';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome5: ({ name }) => React.createElement(Text, null, name)
  };
});

function renderModal(accentColor) {
  render(
    <SignInModal
      visible
      identity={null}
      connector={{}}
      onClose={() => {}}
      accentColor={accentColor}
    />
  );
}

describe('SignInModal accent', () => {
  it.each([
    ['cajun', '#2771CB'],
    ['kreole', '#08834C']
  ])('paints the button, links, and T-Boy bubble with the %s accent', (language, hex) => {
    expect(accentFor(language)).toBe(hex);
    renderModal(hex);

    expect(screen.getByTestId('sign-in-submit')).toHaveStyle({ backgroundColor: hex });
    expect(screen.getByText('Create an account')).toHaveStyle({ color: hex });
    expect(screen.getByText('Forgot password?')).toHaveStyle({ color: hex });
    expect(screen.getByTestId('sign-in-tboy-bubble')).toHaveStyle({ borderColor: hex });
  });

  it('does not paint Cajun blue when the caller forgets accentColor', () => {
    render(
      <SignInModal visible identity={null} connector={{}} onClose={() => {}} />
    );
    expect(screen.getByTestId('sign-in-submit')).not.toHaveStyle({ backgroundColor: accentFor('cajun') });
  });

  it('does not offer Facebook', () => {
    renderModal(accentFor('cajun'));
    expect(screen.queryByLabelText('Sign in with Facebook')).toBeNull();
    expect(screen.queryByText(/Facebook/)).toBeNull();
  });
});

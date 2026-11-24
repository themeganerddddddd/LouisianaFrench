import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderApp } from '../../test/renderApp';

const mockConsumeAuthUrl = jest.fn(async () => ({ type: 'recoveryLinkOpened' }));

jest.mock('../../identity/connector', () => ({
  createSupabaseIdentityConnector: () => ({
    async getIdentity() {
      return null;
    },
    async getAccessToken() {
      return null;
    },
    subscribe() {
      return () => {};
    },
    async handleAuthUrl() {
      return { kind: null };
    },
    account: {
      signIn: async () => ({ ok: false, failure: 'unavailable' }),
      signUp: async () => ({ ok: false, failure: 'unavailable' }),
      sendReset: async () => ({ ok: false, failure: 'unavailable' }),
      updatePassword: async () => ({ ok: false, failure: 'unavailable' }),
      signInWithProvider: async () => ({ ok: false, failure: 'unavailable' }),
      signOut: async () => {},
      deleteAccount: async () => ({ ok: false, failure: 'unknown' }),
      consumeAuthUrl: mockConsumeAuthUrl,
      beginAttempt: () => 1,
      noteSuccess: () => {},
      orphaned: () => false
    }
  })
}));

describe('Home account machine', () => {
  beforeEach(() => {
    mockConsumeAuthUrl.mockReset();
    mockConsumeAuthUrl.mockResolvedValue({ type: 'recoveryLinkOpened' });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('https://x/auth/callback?code=abc&type=recovery');
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove() {} });
  });

  it('opens the new-password screen from a recovery link', async () => {
    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });

    await screen.findByText('Report a bug');
    await waitFor(() => {
      expect(mockConsumeAuthUrl).toHaveBeenCalledWith('https://x/auth/callback?code=abc&type=recovery');
    });
    expect(await screen.findByText(/Choose a new password/)).toBeOnTheScreen();
  });

  it('shows a recovery exchange failure instead of ignoring it', async () => {
    mockConsumeAuthUrl.mockResolvedValue({ type: 'linkFailed', failure: 'network' });
    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
    await waitFor(() => {
      expect(mockConsumeAuthUrl).toHaveBeenCalled();
    });
    expect(await screen.findByText('The network failed. Try again.')).toBeOnTheScreen();
  });
});

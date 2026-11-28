import { jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { renderApp } from '../../test/renderApp';

const ADA = { id: 'learner-1', email: 'ada@example.com', username: 'Ada', provider: 'email' };
const NAMELESS = { ...ADA, username: null };
const RECOVERY_URL = 'https://x/auth/callback?code=abc&type=recovery';

const mockConsumeAuthUrl = jest.fn();
const mockUpdatePassword = jest.fn();
const mockDeleteAccount = jest.fn();
const mockListeners = new Set();
let mockSession = null;
function mockEmit(identity) {
  act(() => {
    for (const listener of mockListeners) listener(identity);
  });
}

jest.mock('../../components/HomeAboutMenu', () => {
  const { Text } = require('react-native');
  return function FakeMenu({ identity }) {
    return <Text testID="home-identity">{identity?.email ?? 'guest'}</Text>;
  };
});

jest.mock('../../identity/connector', () => ({
  createSupabaseIdentityConnector: () => ({
    async getIdentity() {
      return mockSession;
    },
    subscribe(listener) {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
    account: {
      signIn: async () => ({ ok: false, failure: 'unavailable' }),
      signUp: async () => ({ ok: false, failure: 'unavailable' }),
      sendReset: async () => ({ ok: false, failure: 'unavailable' }),
      updatePassword: (password) => mockUpdatePassword(password),
      signInWithProvider: async () => ({ ok: false, failure: 'unavailable' }),
      signOut: async () => {
        mockEmit(null);
      },
      deleteAccount: () => mockDeleteAccount(),
      consumeAuthUrl: (url) => mockConsumeAuthUrl(url),
      setUsername: async () => ({ ok: false, reason: 'network' }),
      checkUsername: async () => ({ status: 'error' }),
      beginAttempt: () => 1,
      noteSuccess: () => {},
      orphaned: () => false
    }
  })
}));

describe('Home account modal', () => {
  beforeEach(() => {
    mockListeners.clear();
    mockSession = null;
    mockConsumeAuthUrl.mockReset();
    mockConsumeAuthUrl.mockResolvedValue({ type: 'recoveryLinkOpened' });
    mockDeleteAccount.mockReset();
    mockUpdatePassword.mockReset();
    mockUpdatePassword.mockResolvedValue({ ok: true, identity: ADA });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(RECOVERY_URL);
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove() {} });
  });

  async function homeWithLink(event) {
    mockConsumeAuthUrl.mockResolvedValue(event);
    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
    await screen.findByTestId('home-identity');
    await waitFor(() => expect(mockConsumeAuthUrl).toHaveBeenCalledWith(RECOVERY_URL));
  }

  it('opens Set new password from a recovery link', async () => {
    await homeWithLink({ type: 'recoveryLinkOpened' });
    expect(await screen.findByText('Set a new password')).toBeOnTheScreen();
  });

  it('shows a link failure instead of ignoring it', async () => {
    await homeWithLink({ type: 'linkFailed', failure: 'network' });
    expect(await screen.findByText('The network failed. Try again.')).toBeOnTheScreen();
  });

  it('still hears an identity change after the recovery flow ends with Continue', async () => {
    await homeWithLink({ type: 'recoveryLinkOpened' });
    fireEvent.changeText(await screen.findByTestId('account-new-password'), 'new-secret-1');
    fireEvent.press(screen.getByTestId('account-submit'));
    fireEvent.press(await screen.findByTestId('account-continue'));
    await waitFor(() => expect(screen.queryByTestId('account-modal')).toBeNull());

    mockEmit(ADA);
    expect(screen.getByTestId('home-identity')).toHaveTextContent('ada@example.com');
  });

  it('shows the recovery session identity after Continue', async () => {
    await homeWithLink({ type: 'recoveryLinkOpened' });
    mockSession = ADA;
    fireEvent.changeText(await screen.findByTestId('account-new-password'), 'new-secret-1');
    fireEvent.press(screen.getByTestId('account-submit'));
    fireEvent.press(await screen.findByTestId('account-continue'));
    await waitFor(() => expect(screen.getByTestId('home-identity')).toHaveTextContent('ada@example.com'));
  });

  it('opens Signed in from a confirm link', async () => {
    await homeWithLink({ type: 'opened', identity: ADA });
    expect(await screen.findByTestId('account-sign-out')).toBeOnTheScreen();
    expect(screen.getByText('Ada')).toBeOnTheScreen();
  });

  it('opens the username step from a confirm link without a username, and an emit does not move it', async () => {
    await homeWithLink({ type: 'opened', identity: NAMELESS, profileRead: true });
    expect(await screen.findByTestId('account-username-save')).toBeOnTheScreen();

    mockEmit(NAMELESS);
    expect(screen.getByTestId('account-username-save')).toBeOnTheScreen();
    expect(screen.getByTestId('home-identity')).toHaveTextContent('ada@example.com');
  });

  it('returns Home to a guest after Sign out', async () => {
    await homeWithLink({ type: 'opened', identity: ADA });
    mockEmit(ADA);
    expect(screen.getByTestId('home-identity')).toHaveTextContent('ada@example.com');

    fireEvent.press(await screen.findByTestId('account-sign-out'));
    await waitFor(() => expect(screen.getByTestId('home-identity')).toHaveTextContent('guest'));
  });

  it('returns Home to a guest after Delete account, with Learner Progress kept', async () => {
    await AsyncStorage.setItem('learner-progress', '{"xp":42}');
    mockDeleteAccount.mockImplementation(async () => {
      mockEmit(null);
      return { ok: true };
    });
    await homeWithLink({ type: 'opened', identity: ADA });
    mockEmit(ADA);
    fireEvent.press(await screen.findByTestId('account-delete'));
    fireEvent.changeText(screen.getByTestId('account-delete-input'), 'DELETE');
    fireEvent.press(screen.getByTestId('account-delete-confirm'));
    fireEvent.press(await screen.findByTestId('account-deleted-back'));
    await waitFor(() => expect(screen.queryByTestId('account-modal')).toBeNull());
    expect(screen.getByTestId('home-identity')).toHaveTextContent('guest');
    expect(await AsyncStorage.getItem('learner-progress')).toBe('{"xp":42}');
  });
});

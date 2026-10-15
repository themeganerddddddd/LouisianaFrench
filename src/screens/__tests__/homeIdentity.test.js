import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';

const mockConnector = {
  identity: null,
  listeners: new Set(),
  async getIdentity() {
    return this.identity;
  },
  async getAccessToken() {
    return this.identity ? 'token' : null;
  },
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  emit() {
    for (const listener of this.listeners) listener(this.identity);
  },
  async signUpWithPassword({ email, displayName }) {
    if (this.failure === 'duplicate') {
      return { identity: null, message: 'That email is already registered.' };
    }
    this.identity = { id: 'learner-1', email, displayName };
    this.emit();
    return { identity: this.identity, message: null };
  },
  async signInWithPassword({ email, password }) {
    if (this.failure === 'network') {
      return { identity: null, message: 'The network failed. Try again.' };
    }
    if (this.failure === 'unavailable') {
      return { identity: null, message: 'Sign-in is unavailable.' };
    }
    if (password !== 'secret') {
      return { identity: null, message: 'That email or password is not right.' };
    }
    this.identity = { id: 'learner-1', email, displayName: 'Ada' };
    this.emit();
    return { identity: this.identity, message: null };
  },
  async sendPasswordReset() {
    return { identity: null, message: null };
  },
  async signInWithProvider(provider) {
    this.provider = provider;
    if (this.failure === 'cancel') return { identity: null, message: null };
    this.identity = { id: 'learner-1', email: 'ada@example.com', displayName: 'Ada' };
    this.emit();
    return { identity: this.identity, message: null };
  },
  async signOut() {
    this.signOutScope = 'local';
    this.identity = null;
    this.emit();
    return { identity: null };
  }
};

jest.mock('../../identity/connector', () => ({
  createSupabaseIdentityConnector: () => mockConnector
}));

setupAppTests();

async function openHome() {
  renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
  return screen.findByTestId('home-sign-in');
}

describe('Home email sign-in', () => {
  beforeEach(async () => {
    mockConnector.identity = null;
    mockConnector.listeners = new Set();
    mockConnector.signOutScope = null;
    mockConnector.failure = null;
    await AsyncStorage.setItem(
      'lf_profile',
      JSON.stringify({ username: 'Player', xp: 4, streak: 1, lastStudyDate: null })
    );
  });

  it('lets a guest open study surfaces and the sign-in modal', async () => {
    const user = setupUser();
    const lesson = renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.getByTestId('home-stats')).toBeOnTheScreen();
    expect(screen.getByTestId('home-language-flag')).toBeOnTheScreen();
    expect(screen.getByTestId('home-review-control')).toBeOnTheScreen();

    await user.press(screen.getByText('Start'));
    expect(await screen.findByText('New word')).toBeOnTheScreen();
    lesson.unmount();

    const dictionary = renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
    await user.press(await screen.findByTestId('home-dictionary-control'));
    expect(await screen.findByText('French Dictionary')).toBeOnTheScreen();
    dictionary.unmount();

    const language = renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
    await user.press(await screen.findByLabelText('Louisiana French flag'));
    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
    language.unmount();

    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    expect(screen.getByTestId('sign-in-modal')).toBeOnTheScreen();
  });

  it('creates an identity and shows the display name', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByTestId('sign-in-create-mode'));
    await user.type(screen.getByTestId('sign-in-display-name'), 'Ada');
    await user.type(screen.getByTestId('sign-in-email'), 'ada@example.com');
    await user.type(screen.getByTestId('sign-in-password'), 'secret');
    await user.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByLabelText('Ada')).toBeOnTheScreen();
    expect(screen.queryByTestId('sign-in-modal')).toBeNull();
    expect(JSON.parse(await AsyncStorage.getItem('lf_profile')).username).toBe('Player');
  });

  it('signs in with email and password', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.type(screen.getByTestId('sign-in-email'), 'ada@example.com');
    await user.type(screen.getByTestId('sign-in-password'), 'secret');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByLabelText('Ada')).toBeOnTheScreen();
  });

  it('sends a reset and leaves the learner a guest', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByTestId('sign-in-reset-mode'));
    await user.type(screen.getByTestId('sign-in-email'), 'ada@example.com');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Check your email.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();
  });

  it('shows a safe message for a wrong password and clears the password on close', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.type(screen.getByTestId('sign-in-password'), 'nope');
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('That email or password is not right.')).toBeOnTheScreen();
    expect(screen.getByTestId('sign-in-password').props.value).toBe('');
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();

    await user.type(screen.getByTestId('sign-in-password'), 'typed');
    await user.press(screen.getByTestId('sign-in-backdrop'));
    expect(screen.queryByTestId('sign-in-modal')).toBeNull();
    await user.press(screen.getByLabelText('Sign in'));
    expect(screen.getByTestId('sign-in-password').props.value).toBe('');

    await user.type(screen.getByTestId('sign-in-password'), 'typed');
    const openModal = screen.UNSAFE_getAllByType(Modal).find((node) => node.props.visible);
    await act(async () => {
      openModal.props.onRequestClose();
    });
    expect(screen.queryByTestId('sign-in-modal')).toBeNull();
    await user.press(screen.getByLabelText('Sign in'));
    expect(screen.getByTestId('sign-in-password').props.value).toBe('');
    await user.press(screen.getByLabelText('Close sign in'));

    mockConnector.failure = 'duplicate';
    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByTestId('sign-in-create-mode'));
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('That email is already registered.')).toBeOnTheScreen();
    expect(screen.getByTestId('sign-in-modal')).toBeOnTheScreen();

    mockConnector.failure = 'network';
    await user.press(screen.getByTestId('sign-in-email-mode'));
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('The network failed. Try again.')).toBeOnTheScreen();

    mockConnector.failure = 'unavailable';
    await user.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Sign-in is unavailable.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();
  });

  it('continues with Google and shows the display name', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByTestId('sign-in-google'));
    expect(await screen.findByLabelText('Ada')).toBeOnTheScreen();
    expect(mockConnector.provider).toBe('google');
    expect(JSON.parse(await AsyncStorage.getItem('lf_profile')).username).toBe('Player');
  });

  it('continues with Facebook and shows the display name', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    expect(screen.getByTestId('sign-in-google')).toBeOnTheScreen();
    await user.press(screen.getByTestId('sign-in-facebook'));
    expect(await screen.findByLabelText('Ada')).toBeOnTheScreen();
    expect(mockConnector.provider).toBe('facebook');
    expect(JSON.parse(await AsyncStorage.getItem('lf_profile')).username).toBe('Player');
  });

  it('stays a guest when Facebook is cancelled', async () => {
    const user = setupUser();
    mockConnector.failure = 'cancel';
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByTestId('sign-in-facebook'));
    expect(screen.getByTestId('sign-in-modal')).toBeOnTheScreen();
    expect(screen.queryByTestId('sign-in-message')).toBeNull();
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();
  });

  it('stays a guest when Google is cancelled', async () => {
    const user = setupUser();
    mockConnector.failure = 'cancel';
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.press(screen.getByTestId('sign-in-google'));
    expect(screen.getByTestId('sign-in-modal')).toBeOnTheScreen();
    expect(screen.queryByTestId('sign-in-message')).toBeNull();
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();
  });

  it('signs out on this device and restores a stored identity on relaunch', async () => {
    const user = setupUser();
    await openHome();
    await user.press(screen.getByLabelText('Sign in'));
    await user.type(screen.getByTestId('sign-in-email'), 'ada@example.com');
    await user.type(screen.getByTestId('sign-in-password'), 'secret');
    await user.press(screen.getByTestId('sign-in-submit'));
    await screen.findByLabelText('Ada');

    await user.press(screen.getByLabelText('Ada'));
    await user.press(screen.getByTestId('sign-out'));
    expect(await screen.findByLabelText('Sign in')).toBeOnTheScreen();
    expect(mockConnector.signOutScope).toBe('local');

    mockConnector.identity = { id: 'learner-1', email: 'ada@example.com', displayName: 'Ada' };
    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
    expect(await screen.findByLabelText('Ada')).toBeOnTheScreen();
  });
});

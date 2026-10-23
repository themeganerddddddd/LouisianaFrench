import { act, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';
import { buildMailtoUrl } from '../../utils/bugReport';

const mockOpenEmail = jest.fn();
const mockCollectDeviceInfo = jest.fn();

jest.mock('../../utils/bugReport', () => {
  const actual = jest.requireActual('../../utils/bugReport');
  return {
    ...actual,
    openBugReportEmail: (...args) => mockOpenEmail(...args)
  };
});

jest.mock('../../utils/deviceInfo', () => ({
  collectDeviceInfo: (...args) => mockCollectDeviceInfo(...args)
}));

setupAppTests();

const DEVICE_INFO = {
  appVersion: '1.0.2',
  platform: 'android',
  osName: 'Android',
  osVersion: '14',
  osBuildId: 'UP1A.231005.007',
  brand: 'Google',
  model: 'sdk_gphone64_x86_64',
  deviceType: 'phone',
  language: 'cajun',
  screenName: 'Home',
  submittedAt: '2026-10-23T16:00:00.000Z'
};

describe('Home About Support mailto parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectDeviceInfo.mockReturnValue(DEVICE_INFO);
    mockOpenEmail.mockResolvedValue({ ok: true });
  });

  async function openSupportSheet(user) {
    await user.press(screen.getByLabelText('About menu'));
    await user.press(screen.getByTestId('about-menu-support'));
    expect(screen.queryByTestId('home-about-menu')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(await screen.findByText('Tell us what went wrong.')).toBeOnTheScreen();
  }

  it('opens the shared Report a bug sheet from Support after the About menu closes', async () => {
    const user = setupUser();
    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });

    await openSupportSheet(user);
    expect(screen.getByText('Tell us what went wrong.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Submit bug report')).toBeOnTheScreen();
  });

  it('Accept from Support attaches device info like Report a bug', async () => {
    const user = setupUser();
    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });

    await openSupportSheet(user);
    await user.type(screen.getByLabelText('Bug report name'), 'Camille');
    await user.type(screen.getByLabelText('Bug report email'), 'camille@example.com');
    await user.type(screen.getByLabelText('Bug report description'), 'Support menu parity check');
    await user.press(screen.getByLabelText('Submit bug report'));
    await user.press(screen.getByLabelText('Accept and send bug report'));

    await waitFor(() => {
      expect(mockCollectDeviceInfo).toHaveBeenCalledWith({
        language: 'cajun',
        screenName: 'Home'
      });
      expect(mockOpenEmail).toHaveBeenCalledWith({
        name: 'Camille',
        email: 'camille@example.com',
        description: 'Support menu parity check',
        deviceInfo: DEVICE_INFO
      });
    });

    const mailto = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Camille',
      email: 'camille@example.com',
      description: 'Support menu parity check',
      deviceInfo: DEVICE_INFO
    });
    const query = mailto.slice(mailto.indexOf('?') + 1);
    const params = Object.fromEntries(
      query.split('&').map((part) => {
        const [key, ...rest] = part.split('=');
        return [key, decodeURIComponent(rest.join('='))];
      })
    );

    expect(params.subject).toBe('[Louisiana Languages Bug] Support menu parity check');
    expect(params.body).toContain('## Device');
    expect(params.body).toContain('- Device: Google sdk_gphone64_x86_64');
    expect(params.body).toContain('- Screen: Home');
  });
});

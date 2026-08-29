import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert, TextInput } from 'react-native';

import BugReportButton from '../BugReportButton';
import BugReportFlow from '../BugReportFlow';

// ---------------------------------------------------------------------------
// Mocks for utility modules — matched to existing interfaces
// ---------------------------------------------------------------------------

const mockValidate = jest.fn();
const mockCollectDeviceInfo = jest.fn();
const mockOpenEmail = jest.fn();

jest.mock('../../utils/bugReport', () => ({
  validateBugReportForm: (...args) => mockValidate(...args),
  openBugReportEmail: (...args) => mockOpenEmail(...args)
}));

jest.mock('../../utils/deviceInfo', () => ({
  collectDeviceInfo: (...args) => mockCollectDeviceInfo(...args)
}));

const DEFAULT_DEVICE_INFO = Object.freeze({
  appVersion: '1.0.2',
  platform: 'ios',
  osName: 'iOS',
  osVersion: '17.4',
  osBuildId: '21E219',
  brand: 'Apple',
  model: 'iPhone 15',
  deviceType: 'phone',
  language: 'cajun',
  screenName: 'Home',
  submittedAt: '2026-07-28T12:00:00.000Z'
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getFlow(isVisible = true) {
  return render(
    <BugReportFlow
      visible={isVisible}
      onClose={jest.fn()}
      screenName="Home"
      language="cajun"
      accentColor="#2771CB"
    />
  );
}

/** Fill the form with valid data */
async function fillValidForm(user, getter) {
  const nameInput = getter.getByPlaceholderText('Your name');
  const emailInput = getter.getByPlaceholderText('you@example.com');
  const descInput = getter.getByPlaceholderText('Describe the bug or issue\u2026');

  await user.type(nameInput, 'Alex');
  await user.type(emailInput, 'alex@example.com');
  await user.type(descInput, 'Dictionary audio does not play on the third word');
}

// ---------------------------------------------------------------------------
// BugReportButton — a11y and open
// ---------------------------------------------------------------------------

describe('BugReportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with accessibilityLabel "Report a bug"', () => {
    render(
      <BugReportButton screenName="Home" language="cajun" accentColor="#2771CB" />
    );

    const button = screen.getByLabelText('Report a bug');
    expect(button).toBeOnTheScreen();
  });

  it('opens BugReportFlow when pressed', async () => {
    const user = userEvent.setup();
    render(
      <BugReportButton screenName="Home" language="cajun" accentColor="#2771CB" />
    );

    await user.press(screen.getByLabelText('Report a bug'));

    // Flow title should now be visible
    expect(await screen.findByText(/Tell us what went wrong/)).toBeOnTheScreen();
  });

  it('uses a deep Kouri-Vini green accent for kreole language', () => {
    render(
      <BugReportButton screenName="Advanced" language="kreole" />
    );

    const button = screen.getByLabelText('Report a bug');
    expect(button).toHaveStyle({ backgroundColor: '#065F3B' });
    expect(screen.getByTestId('bug-report-icon')).toBeOnTheScreen();
  });

  it('renders a text-only Home control without the exclamation icon', () => {
    render(
      <BugReportButton screenName="Home" language="cajun" appearance="text" />
    );
    expect(screen.getByText('Report a bug')).toBeOnTheScreen();
    expect(screen.queryByText('!')).toBeNull();
    expect(screen.getAllByLabelText('Report a bug')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// BugReportFlow — validation gate + focus
// ---------------------------------------------------------------------------

describe('BugReportFlow: validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows field errors and blocks consent when form is invalid', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({
      ok: false,
      errors: {
        name: 'Name is required.',
        email: 'Email is required.',
        description: 'Description is required.'
      }
    });

    getFlow();
    await user.press(screen.getByLabelText('Submit bug report'));

    expect(screen.getByText('Name is required.')).toBeOnTheScreen();
    expect(screen.getByText('Email is required.')).toBeOnTheScreen();
    expect(screen.getByText('Description is required.')).toBeOnTheScreen();
    expect(screen.queryByText('Share device info?')).toBeNull();
    expect(mockCollectDeviceInfo).not.toHaveBeenCalled();
  });

  it('focuses a TextInput when form is invalid (Name path)', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({
      ok: false,
      errors: { name: 'Name is required.' }
    });

    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
    getFlow();
    focusSpy.mockClear();

    await user.press(screen.getByLabelText('Submit bug report'));

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });
    focusSpy.mockRestore();
  });

  it('moves to consent when validation passes', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });

    getFlow();
    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));

    expect(screen.getByText('Share device info?')).toBeOnTheScreen();
    expect(mockCollectDeviceInfo).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// BugReportFlow — consent
// ---------------------------------------------------------------------------

describe('BugReportFlow: consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists all six device fields exactly', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });

    getFlow();
    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));

    expect(screen.getByText('Phone make and model')).toBeOnTheScreen();
    expect(screen.getByText('Operating system')).toBeOnTheScreen();
    expect(screen.getByText('OS build ID')).toBeOnTheScreen();
    expect(screen.getByText('App version')).toBeOnTheScreen();
    expect(screen.getByText('Device type')).toBeOnTheScreen();
    expect(screen.getByText('App context')).toBeOnTheScreen();
  });
});

// ---------------------------------------------------------------------------
// BugReportFlow — decline / cancel no side effects
// ---------------------------------------------------------------------------

describe('BugReportFlow: decline / cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onClose and does not collect on Cancel from form', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <BugReportFlow
        visible
        onClose={onClose}
        screenName="Home"
        language="cajun"
        accentColor="#2771CB"
      />
    );

    await user.press(screen.getByLabelText('Cancel bug report'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockCollectDeviceInfo).not.toHaveBeenCalled();
    expect(mockOpenEmail).not.toHaveBeenCalled();
  });

  it('calls onClose and does not collect on Decline from consent', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });

    render(
      <BugReportFlow
        visible
        onClose={onClose}
        screenName="Home"
        language="cajun"
        accentColor="#2771CB"
      />
    );

    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));

    await user.press(screen.getByLabelText('Decline consent and close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockCollectDeviceInfo).not.toHaveBeenCalled();
    expect(mockOpenEmail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// BugReportFlow — accept
// ---------------------------------------------------------------------------

describe('BugReportFlow: accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectDeviceInfo.mockReturnValue(DEFAULT_DEVICE_INFO);
    mockOpenEmail.mockResolvedValue({ ok: true });
  });

  it('calls collectDeviceInfo with language and screenName', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });

    render(
      <BugReportFlow
        visible
        onClose={jest.fn()}
        screenName="Dictionary"
        language="kreole"
        accentColor="#6D28D9"
      />
    );

    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));
    await user.press(screen.getByLabelText('Accept and send bug report'));

    await waitFor(() => {
      expect(mockCollectDeviceInfo).toHaveBeenCalledWith({
        language: 'kreole',
        screenName: 'Dictionary'
      });
    });
  });

  it('calls openBugReportEmail with trimmed form values and device info', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });

    render(
      <BugReportFlow
        visible
        onClose={jest.fn()}
        screenName="Home"
        language="cajun"
        accentColor="#2771CB"
      />
    );

    const nameInput = screen.getByPlaceholderText('Your name');
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const descInput = screen.getByPlaceholderText('Describe the bug or issue\u2026');
    await user.type(nameInput, '  Alex  ');
    await user.type(emailInput, '  alex@example.com  ');
    await user.type(descInput, '  Bug description  ');

    await user.press(screen.getByLabelText('Submit bug report'));
    await user.press(screen.getByLabelText('Accept and send bug report'));

    await waitFor(() => {
      expect(mockOpenEmail).toHaveBeenCalledWith({
        name: 'Alex',
        email: 'alex@example.com',
        description: 'Bug description',
        deviceInfo: DEFAULT_DEVICE_INFO
      });
    });
  });

  it('shows confirmation on success', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });
    mockOpenEmail.mockResolvedValue({ ok: true });

    getFlow();
    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));
    await user.press(screen.getByLabelText('Accept and send bug report'));

    await waitFor(() => {
      expect(screen.getByText('Merci! Report ready')).toBeOnTheScreen();
    });
    expect(
      screen.getByLabelText('Pelican with Mardi Gras umbrella')
    ).toBeOnTheScreen();
  });

  it('shows Alert and no confirmation when openBugReportEmail returns ok false', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });
    mockOpenEmail.mockResolvedValue({ ok: false, error: 'No mail app available.' });

    getFlow();
    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));
    await user.press(screen.getByLabelText('Accept and send bug report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to open email',
        expect.stringContaining('No mail app')
      );
    });

    expect(screen.queryByText('Merci! Report ready')).toBeNull();
    alertSpy.mockRestore();
  });

  it('shows Alert and no confirmation on unexpected throw', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });
    mockOpenEmail.mockRejectedValue(new Error('Network error'));

    getFlow();
    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));
    await user.press(screen.getByLabelText('Accept and send bug report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to open email',
        expect.stringContaining('Something went wrong')
      );
    });

    expect(screen.queryByText('Merci! Report ready')).toBeNull();
    alertSpy.mockRestore();
  });

  it('prevents duplicate submission with synchronous ref guard', async () => {
    const user = userEvent.setup();
    mockValidate.mockReturnValue({ ok: true, errors: {} });
    mockOpenEmail.mockImplementation(() => new Promise(() => {}));

    getFlow();
    await fillValidForm(user, screen);
    await user.press(screen.getByLabelText('Submit bug report'));

    await user.press(screen.getByLabelText('Accept and send bug report'));
    // Wait for submitting state to be reflected in UI (ref guard is already set)
    await waitFor(() => {
      expect(screen.getByLabelText('Accept and send bug report')).toBeDisabled();
    });

    // Second press via synchronous fireEvent — must be blocked by ref guard
    fireEvent.press(screen.getByLabelText('Accept and send bug report'));

    expect(mockCollectDeviceInfo).toHaveBeenCalledTimes(1);
    expect(mockOpenEmail).toHaveBeenCalledTimes(1);
  });
});

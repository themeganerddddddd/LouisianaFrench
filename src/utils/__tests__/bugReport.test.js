import Constants from 'expo-constants';
import { Linking } from 'react-native';

import {
  buildMailtoUrl,
  getBugReportEmail,
  openBugReportEmail,
  validateBugReportForm
} from '../bugReport';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      bugReportEmail: 'bugs@louisianafrench.example'
    }
  }
}));

beforeEach(() => {
  Constants.expoConfig = {
    extra: {
      bugReportEmail: 'bugs@louisianafrench.example'
    }
  };
});

describe('validateBugReportForm', () => {
  it('accepts a complete valid form', () => {
    expect(
      validateBugReportForm({
        name: 'Alex',
        email: 'alex@example.com',
        description: 'Audio button does nothing'
      })
    ).toEqual({ ok: true, errors: {} });
  });

  it('requires non-empty trimmed name, email, and description', () => {
    expect(
      validateBugReportForm({
        name: '   ',
        email: '  ',
        description: '\n\t'
      })
    ).toEqual({
      ok: false,
      errors: {
        name: 'Name is required.',
        email: 'Email is required.',
        description: 'Description is required.'
      }
    });
  });

  it('rejects empty name when other fields are valid', () => {
    const result = validateBugReportForm({
      name: '',
      email: 'alex@example.com',
      description: 'Something broke'
    });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'Name is required.' }
    });
  });

  it('rejects whitespace-only name when other fields are valid', () => {
    const result = validateBugReportForm({
      name: '   ',
      email: 'alex@example.com',
      description: 'Something broke'
    });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'Name is required.' }
    });
  });

  it('rejects empty email when other fields are valid', () => {
    const result = validateBugReportForm({
      name: 'Alex',
      email: '',
      description: 'Something broke'
    });
    expect(result).toEqual({
      ok: false,
      errors: { email: 'Email is required.' }
    });
  });

  it('rejects whitespace-only email when other fields are valid', () => {
    const result = validateBugReportForm({
      name: 'Alex',
      email: '   ',
      description: 'Something broke'
    });
    expect(result).toEqual({
      ok: false,
      errors: { email: 'Email is required.' }
    });
  });

  it('rejects empty description when other fields are valid', () => {
    const result = validateBugReportForm({
      name: 'Alex',
      email: 'alex@example.com',
      description: ''
    });
    expect(result).toEqual({
      ok: false,
      errors: { description: 'Description is required.' }
    });
  });

  it('rejects whitespace-only description when other fields are valid', () => {
    const result = validateBugReportForm({
      name: 'Alex',
      email: 'alex@example.com',
      description: '   '
    });
    expect(result).toEqual({
      ok: false,
      errors: { description: 'Description is required.' }
    });
  });

  it('rejects an invalid email format when email is present', () => {
    const result = validateBugReportForm({
      name: 'Alex',
      email: 'not-an-email',
      description: 'Something broke'
    });

    expect(result.ok).toBe(false);
    expect(result.errors.email).toBe('Enter a valid email address.');
    expect(result.errors.name).toBeUndefined();
    expect(result.errors.description).toBeUndefined();
  });
});

describe('getBugReportEmail', () => {
  it('reads the configured bug report inbox', () => {
    expect(getBugReportEmail()).toBe('bugs@louisianafrench.example');
  });
});

describe('buildMailtoUrl', () => {
  const deviceInfo = {
    appVersion: '1.0.2',
    platform: 'android',
    osName: 'Android',
    osVersion: '14',
    osBuildId: 'UP1A.231005.007',
    brand: 'Samsung',
    model: 'Galaxy S23',
    deviceType: 'phone',
    language: 'cajun',
    screenName: 'Home',
    submittedAt: '2026-07-26T20:15:00.000Z'
  };

  function parseMailtoParams(url) {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return {};
    const params = {};
    url.slice(qIndex + 1).split('&').forEach(pair => {
      const eq = pair.indexOf('=');
      const key = decodeURIComponent(pair.slice(0, eq));
      const val = decodeURIComponent(pair.slice(eq + 1));
      params[key] = val;
    });
    return params;
  }

  it('builds a mailto URL with contact and device details', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Dictionary audio fails on the third word',
      deviceInfo
    });

    expect(url.startsWith('mailto:bugs@louisianafrench.example?')).toBe(true);

    const params = parseMailtoParams(url);

    expect(params.subject).toBe(
      '[Louisiana Languages Bug] Dictionary audio fails on the third word'
    );

    const body = params.body;
    expect(body).toContain('Name: Alex');
    expect(body).toContain('Reply-to email: alex@example.com');
    expect(body).toContain('## What happened');
    expect(body).toContain('Dictionary audio fails on the third word');
    expect(body).toContain('App version: 1.0.2');
    expect(body).toContain('Platform: android');
    expect(body).toContain('OS: Android 14');
    expect(body).toContain('Build ID: UP1A.231005.007');
    expect(body).toContain('Device: Samsung Galaxy S23');
    expect(body).toContain('Type: phone');
    expect(body).toContain('Language: cajun');
    expect(body).toContain('Screen: Home');
    expect(body).toContain('Submitted: 2026-07-26T20:15:00.000Z');
  });

  it('truncates long descriptions in the subject', () => {
    const long = 'x'.repeat(80);
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: long,
      deviceInfo
    });
    const params = parseMailtoParams(url);
    expect(params.subject).toBe(`[Louisiana Languages Bug] ${'x'.repeat(60)}`);
  });

  it('encodes spaces as %20 not + in subject and body', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'test',
      deviceInfo: { ...deviceInfo, submittedAt: '2026-01-01T00:00:00.000Z' }
    });
    const qIndex = url.indexOf('?');
    const query = qIndex === -1 ? '' : url.slice(qIndex + 1);
    const subjectParam = query.split('&').find(p => p.startsWith('subject='));
    expect(subjectParam).toContain('%20');
    expect(subjectParam).not.toContain('+');
    const bodyParam = query.split('&').find(p => p.startsWith('body='));
    expect(bodyParam).toContain('%20');
    expect(bodyParam).not.toContain('+');
  });

  it('encodes plus sign in recipient local part', () => {
    const url = buildMailtoUrl({
      to: 'bugs+test@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'test',
      deviceInfo
    });
    const mailtoPart = url.slice(0, url.indexOf('?'));
    expect(mailtoPart).toBe('mailto:bugs%2Btest@louisianafrench.example');
  });

  it('preserves @ in recipient', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'test',
      deviceInfo
    });
    const mailtoPart = url.slice(0, url.indexOf('?'));
    expect(mailtoPart).toBe('mailto:bugs@louisianafrench.example');
  });

  it('encodes reserved characters in subject and body', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'test & why',
      deviceInfo: { ...deviceInfo, submittedAt: '2026-01-01T00:00:00.000Z' }
    });
    const params = parseMailtoParams(url);
    expect(params.body).toContain('test & why');
  });

  it('encodes unicode and accented text', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'François',
      email: 'francois@example.com',
      description: 'Écran cassé — problème №2',
      deviceInfo: { ...deviceInfo, submittedAt: '2026-01-01T00:00:00.000Z' }
    });
    const params = parseMailtoParams(url);
    expect(params.body).toContain('François');
    expect(params.body).toContain('Écran cassé — problème №2');
    expect(params.subject).toContain('Écran cassé — problème №2');
  });

  it('encodes line breaks in body', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'line1\nline2',
      deviceInfo: { ...deviceInfo, submittedAt: '2026-01-01T00:00:00.000Z' }
    });
    const bodyParam = url.slice(url.indexOf('body=') + 5);
    expect(bodyParam).toContain('%0A');
    const params = parseMailtoParams(url);
    expect(params.body).toContain('line1\nline2');
  });

  it('uses raw %20 encoding not + for spaces', () => {
    const url = buildMailtoUrl({
      to: 'bugs@louisianafrench.example',
      name: 'Alex',
      email: 'alex@example.com',
      description: 'hello world',
      deviceInfo: { ...deviceInfo, submittedAt: '2026-01-01T00:00:00.000Z' }
    });
    const query = url.slice(url.indexOf('?') + 1);
    expect(query).not.toContain('+');
    const params = parseMailtoParams(url);
    expect(params.subject).toContain('hello world');
  });
});

describe('openBugReportEmail', () => {
  let canOpenURL;
  let openURL;

  beforeEach(() => {
    canOpenURL = jest.fn(async () => true);
    openURL = jest.fn(async () => undefined);
    Linking.canOpenURL = canOpenURL;
    Linking.openURL = openURL;
    Constants.expoConfig = {
      extra: {
        bugReportEmail: 'bugs@louisianafrench.example'
      }
    };
  });

  const deviceInfo = {
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
    submittedAt: '2026-07-26T20:15:00.000Z'
  };

  it('opens the device mail app with the composed mailto URL', async () => {
    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash on launch',
      deviceInfo
    });

    expect(result).toEqual({ ok: true });
    expect(canOpenURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledTimes(1);
    const opened = openURL.mock.calls[0][0];
    expect(opened.startsWith('mailto:bugs@louisianafrench.example?')).toBe(true);
  });

  it('returns error and does not call openURL when canOpenURL resolves false', async () => {
    canOpenURL.mockResolvedValue(false);

    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash on launch',
      deviceInfo
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no email app/i);
    expect(result.error).toContain('bugs@louisianafrench.example');
    expect(canOpenURL).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns error and does not call openURL when canOpenURL rejects', async () => {
    canOpenURL.mockRejectedValue(new Error('Linking not supported'));

    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash on launch',
      deviceInfo
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('bugs@louisianafrench.example');
    expect(canOpenURL).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns error when openURL rejects', async () => {
    openURL.mockRejectedValue(new Error('Failed to open'));

    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash on launch',
      deviceInfo
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('bugs@louisianafrench.example');
    expect(canOpenURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledTimes(1);
  });

  it('returns error for empty config', async () => {
    Constants.expoConfig.extra.bugReportEmail = '';

    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash',
      deviceInfo
    });

    expect(result).toEqual({
      ok: false,
      error: 'Bug report email is not configured correctly.'
    });
    expect(canOpenURL).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns error for whitespace-only config', async () => {
    Constants.expoConfig.extra.bugReportEmail = '   ';

    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash',
      deviceInfo
    });

    expect(result).toEqual({
      ok: false,
      error: 'Bug report email is not configured correctly.'
    });
    expect(canOpenURL).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns error for malformed config', async () => {
    Constants.expoConfig.extra.bugReportEmail = 'not-an-email';

    const result = await openBugReportEmail({
      name: 'Alex',
      email: 'alex@example.com',
      description: 'Crash',
      deviceInfo
    });

    expect(result).toEqual({
      ok: false,
      error: 'Bug report email is not configured correctly.'
    });
    expect(canOpenURL).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });
});

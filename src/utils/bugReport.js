import Constants from 'expo-constants';
import { Linking } from 'react-native';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getBugReportEmail() {
  return Constants.expoConfig?.extra?.bugReportEmail || '';
}

export function validateBugReportForm({ name, email, description }) {
  const errors = {};
  const trimmedName = String(name ?? '').trim();
  const trimmedEmail = String(email ?? '').trim();
  const trimmedDescription = String(description ?? '').trim();

  if (!trimmedName) {
    errors.name = 'Name is required.';
  }

  if (!trimmedEmail) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!trimmedDescription) {
    errors.description = 'Description is required.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function buildMailtoUrl({ to, name, email, description, deviceInfo }) {
  const subjectBase = String(description || '').trim();
  const subject = `[Louisiana Languages Bug] ${subjectBase.slice(0, 60)}`;

  const body = [
    `Name: ${name}`,
    `Reply-to email: ${email}`,
    '',
    '## What happened',
    description,
    '',
    '## Device',
    `- App version: ${deviceInfo.appVersion}`,
    `- Platform: ${deviceInfo.platform}`,
    `- OS: ${deviceInfo.osName} ${deviceInfo.osVersion}`,
    `- Build ID: ${deviceInfo.osBuildId}`,
    `- Device: ${deviceInfo.brand} ${deviceInfo.model}`,
    `- Type: ${deviceInfo.deviceType}`,
    `- Language: ${deviceInfo.language}`,
    `- Screen: ${deviceInfo.screenName}`,
    `- Submitted: ${deviceInfo.submittedAt}`
  ].join('\n');

  const atIndex = to.lastIndexOf('@');
  const encodedTo = atIndex === -1
    ? encodeURIComponent(to)
    : encodeURIComponent(to.slice(0, atIndex)) + to.slice(atIndex);

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
}

export async function openBugReportEmail({ name, email, description, deviceInfo }) {
  const to = getBugReportEmail();
  const trimmedTo = to.trim();

  if (!trimmedTo || !EMAIL_PATTERN.test(trimmedTo)) {
    return { ok: false, error: 'Bug report email is not configured correctly.' };
  }

  const url = buildMailtoUrl({ to: trimmedTo, name, email, description, deviceInfo });

  let canOpen;
  try {
    canOpen = await Linking.canOpenURL(url);
  } catch {
    return {
      ok: false,
      error: `Unable to open email app. Please email ${trimmedTo} directly.`
    };
  }

  if (!canOpen) {
    return {
      ok: false,
      error: `No email app is available. Please email ${trimmedTo} directly.`
    };
  }

  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: `Failed to open email app. Please email ${trimmedTo} directly.`
    };
  }
}

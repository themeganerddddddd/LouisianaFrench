// Repro tests for the audit streak bug (storage.js recordStudyAndXp, diffDays math).
// FAIL on main at 549d4d0 on purpose. US Central time: DST starts 2:00 AM Sun Mar 14, 2027,
// so local midnight Sun -> Mon is 23 hours, and Sat -> Mon is 47 hours.
// `Math.floor((today - lastDay) / 86400000)` turns those into 0 and 1 days.
//
// Run with a US Central clock, e.g.  TZ=America/Chicago npx jest src/utils/__tests__/repro.streakDst.test.js
// (Jest sandboxes process.env, so the test cannot switch the timezone itself. Under
// any other TZ every test here fails on the timezone guard instead of passing falsely.)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordStudyAndXp } from '../storage';

const sat = () => new Date(2027, 2, 13, 9, 0, 0); // Sat Mar 13, 2027 9:00 CST
const sun = () => new Date(2027, 2, 14, 9, 0, 0); // Sun Mar 14, 2027 9:00 CDT
const mon = () => new Date(2027, 2, 15, 9, 0, 0); // Mon Mar 15, 2027 9:00 CDT

beforeEach(async () => {
  if (sat().getTimezoneOffset() !== 360 || sun().getTimezoneOffset() !== 300) {
    throw new Error('Run this file with TZ=America/Chicago (needs the Mar 14, 2027 US DST change).');
  }
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

describe('repro audit: streak across the Mar 14, 2027 DST change', () => {
  it('is running in a US timezone with DST (sanity check)', () => {
    expect(sat().getTimezoneOffset()).toBe(360);
    expect(sun().getTimezoneOffset()).toBe(300);
    expect(new Date(2027, 2, 15) - new Date(2027, 2, 14)).toBe(23 * 3600000);
  });

  it('grows the streak when the learner studies Sunday Mar 14 then Monday Mar 15', async () => {
    jest.setSystemTime(sun());
    await recordStudyAndXp('cajun', 10);

    jest.setSystemTime(mon());
    const updated = await recordStudyAndXp('cajun', 10);

    // main: 23h / 24h floors to 0 days, so the streak stays at 1.
    expect(updated.streak).toBe(2);
  });

  it('resets the streak when the learner skips Sunday and studies Monday', async () => {
    jest.setSystemTime(sat());
    await recordStudyAndXp('cajun', 10);

    jest.setSystemTime(mon());
    const updated = await recordStudyAndXp('cajun', 10);

    // main: 47h / 24h floors to 1 day, so the streak grows to 2 instead of resetting.
    expect(updated.streak).toBe(1);
  });
});

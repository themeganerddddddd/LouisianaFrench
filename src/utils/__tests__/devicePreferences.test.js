import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDefaultLanguage,
  setDefaultLanguage,
  hasSelectedLanguage,
  markLanguageSelected,
  isPrefaceRead,
  markPrefaceRead
} from '../devicePreferences';

// Characterizes Device Preferences against the real AsyncStorage jest mock.

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Language selection', () => {
  it('defaults to no selected Language', async () => {
    expect(await getDefaultLanguage()).toBeNull();
    expect(await hasSelectedLanguage()).toBe(false);
  });

  it('persists the selected Language and selection flag', async () => {
    await setDefaultLanguage('kreole');
    await markLanguageSelected();

    expect(await getDefaultLanguage()).toBe('kreole');
    expect(await hasSelectedLanguage()).toBe(true);
  });
});

describe('Preface read tracking', () => {
  it('returns false for an unmarked id', async () => {
    expect(await isPrefaceRead('cajun:u03')).toBe(false);
  });

  it('returns true after markPrefaceRead', async () => {
    await markPrefaceRead('cajun:u03');
    expect(await isPrefaceRead('cajun:u03')).toBe(true);
  });

  it('treats different ids independently', async () => {
    await markPrefaceRead('cajun:u03');
    expect(await isPrefaceRead('cajun:u03')).toBe(true);
    expect(await isPrefaceRead('kreole:u01')).toBe(false);
  });

  it('persists the read state across calls', async () => {
    await markPrefaceRead('cajun:u03');
    await markPrefaceRead('kreole:u01');

    expect(await isPrefaceRead('cajun:u03')).toBe(true);
    expect(await isPrefaceRead('kreole:u01')).toBe(true);
    expect(await isPrefaceRead('kreole:u02')).toBe(false);
  });
});

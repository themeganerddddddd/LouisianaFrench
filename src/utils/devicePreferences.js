import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  DEFAULT_LANGUAGE: 'lf_default_language',
  HAS_SELECTED_LANGUAGE: 'lf_has_selected_language',
  PREFACE_READ: 'lf_preface_read',
  INFO_BIRD_SEEN: 'lf_info_bird_seen',
  INFO_CONTEXT_SEEN: 'lf_info_context_seen',
  ACCOUNT_INTRO_SEEN: 'lf_account_intro_seen'
};

export async function getDefaultLanguage() {
  const raw = await AsyncStorage.getItem(KEYS.DEFAULT_LANGUAGE);
  return raw || null;
}

export async function setDefaultLanguage(language) {
  await AsyncStorage.setItem(KEYS.DEFAULT_LANGUAGE, language);
}

export async function hasSelectedLanguage() {
  const val = await AsyncStorage.getItem(KEYS.HAS_SELECTED_LANGUAGE);
  return val === 'true';
}

export async function markLanguageSelected() {
  await AsyncStorage.setItem(KEYS.HAS_SELECTED_LANGUAGE, 'true');
}

export async function hasSeenAccountIntro() {
  return (await AsyncStorage.getItem(KEYS.ACCOUNT_INTRO_SEEN)) === 'true';
}

export async function markAccountIntroSeen() {
  await AsyncStorage.setItem(KEYS.ACCOUNT_INTRO_SEEN, 'true');
}

export async function hasSeenInfoBird() {
  return (await AsyncStorage.getItem(KEYS.INFO_BIRD_SEEN)) === 'true';
}

export async function markInfoBirdSeen() {
  await AsyncStorage.setItem(KEYS.INFO_BIRD_SEEN, 'true');
}

export async function hasSeenInfoContext(contextKey) {
  if (!contextKey) return true;

  const raw = await AsyncStorage.getItem(KEYS.INFO_CONTEXT_SEEN);
  const data = raw ? JSON.parse(raw) : {};

  return !!data[contextKey];
}

export async function markInfoContextSeen(contextKey) {
  if (!contextKey) return;

  const raw = await AsyncStorage.getItem(KEYS.INFO_CONTEXT_SEEN);
  const data = raw ? JSON.parse(raw) : {};

  data[contextKey] = true;

  await AsyncStorage.setItem(KEYS.INFO_CONTEXT_SEEN, JSON.stringify(data));
}

export async function isPrefaceRead(prefaceId) {
  const raw = await AsyncStorage.getItem(KEYS.PREFACE_READ);

  const data = raw ? JSON.parse(raw) : {};

  return !!data[prefaceId];
}

export async function markPrefaceRead(prefaceId) {
  const raw = await AsyncStorage.getItem(KEYS.PREFACE_READ);

  const data = raw ? JSON.parse(raw) : {};

  data[prefaceId] = true;

  await AsyncStorage.setItem(KEYS.PREFACE_READ, JSON.stringify(data));
}

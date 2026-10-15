import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { createSessionStore } from '../sessionStore';

function memorySecureStore() {
  const items = new Map();
  return {
    items,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    setItemAsync: jest.fn(async (key, value, options) => {
      items.set(key, { value, options });
    }),
    getItemAsync: jest.fn(async (key) => items.get(key)?.value ?? null),
    deleteItemAsync: jest.fn(async (key) => {
      items.delete(key);
    })
  };
}

function memoryWebStorage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key)
  };
}

const SESSION = JSON.stringify({
  access_token: 'access-token-value',
  refresh_token: 'refresh-token-value'
});

describe('session store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('uses a new keystore key on every save and keeps tokens out of plaintext storage', async () => {
    const secureStore = memorySecureStore();
    const store = createSessionStore({ platform: 'ios', secureStore });

    await store.setItem('session', SESSION);
    await store.setItem('session', SESSION);

    const [first, second] = secureStore.setItemAsync.mock.calls;
    expect(first[1]).not.toEqual(second[1]);
    expect(first[2]).toEqual({
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });

    const stored = await AsyncStorage.getItem('session');
    expect(stored).not.toContain('access-token-value');
    expect(stored).not.toContain('refresh-token-value');
    expect(stored).not.toContain('password');
    expect(await store.getItem('session')).toBe(SESSION);
  });

  it('keeps the web session in origin storage instead of the native keystore', async () => {
    const secureStore = memorySecureStore();
    const webStorage = memoryWebStorage();
    const store = createSessionStore({
      platform: 'web',
      secureStore,
      webStorage
    });

    await store.setItem('session', SESSION);

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(webStorage.items.get('session')).toBe(SESSION);
    expect(webStorage.items.get('session')).not.toContain('password');
    expect(await store.getItem('session')).toBe(SESSION);
  });
});

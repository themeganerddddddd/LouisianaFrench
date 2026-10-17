import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYCHAIN = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
};

function randomKey() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function createSessionStore({
  platform = Platform.OS,
  asyncStorage = AsyncStorage,
  secureStore = SecureStore,
  webStorage = globalThis.localStorage,
  randomBytes = randomKey
} = {}) {
  const onWeb = platform === 'web';

  return {
    async getItem(key) {
      if (onWeb) {
        return webStorage.getItem(key);
      }

      const encrypted = await asyncStorage.getItem(key);
      if (!encrypted) {
        return encrypted;
      }

      const encryptionKeyHex = await secureStore.getItemAsync(key);
      if (!encryptionKeyHex) {
        return null;
      }

      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(encryptionKeyHex),
        new aesjs.Counter(1)
      );
      return aesjs.utils.utf8.fromBytes(
        cipher.decrypt(aesjs.utils.hex.toBytes(encrypted))
      );
    },

    async setItem(key, value) {
      if (onWeb) {
        webStorage.setItem(key, value);
        return;
      }

      const encryptionKey = randomBytes();
      const cipher = new aesjs.ModeOfOperation.ctr(
        encryptionKey,
        new aesjs.Counter(1)
      );
      const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

      await secureStore.setItemAsync(
        key,
        aesjs.utils.hex.fromBytes(encryptionKey),
        KEYCHAIN
      );
      await asyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
    },

    async removeItem(key) {
      if (onWeb) {
        webStorage.removeItem(key);
        return;
      }

      await asyncStorage.removeItem(key);
      await secureStore.deleteItemAsync(key);
    }
  };
}

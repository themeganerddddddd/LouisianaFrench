import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';

const cryptoObject = globalThis.crypto ?? {};
if (!globalThis.crypto) {
  globalThis.crypto = cryptoObject;
}

if (typeof cryptoObject.subtle?.digest !== 'function') {
  cryptoObject.subtle = {
    ...(cryptoObject.subtle ?? {}),
    async digest(algorithm, data) {
      const name = typeof algorithm === 'string' ? algorithm : algorithm?.name;
      if (name !== 'SHA-256') {
        throw new Error(`Unsupported digest algorithm: ${name}`);
      }
      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    }
  };
}

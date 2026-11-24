import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';

import { installPkceCrypto } from './installPkceCrypto';

const cryptoObject = globalThis.crypto ?? {};
if (!globalThis.crypto) globalThis.crypto = cryptoObject;

installPkceCrypto(cryptoObject, (data) => ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data));

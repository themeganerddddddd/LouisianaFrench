# Where the Community identity secret lives

Research for [issue #150](https://github.com/themeganerddddddd/LouisianaFrench/issues/150), answering a decision on the [Accountless community spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/147). Primary sources only. No product implementation.

**Question:** How can a Nostr secret key (`nsec`) be stored and backed up on iOS, Android, and Expo web, and what threat boundaries do the official docs state?

**Repo context (this tree, Expo SDK 54):** Learner Progress is stored with `@react-native-async-storage/async-storage`. `expo-secure-store` is not a dependency. That split matches [ADR 0002](../adr/0002-bundled-sqlite-catalog.md): Catalog is bundled SQLite; Learner Progress is a separate module backed by AsyncStorage.

## Short answer

On iOS and Android, `expo-secure-store` is the Expo module that encrypts small secrets and writes them into the platform secret stores: iOS Keychain (`kSecClassGenericPassword`) and Android `SharedPreferences` encrypted with the Android Keystore. It does not support web. On Expo web the documented origin-scoped stores are Web Storage (`localStorage` / `sessionStorage`) and IndexedDB; those isolate by origin, are not an OS secret store, and may be evicted. AsyncStorage is documented as unencrypted, so it is the wrong place for an `nsec`. Expo also says not to treat SecureStore as the only copy of irreplaceable data; a QR or copy backup means the secret leaves device-bound storage and enters a camera-visible image or the system clipboard.

## Native: `expo-secure-store` (SDK 54)

Source: [Expo SecureStore (v54)](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/).

Listed platforms: Android, iOS, tvOS, Expo Go. Web is not listed.

The module encrypts and stores small key-value pairs on the device. Each Expo project has a separate storage system and cannot read another Expo project's storage.

Intended payload: Expo's store-data guide calls it "intended for small values such as tokens, keys, and other secrets" ([Store data](https://docs.expo.dev/develop/user-interface/store-data/)). Large payloads can be rejected by the platform; historically some iOS releases refused values above roughly 2048 bytes. Expo does not enforce a limit; callers must handle native errors. A 32-byte Nostr secret encoded as a short string is well under that historical ceiling.

`isAvailableAsync()` "resolves `true` on Android and iOS only." The SDK 54 web native module is an empty object (`packages/expo-secure-store/src/ExpoSecureStore.web.ts` on the [sdk-54 branch](https://github.com/expo/expo/blob/sdk-54/packages/expo-secure-store/src/ExpoSecureStore.web.ts)), and `expo-module.config.json` lists only `apple` and `android`.

Expo's persistence warning, which applies directly to an `nsec` (losing it loses the Community identity):

> `expo-secure-store` is designed to provide a persistent data storage solution across app restarts and updates. However, it is important not to rely on it as a single source of truth for irreplaceable, critical data.

- **Android:** data is **not** preserved on app uninstallation.
- **iOS:** data **can persist across uninstallations** if the app is reinstalled with the same bundle ID, because of how iOS Keychain stores credentials. Expo says this is **not guaranteed** and "you should never rely on this implementation detail."

Data stored with `requireAuthentication: true` becomes inaccessible if the user's biometric set changes (for example adding a fingerprint).

### iOS backing store: Keychain

Expo: values are stored using [Keychain services](https://developer.apple.com/documentation/security/keychain_services) as `kSecClassGenericPassword`. iOS can set `kSecAttrAccessible`, which controls when the value may be fetched.

Apple's Keychain services overview: the API stores "small bits of user data in an encrypted database called a keychain" — passwords and other small secrets the user cares about, including cryptographic keys. Source: [Keychain services](https://developer.apple.com/documentation/security/keychain_services).

`kSecClassGenericPassword` is the generic-password item class. Source: [`kSecClassGenericPassword`](https://developer.apple.com/documentation/security/ksecclassgenericpassword).

### Android backing store: SharedPreferences + Keystore

Expo: values are stored in [`SharedPreferences`](https://developer.android.com/training/data-storage/shared-preferences), encrypted with [Android's Keystore system](https://developer.android.com/privacy-and-security/keystore).

Android SharedPreferences: a framework-managed file of key-value pairs that can be private to the app. Source: [Save key-value data](https://developer.android.com/training/data-storage/shared-preferences).

Android Keystore (the encryption side, not the plaintext `nsec` after the app reads it):

- Lets you "store cryptographic keys in a container to make them more difficult to extract from the device."
- Extraction prevention: key material "never enters the application process"; cryptographic work is done in a system process. If the app process is compromised, an attacker might *use* the app's keys but cannot extract their key material.
- Key material can be bound to secure hardware (TEE or StrongBox). If the OS is compromised or internal storage is readable, the attacker might still *use* those keys on the device but cannot extract them.

Source: [Android Keystore system](https://developer.android.com/privacy-and-security/keystore).

That boundary is about Keystore *keys*. Expo stores an arbitrary string (the `nsec`) encrypted *with* those keys. After a successful `getItemAsync`, the secret is in the app's process memory so it can sign events or be shown for backup. Keystore does not make the Nostr secret itself a non-exportable hardware key.

Android Keystore also lets an app require recent user authentication before a key may be used (`setUserAuthenticationRequired`). Expo maps `requireAuthentication` to that API on Android (API 23+) and to iOS `biometryCurrentSet`. On Android, authentication is required for all operations; on iOS, the user is prompted only when reading or updating an existing value, not when creating one.

### Android Auto Backup

[Android Auto Backup](https://developer.android.com/identity/data/autobackup) uploads app data (including SharedPreferences) to the user's Google Drive for apps targeting API 23+. On Android 9+ the backup is end-to-end encrypted with the device lock. Users and other apps on the device cannot read the backup blob. Apps that deal with sensitive information can set `android:allowBackup="false"`.

Expo's extra constraint: Auto Backup **must exclude** `expo-secure-store` SharedPreferences entries, because "it's impossible to decrypt them after restoring the backup — app's entries are deleted from the Android Key Store when the app is uninstalled." If the app has no custom backup XML, the module configures Auto Backup to ignore that data. That matches the Jetpack EncryptedSharedPreferences warning: the preference file should not be Auto Backed up, because on restore the encryption key is likely gone. Source: [EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences).

So Android cloud backup is **not** a restore path for the Community identity secret when stored through SecureStore.

## `WHEN_UNLOCKED` vs `AFTER_FIRST_UNLOCK`

Expo's `keychainAccessible` option is **iOS-only**. Default: `SecureStore.WHEN_UNLOCKED`. It maps to iOS `kSecAttrAccessible`. Source: [SecureStore options](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/#securestoreoptions) and Apple [Restricting keychain item accessibility](https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility).

Apple: choose the most restrictive option that still meets the app's needs. A device without a passcode is treated as always unlocked. `ThisDeviceOnly` variants restore onto the same device from a backup but **do not migrate** when restoring another device's backup.

In order of **decreasing** restrictiveness (Apple):

| Apple / Expo constant | When the item is readable | Backup migration |
| --- | --- | --- |
| `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` / `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` | Only while unlocked, and only if a passcode is set. Cannot store if there is no passcode. Removing the passcode **deletes** the item. Apple: use for extremely sensitive data you never want stored in iCloud. | This-device-only |
| `WHEN_UNLOCKED` / `kSecAttrAccessibleWhenUnlocked` (Expo **default**) | Only while the device is unlocked. Apple: recommended for foreground use; this is the Keychain default. | Migrates with encrypted backups |
| `WHEN_UNLOCKED_THIS_DEVICE_ONLY` | Same availability as When Unlocked | Does **not** migrate to a new device |
| `AFTER_FIRST_UNLOCK` / `kSecAttrAccessibleAfterFirstUnlock` | After the first unlock following a restart (or immediately if there is no passcode), then remains readable until the next restart — including while the device is later locked. Apple: recommended for **background** access. Expo: "may be useful if you need to access the item when the phone is locked." | Migrates with encrypted backups |
| `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` | Same availability as After First Unlock | Does **not** migrate to a new device |
| `ALWAYS` / `kSecAttrAccessibleAlways` | Readable whether or not the device is locked. Expo: "the least secure option," **deprecated**. Apple: "not recommended for application use." | Migrates with encrypted backups |

Threat-boundary reading for an `nsec` used while the learner is in the app (foreground):

- **`WHEN_UNLOCKED`** (default): the OS will not hand the item to the app from a locked device. After reboot, the item stays unavailable until the user unlocks. If the phone has no passcode, this protection is effectively off.
- **`AFTER_FIRST_UNLOCK`**: after one unlock, the secret stays available to the app even when the screen is locked, until the next reboot. That is a weaker lock-state boundary, in exchange for background access.
- **`WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`**: strongest documented lock + "not in iCloud / not off this device" combination; the secret dies if the learner removes the passcode.
- Expo `requireAuthentication` is a *second* gate (user presence / biometrics) on top of the accessibility class. Apple documents that "only while unlocked" may not be enough if the learner hands an unlocked device to someone else.

## Why AsyncStorage is the wrong place for an `nsec`

Learner Progress today is AsyncStorage (`src/utils/storage.js`). Expo's own store-data page describes Async Storage as "an asynchronous, unencrypted, persistent key-value storage" and "a good choice for storing data that does not need encryption, such as user preferences or app state." Source: [Store data](https://docs.expo.dev/develop/user-interface/store-data/).

The library's own docs say the same: "asynchronous, unencrypted, persistent, key-value storage." Source: [Async Storage 2.0](https://react-native-async-storage.github.io/2.0/).

Where those bytes sit (Async Storage 2.0, [Where data is stored](https://react-native-async-storage.github.io/2.0/advanced/Where-data-stored/)):

- **Android:** SQLite
- **iOS:** values ≤ 1024 characters in a shared `manifest.json`; larger values as individual files named by an MD5-hashed key
- **Web:** `window.localStorage`

None of those are Keychain or Keystore. On iOS the `nsec` would be a plaintext file in the app sandbox. On Android it would be a plaintext SQLite value. On web it would be origin `localStorage` (see below). That is acceptable for Learner Progress (lesson completion, review state, XP). It is not a secret store.

## Expo web: no SecureStore, origin storage only

`expo-secure-store` does not ship a web implementation. Community identity on Expo web therefore cannot use the iOS/Android secret stores through this module.

Documented origin-scoped stores:

### Web Storage (`localStorage` / `sessionStorage`)

[MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API):

- `sessionStorage` is partitioned by tab and origin; closing the tab destroys it.
- `localStorage` is partitioned by origin only and persists across browser restarts.
- Private / incognito windows treat `localStorage` like `sessionStorage`: data is deleted when the private window closes.
- Access from third-party iframes may be denied if third-party cookies are disabled.

[WHATWG HTML — Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) threat boundaries:

- Each site has its own storage area. `localStorage` is the storage area for the window's **origin**. A `SecurityError` is thrown for an opaque origin or when the user agent refuses persistence.
- **Sensitivity:** user agents should treat persistently stored data as potentially sensitive (emails, health records, and similar can live here). The spec does **not** require encryption at rest.
- **DNS spoofing:** without TLS, a host claiming to be a domain might not be. With TLS, "only the user, software working on behalf of the user, and other pages using TLS that have certificates identifying them as being from the same domain, can access their storage areas."
- **Cross-directory:** different authors sharing one hostname share one `localStorage` object. There is no path isolation.
- **Implementation risk:** hostile sites must not read or write another origin's store. "Strictly following the origin model … is important for user security."
- **Privacy / durability:** user agents may expire stored data; they may delete third-party storage when the last tab closes; users who clear cookies but not local storage leave a redundant identifier. That last point is also a durability warning: browser UI can wipe origin storage.

[MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria): Web Storage is typically capped around 5 MiB `localStorage` + 5 MiB `sessionStorage` per origin. Data is **best-effort** by default (can be deleted under storage pressure, or by the user). An origin may request persistent storage via `navigator.storage.persist()`; even then the user can still delete it from browser settings. Safari may proactively delete script-created data for origins with no interaction in the last seven days of browser use.

### IndexedDB

[MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API): a same-origin transactional store for structured data. "You can access stored data within a domain, you cannot access data across different domains."

[Indexed Database API 3.0](https://www.w3.org/TR/IndexedDB-3/#security) repeats the Web Storage model: origin (storage-key) partitioning, TLS against DNS spoofing, no pathname isolation on a shared host, treat stored data as potentially sensitive, user agents may expire it. Same conclusion as `localStorage`: isolation is by origin, not by OS secret storage, and not encryption-at-rest.

AsyncStorage on web *is* `window.localStorage`, so today's Learner Progress path on Expo web is already this origin store.

### What web origin storage is not

Official docs do not give web pages an equivalent of Keychain or Android Keystore. Same-origin policy keeps *other sites* out. It does not keep out:

- any other script on the same origin (including an XSS payload)
- the learner, DevTools, and browser storage UI
- software "working on behalf of the user" (WHATWG's phrase), which includes the browser and, on a compromised OS, other local software
- eviction, private-mode wipe, or "clear site data"

That is the documented reason community-on-web is a weaker secret-storage surface than iOS/Android SecureStore. The map already lists "whether community on web is first-class given weaker secret storage" as not yet specified.

## Backup (QR or copy): the secret leaves the device

Issue #147's product lock: a backup (QR or copy) is required before the first public post or Friend link. Expo's "do not rely on SecureStore as a single source of truth for irreplaceable, critical data" is the platform-side reason that lock exists. Android uninstall wipes SecureStore. iOS Keychain survival across reinstall is explicitly not a contract. Web origin storage can be evicted or cleared.

**Copy** writes the `nsec` to the **system clipboard**. [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API): the clipboard is "a data buffer belonging to the operating system … used for short-term data storage and/or data transfers between documents or applications." It is "usually implemented as an anonymous, temporary data buffer … that can be accessed from most or all programs within the environment." After copy, the secret is no longer confined to Keychain, Keystore-wrapped SharedPreferences, or origin storage; any program the OS lets read the clipboard can see it until something else overwrites the buffer.

**QR** encodes the same secret as pixels on screen (or in a saved image). Any camera or scanner with a view of that image obtains the `nsec`. That is not a Keychain/Keystore/Web Storage API claim; it is the meaning of an export backup.

Neither backup channel is encrypted by the storage APIs above. Once exported, threat boundaries are whatever the learner does with the copy (password manager, paper, screenshot roll, chat paste, and so on). The OS secret store no longer defines the boundary.

## Threat-boundary summary

| Surface | Confidentiality boundary the docs state | Durability the docs state | Fit for `nsec` |
| --- | --- | --- | --- |
| iOS SecureStore / Keychain | Encrypted keychain DB; access gated by `kSecAttrAccessible` (lock state, optional passcode, optional biometrics). Other apps do not share the item unless an access group is set. | Survives restart/update. Uninstall persistence is a Keychain quirk, **not a guarantee**. Encrypted backups may migrate the item unless `ThisDeviceOnly`. | Yes, as device-local store. Not the only copy. |
| Android SecureStore / Keystore-wrapped prefs | Values in app SharedPreferences, encrypted with Keystore keys that are hard to extract from the device. Compromised app process may *use* keys, not extract Keystore key material. The decrypted `nsec` is in app memory after read. | Wiped on uninstall. Auto Backup of the ciphertext is useless without the Keystore key; Expo excludes it. | Yes, as device-local store. Not the only copy. |
| Expo web SecureStore | Not available. | — | No. |
| Web Storage / IndexedDB | Same-origin only. No encryption-at-rest requirement. Other same-origin script, the user, and user-agent software can read it. | Best-effort; user-clearable; private mode wipes; possible proactive eviction (Safari). | Origin isolation only; weaker than native secret storage. |
| AsyncStorage | Unencrypted. Files / SQLite / `localStorage`. | Persistent for app state, not a secret store. | Wrong for `nsec`. Fine for Learner Progress. |
| QR or copy backup | Secret is in the open: screen pixels or OS clipboard (cross-application). | This *is* the durable extra copy. | Required by the product lock; it expands the threat boundary off the device. |

## Sources

- [Expo SecureStore SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/)
- [Expo Store data](https://docs.expo.dev/develop/user-interface/store-data/)
- [expo-secure-store sdk-54 source (web stub, module config)](https://github.com/expo/expo/tree/sdk-54/packages/expo-secure-store)
- [Apple Keychain services](https://developer.apple.com/documentation/security/keychain_services)
- [Apple Restricting keychain item accessibility](https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility)
- [Apple `kSecAttrAccessibleWhenUnlocked`](https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlocked)
- [Apple `kSecAttrAccessibleAfterFirstUnlock`](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlock)
- [Apple `kSecClassGenericPassword`](https://developer.apple.com/documentation/security/ksecclassgenericpassword)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
- [Android SharedPreferences](https://developer.android.com/training/data-storage/shared-preferences)
- [Android Auto Backup](https://developer.android.com/identity/data/autobackup)
- [Android EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)
- [Async Storage 2.0](https://react-native-async-storage.github.io/2.0/)
- [Async Storage: where data is stored](https://react-native-async-storage.github.io/2.0/advanced/Where-data-stored/)
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [WHATWG HTML Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Indexed Database API 3.0, security](https://www.w3.org/TR/IndexedDB-3/#security)
- [MDN Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)

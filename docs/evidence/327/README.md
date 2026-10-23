# Issue #327 — Expo SDK 58 smoke evidence

## Expo Go

- Emulator previously had Expo Go **57.0.9** (incompatible with SDK 58).
- Upgraded to Expo Go **58.0.5** via `npx expo-go download android 58`.
- APK cached at `~/.expo/android-apk-cache/Expo-Go-58.0.5.apk`.
- Connect with `adb reverse tcp:<port> tcp:<port>` and `exp://127.0.0.1:<port>` (10.0.2.2 was flaky after the upgrade).

## Smoke covered

- Language select → Louisiana French Home
- Dictionary open/back
- Cajun lesson: new word + practice answer (Bonjour! / Hello!)
- Fresh launch → Kouri-Vini Home
- Kouri-Vini lesson: start + continue / answer
- Back to Home

## Note

Expo Go only runs one major client at a time. With 58.0.5 installed, the main-branch SDK 57 harness on :8083 may need Expo Go 57 again until `main` upgrades.

# Evidence for #198 — Unit 5 LF cards/dog Audio swap

## Bug

Louisiana French Unit 5 Catalog keys were correct, but the mp3 **bodies** for `u05_w0010_lf` (On aime jouer aux cartes) and `u05_w0012_lf` (Mon chien aime pas d'être seul) were reversed. Reporter video: cards prompt played dog Audio.

## Fix

Swap the two bundled files under `assets/audio/cajun/`. Catalog / `audioManifest` keys unchanged.

## Proof

| Artifact | What it shows |
| --- | --- |
| `reporter-before-cards-plays-dog.mp4` | Reporter reproduction (cards Activity plays dog Audio) |
| `before-*-waveform.png` / `after-*-waveform.png` | Waveform lengths swap with the bodies (dog longer, cards shorter) |
| `transcripts/before-*.txt` / `after-*.txt` | Whisper tiny FR before/after: cards key speaks cards after the swap |
| `unit5-lf-audio-pairing.mp4` | After-fix pairing: play `u05_w0010_lf` then `u05_w0012_lf` with labeled titles |
| `dictionary-play-cards.png` | Dictionary search “play cards” → cards Word with Play audio |
| `dictionary-dog-alone.png` | Dictionary search “chien” → dog-alone Word with Play audio |

Automated: `src/data/__tests__/unit5LfAudioAssets.test.js` (Catalog Word→audioKey + SHA-256 of each body).

Dictionary grabs: Expo web against this branch (`http://127.0.0.1:8298`), Louisiana French → Dictionary. Emulator Expo Go was SDK 57 while the app is Expo 58, so web was used for the UI grabs; Audio pairing is proven by the mp4 + Whisper + hash test.

## Out of scope here

Maggie's unpublished Excel / T-Boy text edits — needs her file (needs-info on the Issue).

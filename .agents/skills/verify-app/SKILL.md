---
name: verify-app
description: >-
  Drive Louisiana Languages (Expo / React Native) the way a learner does on an
  isolated Android emulator, with an iOS Simulator path for macOS hosts, and
  capture screenshot and video proof. Use to prove a UI or learner-flow change
  works in the real app, before writing PR Verification evidence, or when
  tests pass but you need to see the behavior.
---

# Verify Louisiana Languages

The app is a mobile app on two large platforms: Android and iOS. A change that can behave differently per platform (layout, keyboard, audio, safe areas, navigation gestures, auth redirects) needs proof on both. A change proven on one platform only says so in the PR, with the platform it was not driven on.

The driver is `scripts/lfv.mjs` (run from the repo root). It runs its own emulator, Metro, and Expo Go, so it never touches an emulator or Metro the user already has open.

```bash
L=.agents/skills/verify-app/scripts/lfv.mjs
$L help
```

Features and their recipes: [`features/README.md`](features/README.md). Read it before driving a flow.

## Launch (Android)

```bash
$L up
```

`up` boots AVD `lf-api35` as `emulator-5580` with `-read-only` (app data and installs are thrown away on exit, so every run starts as a fresh install), installs Expo Go from `~/.expo/android-apk-cache/`, starts Metro for this checkout on port `8097` in tmux session `lfv-metro-8097`, runs `adb reverse tcp:8097`, opens `exp://127.0.0.1:8097`, dismisses Expo Go's first-run developer-menu card, and hides Expo Go's floating Tools gear.

Ready means it prints `ready: emulator-5580 running exp://127.0.0.1:8097; evidence -> <dir>`. At that point the Language select screen (`id:language-select-scroll`) is on screen. A cold start takes about 1–3 minutes; the first bundle is the slow part.

- Metro loads `.env.local` (Supabase keys). Without it the app runs, but sign-in has no provider.
- `CI=1` is set, so Metro does not watch files. After editing code, `$L down && $L up`.
- Two checkouts can run side by side with different `LFV_PORT` and `LFV_EMU_PORT`. `up` refuses an emulator serial it did not start.

## Doctor

```bash
$L doctor
```

Read-only. Checks the lfv emulator is alive and booted, Expo Go is installed, Metro on the port answers `packager-status:running`, the adb reverse exists, and Expo Go is in front. Exit 1 if anything fails. Run it first whenever a tap or wait misbehaves.

## Drive

Every command waits for its target, so no `sleep` is needed before a `tap`.

```bash
$L dump                              # on-screen handles: id:, text:, desc:, [tap], centre
$L tap id:home-plan-cta              # testID (default selector kind)
$L tap 'desc:Check answer'           # accessibilityLabel
$L tap 'text:Continue'               # exact visible text
$L tap 'has:Bonjour'                 # substring of text or label
$L wait id:home-scroll 30            # wait up to 30s; exit 1 on timeout
$L type 'merci'                      # into the focused field
$L key BACK                          # Android back; also closes the keyboard
$L swipe up                          # scroll content up (see more below)
$L open                              # force-stop and reopen; app data is kept
```

Selector preference: `id:` (React Native `testID` shows up as the Android resource id) > `desc:` (`accessibilityLabel`) > `text:`. Use `dump` to find handles; do not use coordinates.

## iOS (macOS hosts only, not yet proven)

The iOS Simulator needs macOS and Xcode; this driver is Android-only. On a Mac, the same Metro serves iOS:

1. Create and boot a dedicated simulator, so the user's simulator is untouched: `xcrun simctl create lfv "iPhone 16" && xcrun simctl boot lfv`.
2. Start Metro in its own terminal: `npx expo start --localhost --port 8097`. Press `i` once to install the matching Expo Go on the booted simulator and open the app.
3. After that, reopen it with `xcrun simctl openurl lfv exp://127.0.0.1:8097`.
4. Drive with [Maestro](https://maestro.mobile.dev) (`tapOn: { id: home-plan-cta }`): `testID` is the Maestro `id` on iOS, so the handles in `features/` carry over.
5. Evidence: `xcrun simctl io lfv screenshot <file>.png`, `xcrun simctl io lfv recordVideo <file>.mp4` (Ctrl-C to stop).
6. Cleanup: `xcrun simctl shutdown lfv && xcrun simctl delete lfv`, and stop the Metro you started.

These steps have not been run end to end yet. The first agent to run them on a Mac fixes what fails here and removes this note.

## Evidence

```bash
$L shot 01-home                      # PNG -> evidence dir, prints the path
$L rec-start 02-answer               # screen recording (Android caps at 180s)
$L rec-stop                          # pulls the MP4 to the evidence dir
$L logs                              # last Metro lines: bundling, JS errors, console.log
```

Evidence goes to `tmp/verify/<timestamp>/` (git-ignored) unless `LFV_EVIDENCE=<dir>` is set. For a PR, copy the chosen files to `docs/evidence/<issue>/`, resize them to 50%, and follow `.agents/skills/pr-ui-evidence/`.

Proof standards:

- Drive the learner path: real taps from Home, not debug shortcuts. The T-Boy catalog navigator (tap `id:home-tboy` 10 times) is a debug path. Use it only to reach state that would take too long otherwise, and say so in the evidence README.
- Capture the action and the result: record a video across the tap, or take a shot before and after it.
- Check that the change is saved, not only shown: reopen with `$L open` (Learner Progress survives) and look again, or check a second view, such as the Dictionary status for a practised Word.
- Supabase calls (sign-in, saved Learner Progress) hit the real project in `.env.local`. Use a throwaway email, and never a real learner's account.

## Cleanup

```bash
$L down
```

Stops the tmux Metro session and the emulator that lfv started (by the saved PID and `adb emu kill`), never by process name. The evidence directory is kept; `down` prints its path. If `up` failed partway, still run `down`.

## Gotchas

- `-no-window` makes the emulator use `qemu-system-*-headless`, which crashes with a segfault on this Fedora host. `up` uses the windowed binary with `-qt-hide-window` instead.
- Metro with `--localhost` listens on IPv6 `::1` only. Check health at `http://localhost:8097/status`, not `127.0.0.1`. The emulator reaches it through `adb reverse`.
- Expo Go draws a floating Tools gear (`desc:Tools`) over the top-right corner. It catches taps meant for `id:home-language-flag` and covers the Lesson ⚡ counter. `open` turns it off in the developer menu ("Tools button"). If it comes back, run `$L open`.
- `uiautomator dump` fails while an animation runs. `up` turns system animations off, and the driver retries.

# Louisiana Language Learning

Louisiana Language Learning is a mobile and web application for studying Louisiana languages through structured lessons and practice activities. The application currently supports:

- Cajun French
- Kouri-Vini

Learners can select a Language, work through Units and Lessons, practice Words with several Activity types, listen to Audio when it is available, and review their Learner Progress. The app also includes Daily Review, Mistake Review, and Dictionary screens.

## Local Setup

### Prerequisites

- Node.js and npm
- Expo Go for testing on a physical phone, or an installed iOS or Android simulator
- Xcode for the iOS simulator on macOS
- Android Studio and an Android emulator or connected device for Android development

### Install Dependencies

From the repository root, install the locked dependency versions:

```bash
npm ci
```

Use `npm install` only when you intentionally need to update dependencies or the lockfile.

### Start the Development Server

Start Expo with:

```bash
npm start
```

To clear the Expo and Metro caches while starting the app:

```bash
npx expo start --clear
```

When the server starts, Expo shows a QR code and keyboard shortcuts for opening the app. You can also use the platform-specific commands:

```bash
npm run ios
npm run android
npm run web
```

`npm run ios` requires macOS and Xcode. `npm run android` requires an Android emulator or a connected Android device. `npm run web` opens the web version in a browser.

If a phone cannot connect through the QR code, the local network may be blocking the connection. Try a personal hotspot or another trusted network. Expo's tunnel mode is another option:

```bash
npx expo start --tunnel
```

On first launch, the app opens the Language selection screen. Learner Progress is stored locally on the device through AsyncStorage, so restarting the app should keep local progress for that device.

## Tests

Run the automated tests with:

```bash
npm test
```

For a single, non-interactive run:

```bash
npm test -- --runInBand
```

The current test foundation checks Catalog loading, Unit and Lesson ordering, Word handling, Learner Progress storage, Card review scheduling, Unit titles, and the rendered progress header. Tests are written against module interfaces and rendered behavior rather than private helpers.

## Project Structure

```text
index.js                  Expo entry point
App.js                    Navigation and application setup
src/screens/              Active application screens
src/components/           Reusable rendered components
src/data/                 Lesson JSON, Catalog loading, and Audio identities
src/utils/                Learner Progress storage and Card review logic
src/constants/            Shared labels and Unit titles
scripts/                  Lesson and Audio data generation scripts
assets/                   Images and Audio assets
docs/                     Architecture and agent workflow decisions
.scratch/                 Committed project specifications and tickets
```

The active application path is `index.js` -> `App.js` -> the modules under `src/`. The root `cajun.csv` and `kreole.csv` files are source data for lesson generation. The generated lesson data used at runtime is stored in `src/data/cajunLessons.json` and `src/data/kreoleLessons.json`.

The initial commit also contained the unused `create-expo-app` Router template
under root-level `app/`, `components/`, `constants/`, and `hooks/` directories,
plus stale root-level screen copies and `scripts/reset-project.js`. Those files
were removed because the application entry graph never referenced them and
their undeclared template dependencies and stale imports caused lint and
TypeScript failures. The active `src/screens/` and `src/components/` modules
remain the application implementation.

## Updating Lesson Data

Run lesson generation from the repository root:

```bash
python scripts/generate_lessons.py
```

This reads `cajun.csv` and `kreole.csv` and replaces the generated JSON files in `src/data/`. Review the generated data before committing it.

The Audio manifest script is separate:

```bash
python scripts/generate_audio_manifest.py
```

The current script expects CSV files named `Louisiana French - Sheet1.csv` and `Louisiana French - Kreole.csv`. Those files are not part of the current repository checkout, so normal local development should use the committed `src/data/audioManifest.js` instead of running this script. If the required source files are added later, review the generated manifest and Audio paths before committing it.

## Further Documentation

- `CONTEXT.md` defines the project language for Languages, Units, Lessons, Activities, Words, Cards, Audio, Catalog, and Learner Progress.
- `docs/adr/` records accepted architecture decisions.
- `.scratch/architecture-modernization/spec.md` describes the testing and modernization direction.
- `.scratch/architecture-modernization/delivery-plan.md` lists the planned implementation order.

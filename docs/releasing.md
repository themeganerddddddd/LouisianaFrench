# Releasing test builds

Run everything through `npm run release -- <flags>`. It checks your checkout and the EAS settings, shows a summary, asks for confirmation, then runs `eas`.

## Common commands

| Goal | Command |
|---|---|
| Production build of both apps to TestFlight and Play internal | `npm run release` |
| Android only, Play closed testing | `npm run release -- --platform android --track closed` |
| Build only, no store upload | `npm run release -- --no-submit` |
| Submit the latest production build again | `npm run release -- --submit-only` |
| Install-link build against the dev database | `npm run release -- --build preview --platform android` |
| See the plan without running anything | add `--dry-run` |
| Check your setup only | `npm run release -- preflight` |
| Recent builds and submissions | `npm run release -- status` |

## Rules the tool enforces

- **Production** builds use the prod Supabase project. They must run from a clean `main` that matches `origin/main`.
- **Preview** builds use the dev Supabase project and give install links. They are never uploaded to a store. iOS preview builds need the tester's device registered (`eas device:create`).
- The EAS `production` and `preview` environments must point at the hosts in `scripts/release/config.js`. A swapped or missing value stops the release.
- `--track` (`internal`, `closed`, `open`) only applies to Android production builds. iOS always goes to TestFlight.

## Before you release

1. Merge the changes you want in the release and pull `main`.
2. If testers should see a new version number, change `version` in `app.json` through a pull request. Build numbers go up on their own.
3. After the build: TestFlight processing takes about 10 to 30 minutes. Play testers must accept the opt-in link.

Credentials (Apple signing, App Store Connect API key, Google service account key) live in EAS. Nothing secret is stored in this repo.

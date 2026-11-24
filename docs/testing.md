# Testing

Run these commands from the repository root. They are the scripts in `package.json`, the Python tests under `scripts/`, and the commands the workflows run.

## Typecheck

```bash
npm run typecheck
```

`npm run typecheck` runs `tsc --noEmit`. New TypeScript is checked. Existing JavaScript is allowed and is not type-checked. No workflow runs this command yet.

## Jest

```bash
npm test
```

`npm test` runs `jest --watchAll=false`. The suite includes the tests under `src/`, `scripts/release/__tests__/plan.test.js`, and `.agents/scripts/__tests__/validateFixtureSep.test.js`.

`jest.globalSetup.js` sets `TZ` to `America/Chicago` before workers start. `src/utils/__tests__/streakDst.test.js` fails when that setup did not run.

## Lint

```bash
npm run lint
```

`npm run lint` runs `eslint .`.

## Changed files

```bash
npm run test:changed
```

`npm run test:changed` runs `.agents/scripts/test-changed.mjs`. It diffs `HEAD` against `origin/main` and runs the Jest files tied to that diff. When the diff has no related Jest file, it runs `npm test`.

## Python

The Python tests use `unittest`. This is the command in the `python` job:

```bash
python -m unittest discover -s scripts -p 'test_*.py'
```

Discover loads these three files:

- `scripts/test_generate_lessons.py`
- `scripts/test_incremental_generation.py`
- `scripts/test_normalize_audio.py`

Each file also calls `unittest.main()` when you run it directly:

```bash
python scripts/test_generate_lessons.py
python scripts/test_incremental_generation.py
python scripts/test_normalize_audio.py
```

`scripts/release/__tests__/plan.test.js` is a Jest test. `npm test` runs it. The Python pattern is `test_*.py`, so the `python` job leaves that file for Jest.

## Pull request check

```bash
npm run pr-ready
```

`npm run pr-ready` runs `npm run lint`, then `npm run typecheck`, then `npm test`, then `.agents/scripts/pr-gates.mjs --ai`. The gates check UI evidence, the pull request headings (Why, What changed, Blast Radius, Verification), and the production line count.

Two more check scripts are in `package.json`:

```bash
npm run check:ui-evidence
npm run validate:fixture-sep
```

`npm run check:ui-evidence` runs `.agents/scripts/check-pr-ui-evidence.mjs`. The pull request gates call that script. `npm run validate:fixture-sep` is the advisory fixture check named in `AGENTS.md`. A default run exits 0. Pass `--strict` and it exits 2 when it reports a warning.

The capture script is `.agents/scripts/capture-ui-evidence.mjs` (`capture:ui-evidence` in `package.json`). It takes an issue number and writes under `docs/evidence/<issue>/`. It writes screenshots for a pull request.

## CI

`.github/workflows/ci.yml` runs on a push to `main` and on a pull request to `main` (lines 3–7).

| Job | Lines | Command |
| --- | --- | --- |
| `lint` | 10–19 | `npm ci`, then `npm run lint` |
| `test` | 21–30 | `npm ci`, then `npm test` |
| `python` | 32–40 | `python -m unittest discover -s scripts -p 'test_*.py'` |
| `build` | 42–52 | `npm ci`, then `npm run build` |

The lint, test, and build jobs use Node 22. The python job uses Python 3.12. No step sets `continue-on-error`. A non-zero Python run fails the `python` job, which fails the workflow on pull requests to `main`.

No job runs `npm run typecheck`. A type error fails `npm run pr-ready` on a laptop and does not fail CI until a workflow job is added.

`npm run build` is `npm run build:ios && npm run build:android` in `package.json`. The build job exports the iOS bundle and the Android bundle.

```bash
npm run build
```

`.github/workflows/pr-gates.yml` runs on a pull request to `main` for `opened`, `synchronize`, `reopened`, `edited`, `labeled`, and `unlabeled` (lines 5–8). The `pr-gates` job runs `node .agents/scripts/pr-gates.mjs` with the pull request body, branch, and labels. Jest and the Python tests stay in `ci.yml`. The agent rules in that job apply when the pull request is AI-generated.

## Manual checks

These checks sit outside `npm test` and outside the two workflows.

- Android emulator: `.agents/skills/verify-app`. The driver is `.agents/skills/verify-app/scripts/lfv.mjs`. The iOS notes in that skill are marked not proven.
- Device smoke scripts: `scripts/gate-b/`. Read `scripts/gate-b/README.md`.
- UI evidence for a pull request: `docs/evidence/<issue>/`.

## Not automated yet

iOS device runs, iOS simulator runs, and Maestro are not automated. [ADR 0003](adr/0003-behavior-first-test-surfaces.md) says installed iOS and Android journeys will be covered with Maestro. This repository has no Maestro flow, and CI does not launch a simulator or a device.

## iOS

<!-- BIO-60: add the iOS section under this heading. Keep the heading. -->

Placeholder for BIO-60. iOS device runs, iOS simulator runs, and Maestro are not automated yet. BIO-60 replaces this placeholder.

# Testing

Run these from the repo root. The list matches `package.json`, `.github/workflows/ci.yml`, and `.github/workflows/pr-gates.yml` on this branch.

## Commands

| Command | What it runs |
| --- | --- |
| `npm test` | Jest once (`jest --watchAll=false`). This includes the app tests under `src/`, `scripts/release/__tests__/plan.test.js`, and `.agents/scripts/__tests__/`. |
| `npm run lint` | `eslint .` |
| `npm run test:changed` | Jest files related to the diff against `origin/main`. When none match, it runs the full `npm test` suite. |
| `npm run pr-ready` | Lint, then `npm test`, then the agent PR gates (the same checks as `pr-gates.yml`, forced on). |
| `npm run build` | Expo export of the iOS bundle and the Android bundle (`build:ios`, then `build:android`). |
| `python -m unittest discover -s scripts -p 'test_*.py'` | `scripts/test_generate_lessons.py`, `scripts/test_incremental_generation.py`, and `scripts/test_normalize_audio.py`. |

`scripts/release/__tests__/` is present and is JavaScript. `npm test` runs `plan.test.js`. The Python pattern is `test_*.py`, so discovery stays on the three Python files.

`npm run validate:fixture-sep` is a local advisory scan. It is not a CI job. `npm run check:ui-evidence` and `npm run capture:ui-evidence` feed the PR evidence gate; they are not the test suite.

## Timezone

`jest.globalSetup.js` sets `TZ` to `America/Chicago` before Jest starts workers. Each worker inherits that value, so `Date` in the suite uses US Central time. That still holds for `TZ=UTC npm test` and for CI, where the runner clock is UTC: setup overwrites `TZ`, then the workers start. Jest sandboxes `process.env`, so a test file cannot change the timezone after its worker has started. `src/utils/__tests__/streakDst.test.js` checks that Chicago is active (the 14 March 2027 US daylight-saving change) and fails when that setup did not run.

## CI

`.github/workflows/ci.yml` runs on a push to `main` and on a pull request to `main`. Each job uses a fresh `ubuntu-latest` runner.

| Job | Steps |
| --- | --- |
| `lint` | Node 22, `npm ci`, `npm run lint` |
| `test` | Node 22, `npm ci`, `npm test` |
| `python` | Python 3.12, `python -m unittest discover -s scripts -p 'test_*.py'` |
| `build` | Node 22, `npm ci`, `npm run build` (export the iOS and Android bundles) |

`.github/workflows/pr-gates.yml` runs on a pull request to `main` when the PR is opened, updated, reopened, edited, labeled, or unlabeled. The job checks out the full history and runs `.agents/scripts/pr-gates.mjs` with the PR body, branch, and labels.

A human pull request passes that job with no extra rules. An AI-generated pull request is one with the `ai-generated` label, or an agent marker (a Cursor or Claude footer, a Cursor or Claude `Co-authored-by` trailer, or a branch prefixed `agent/`, `cursor/`, `claude/`, `codex/`, or `opencode/`). For those, the job checks three things: UI evidence when the diff touches the UI, the template sections **Why**, **What changed**, **Blast Radius**, and **Verification**, and the production line count (warning above 100 added lines, failure above 250 unless the PR has `large-pr-approved` or the local run sets `ALLOW_LARGE_PR=1`). When it finds an agent marker and the label is missing, the workflow adds `ai-generated`.

## Manual checks

These sit outside CI.

- Android emulator: `.agents/skills/verify-app` drives the app through `.agents/skills/verify-app/scripts/lfv.mjs`.
- Device smoke recipes: `scripts/gate-b/`.
- Screen grabs and short videos for a pull request: `docs/evidence/<issue>/`.

## Not automated

iOS simulator runs and iOS device runs are absent from CI. None are planned right now.

Maestro is absent too. [ADR 0003](adr/0003-behavior-first-test-surfaces.md) says installed iOS and Android journeys will be covered with Maestro. There is no Maestro suite in the repo, and no CI job runs it.

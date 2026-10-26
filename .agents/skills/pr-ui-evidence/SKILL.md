---
name: pr-ui-evidence
description: >-
  Capture and embed screen grabs or short videos in LouisianaFrench pull
  request bodies for UI changes. Use when opening or updating a PR that changes
  what a learner sees.
---

# PR UI evidence (Louisiana Languages)

Follow the personal `pr-ui-evidence` skill. Repo specifics:

- Template section: **What a learner sees** in `.github/pull_request_template.md`
- Evidence root: `docs/evidence/<issue>/` only — **never** `docs/pr-evidence/`
- Example of linked grabs: PR #317 (`docs/evidence/307/`)
- AGENTS.md requires this for UI pull requests
- Before commit: resize grabs and videos to **50%** on each side (same aspect ratio). Emulator full-res is too large for the PR.

Owner/repo for raw links: `themeganerddddddd/LouisianaFrench`.

## Required agent flow before `gh pr create`

1. Capture (or scaffold) evidence with the repo script:
   ```bash
   npm run capture:ui-evidence -- <issue> [--url http://localhost:8081]
   ```
   Or: `node .opencode/scripts/capture-ui-evidence.mjs <issue> …`
2. Commit evidence under `docs/evidence/<issue>/` on the PR branch (not `docs/pr-evidence/`).
3. Paste the script’s markdown into **What a learner sees**, using `raw.githubusercontent.com` URLs after the evidence commit exists on the remote.
4. Run readiness gates before opening the PR:
   ```bash
   npm run pr-ready -- --issue <N> --body-file /path/to/pr-body.md
   ```
5. Only then run `gh pr create` (or update).

Do **not** store or link evidence under `docs/pr-evidence/`.

# 01 — Device info, mailto composer, form validation helpers

Status: ready-for-agent
Claimed by: opencode
Completed: 2026-07-28
Blocked by:

## Goal

Ship pure modules for device collection, form validation, and opening a pre-filled bug-report email. No UI.

## Acceptance criteria

- [x] `collectDeviceInfo()` returns app version, platform, OS name/version, build ID, brand, model, device type, optional language/screen, UTC timestamp; missing → `"unknown"`
- [x] Tests prove a **successful gather for iOS** and a **successful gather for Android** (separate cases with platform-appropriate mocks for `Platform`, `expo-device`, and app version)
- [x] `validateBugReportForm({ name, email, description })` requires non-empty trimmed name, email, and description; email must match a basic valid pattern; whitespace-only fails
- [x] `buildMailtoUrl` / `openBugReportEmail` encode To/Subject/Body; body includes contact + device block; uses `expo.extra.bugReportEmail`
- [x] `Linking` failure surfaces a clear error path
- [x] Tests cover validation matrix, device shape (iOS + Android), and mailto open
- [x] `npm test` and `npm run lint` green for touched code
- [x] No network submit, no tokens, no UI components

## Spec

See `.scratch/bug-report/spec.md` (PR 1).

## Comments

- Verified with `npm test -- --runInBand`, `npm run lint`, and `git diff --check` on 2026-07-28.

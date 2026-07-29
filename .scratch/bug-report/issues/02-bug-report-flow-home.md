# 02 — Bug report flow on Home

Status: ready-for-agent
Blocked by: 01-device-info-and-mailto
Claimed by: opencode
Completed: 2026-07-28

## Goal

End-to-end bug report UX on Home: entry button, form with validation, consent, mailto, pelican confirmation.

## Acceptance criteria

- [x] Home footer shows a themed text-only `Report a bug` control under the pelican with `accessibilityLabel="Report a bug"`
- [x] Form requires name, email, description; validation errors block consent
- [x] Consent lists device fields; collection only after Accept
- [x] Accept calls `collectDeviceInfo` + `openBugReportEmail`
- [x] Decline/Cancel never collect or open mail
- [x] Confirmation uses `secondline.png` (pelican + umbrella) with soft fade-in + gentle sway
- [x] Tests: validation gate, consent, accept/decline, Home a11y label
- [x] `npm test` and `npm run lint` green
- [x] Production change stays reviewable (~under 250 lines)

## Verification comment (readability pass)

Quality pass complete. All 16 focused tests pass; full suite 145 passed with 1 skipped; lint clean; git diff --check clean.
Production: 246 lines total (BugReportButton 45, BugReportFlow 194, HomeScreen wiring 7).
Domain names: CONSENT_FIELDS, stage, errors, submitting, fadeAnim, swayAnim, nameInputRef, handleSubmit, handleAccept, ActionButton, styles, etc. Removed swayLoopRef (effect cleanup is sufficient).
Multi-line React Native import; split JSX lines for readability. All behaviors preserved: round ! button + a11y, form validation + first-invalid focus, exact 6-field consent, collect-after-accept only, trimmed values, failure Alert, success confirmation with fade+sway + cleanup, keyboard avoidance/scroll, and synchronous duplicate-submit guard. `app.json` bugReportEmail left empty per spec. No screens other than Home touched.

## Spec

See `.scratch/bug-report/spec.md` (PR 2) and mockup `.scratch/bug-report/mockup.html`.

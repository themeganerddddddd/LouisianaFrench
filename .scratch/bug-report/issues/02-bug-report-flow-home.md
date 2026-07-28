# 02 — Bug report flow on Home

Status: ready-for-agent
Blocked by: 01-device-info-and-mailto

## Goal

End-to-end bug report UX on Home: entry button, form with validation, consent, mailto, pelican confirmation.

## Acceptance criteria

- [ ] Home footer shows ~36px round `!` button, themed, `accessibilityLabel="Report a bug"`
- [ ] Form requires name, email, description; validation errors block consent
- [ ] Consent lists device fields; collection only after Accept
- [ ] Accept calls `collectDeviceInfo` + `openBugReportEmail`
- [ ] Decline/Cancel never collect or open mail
- [ ] Confirmation uses `secondline.png` (pelican + umbrella) with soft fade-in + gentle sway
- [ ] Tests: validation gate, consent, accept/decline, Home a11y label
- [ ] `npm test` and `npm run lint` green
- [ ] Production change stays reviewable (~under 250 lines)

## Spec

See `.scratch/bug-report/spec.md` (PR 2) and mockup `.scratch/bug-report/mockup.html`.

# Spec: In-app bug report (mailto)

Status: approved
Delivery: device mail app via `mailto:`
Mockup: `.scratch/bug-report/mockup.html` (reference UI only; not shipped)

## Summary

Add a small round **!** button at the bottom of hub screens. Tapping it opens a bug-report form. On submit, show a consent modal that lists device fields to be collected. On accept, collect device info, open the learner’s mail app with a pre-filled message, and show a confirmation with the Mardi Gras umbrella pelican animation.

No backend, Cloudflare worker, Formspree, or GitHub API. Inbox address comes from config (`expo.extra.bugReportEmail`), supplied at implement/ship time.

## Product decisions

| Decision | Choice |
|----------|--------|
| Delivery | `mailto:` → device mail client; user taps Send |
| Inbox | `app.json` → `expo.extra.bugReportEmail` |
| Screens | Hub only: Home, Dictionary, Advanced, LanguageSelect, LessonComplete |
| Entry UI | Round `!` button, ~36px, themed (`#2771CB` / `#6D28D9`) |
| Confirmation | Static `secondline.png` (pelican + Mardi Gras umbrella) with soft fade-in + gentle sway; light confetti optional |
| Not in v1 | Mid-lesson entry, screenshots, progress dumps, auto-send without mail app |

## User flow

```
[!] footer button
  → Form modal (name, email, description)
  → Validate (see below)
  → Consent modal (lists device fields; nothing collected yet)
  → Accept → collectDeviceInfo → open mailto → confirmation (pelican)
  → Decline / Cancel → close; no collection, no mail
```

## Form validation (required)

Validate **before** opening the consent modal. Do not collect device info or open mail until validation passes and the user accepts consent.

| Field | Rules |
|-------|--------|
| **Name** | Required. Trimmed length &gt; 0. Show clear error if empty. |
| **Email** | Required. Trimmed length &gt; 0. Must look like an email (basic pattern, e.g. local `@` domain with a dot in the domain). Show clear error if empty or invalid. |
| **Description** | Required. Trimmed length &gt; 0. Show clear error if empty. |

Behavior notes:

- Prefer inline field errors (or one summary) matching app tone; keep copy short.
- Re-validate on Submit; focus the first invalid field when possible.
- Whitespace-only values count as empty.
- Do not open consent until all three fields pass.

## Consent + device fields (after Accept only)

Consent copy warns that device information will be attached to help troubleshooting, and lists exactly:

- Phone make and model
- Operating system (name + version)
- OS build ID (firmware-ish)
- App version
- Device type (phone / tablet / web)
- App context: selected language, screen name, UTC timestamp

Sources: `expo-device`, `expo-constants`, React Native `Platform`. Missing values → `"unknown"`.

## Email content

**To:** `expo.extra.bugReportEmail`
**Subject:** `[Louisiana French Bug] {first ~60 chars of description}`
**Body:**

```text
Name: ...
Reply-to email: ...

## What happened
{description}

## Device
- App version: ...
- Platform: ...
- OS: ...
- Build ID: ...
- Device: {brand} {model}
- Type: ...
- Language: ...
- Screen: ...
- Submitted: {ISO-8601 UTC}
```

If no mail app / `Linking` cannot open: alert with the configured address so the user can email manually.

## Architecture

```text
src/utils/deviceInfo.js              collectDeviceInfo()
src/utils/bugReport.js               validateBugReportForm(), buildMailtoUrl(), openBugReportEmail()
src/components/BugReportButton.js    round ! entry; accentColor; a11y label
src/components/BugReportFlow.js      form + validation + consent + confirmation
```

Screens only mount `<BugReportButton … />` in the footer. No report logic in screens.

| Module | Interface |
|--------|-----------|
| `deviceInfo` | `collectDeviceInfo({ language?, screenName? })` → plain object |
| `bugReport` | `validateBugReportForm({ name, email, description })` → `{ ok, errors }` |
| | `buildMailtoUrl({ to, name, email, description, deviceInfo })` |
| | `openBugReportEmail(...)` via `Linking` |
| `BugReportFlow` | open/close; owns form state, validation, consent, pelican confirmation |
| Config | `expo.extra.bugReportEmail` |

## UI reference (from mockup)

- Home-like hub footer: centered 36px blue circle with `!`, subtle “Report a bug” hint
- Bottom sheet / modal cards: white, 22px radius, `#17324D` titles, `#2771CB` primary
- Consent: orange warning box + bulleted field list
- Confirmation: pelican umbrella image (`assets/images/secondline.png`), sway loop, then mail-preview context in mockup (production may simplify to short success copy after mail opens)
- Accessibility: `accessibilityLabel="Report a bug"` on the entry button

## PR breakdown (AGENTS.md)

Prefer &lt;100 production lines per PR when practical; under 250 normal. Tests ship with production code.

### PR 1 — Device info + mailto + validation helpers

**Production**

- `src/utils/deviceInfo.js`
- `src/utils/bugReport.js` (`validateBugReportForm`, `buildMailtoUrl`, `openBugReportEmail`, read email from config)
- `app.json` → `expo.extra.bugReportEmail` placeholder
- `npx expo install expo-device expo-constants`

**Tests**

- `deviceInfo`: stable shape; missing → `"unknown"`
- `deviceInfo`: **successful gather on both iOS and Android** (mocked `Platform.OS` + `expo-device` / Constants per platform; assert brand, model, OS name/version, build ID, app version, device type)
- `validateBugReportForm`: empty name/email/description fail; whitespace fails; bad email fails; valid triple passes
- `buildMailtoUrl` / `openBugReportEmail`: encoding, `Linking.openURL`, failure path

**Out of scope:** UI components, screen wiring

### PR 2 — Flow on Home (tracer bullet)

**Production**

- `BugReportButton.js`, `BugReportFlow.js`
- Wire Home footer (`ScrollView` end); accent from theme
- Form validation UI; consent; collect only after Accept; pelican confirmation after successful mail open attempt

**Tests**

- Invalid form does not open consent
- Valid form → consent lists fields
- Accept opens mail (mocked); Decline does not collect/open
- Home exposes `getByLabelText('Report a bug')`

### PR 3 — Remaining hub screens

**Production**

- Dictionary, Advanced, LanguageSelect, LessonComplete footers only
- Pass `language` when known, `screenName` per screen

**Tests**

- Report control present on remaining hub screens (light assertions)

**Out of scope:** Lesson, Daily Review, Mistake Review, Loading

## Implement-time checklist (human)

1. Set real `expo.extra.bugReportEmail`
2. Smoke on a device with a mail app
3. Confirm received message is readable

## Out of scope (all PRs)

- Cloudflare / Formspree / GitHub Issues API
- Mid-lesson entry points
- Screenshots, logs, full Learner Progress dump
- Auto-send without the user tapping Send in the mail app

## Mockup artifacts

| Path | Role |
|------|------|
| `.scratch/bug-report/mockup.html` | Interactive UI reference |
| `.scratch/bug-report/pelican-umbrella.png` | Symlink to `assets/images/secondline.png` |
| Local server (optional) | `python3 -m http.server 8765 --bind 0.0.0.0` from `.scratch/bug-report/` |

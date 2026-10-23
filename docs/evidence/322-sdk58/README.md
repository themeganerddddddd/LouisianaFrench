# PR #322 re-test on Expo SDK 58

Combined branch: `cursor/pr322-on-sdk58` (SDK 58 + Support mailto parity / top-level Support).

## Automated checks

- Jest: HomeSupportBugReport, HomeAboutMenu, BugReportButton — pass
- Full suite: 540 tests pass
- Lint: pass

## Device (Expo Go 58.0.5, emulator-5554)

- Top-level menu shows Account, About Us, **Support** (`about-menu-support`)
- About Us leaves are Acknowledgements / Privacy / FAQ only (no Support leaf)
- Support opens shared bug-report sheet after menu dismiss delay
- Form fill + Submit attempted; mailto may not appear in logcat if no mail app is installed on the AVD — subject/device parity is covered by Jest (`HomeSupportBugReport.test.js`)

## Screenshots

- `02-top-level-menu-expanded.png` — Support at menu root beside About Us
- `03-support-from-menu.png` — bug report sheet from Support

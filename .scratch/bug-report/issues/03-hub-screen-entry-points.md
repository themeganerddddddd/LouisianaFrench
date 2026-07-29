# 03 — Bug report entry on remaining hub screens

Status: ready-for-agent
Blocked by: 02-bug-report-flow-home
Claimed by: opencode
Completed: 2026-07-28

## Goal

Mount the same bug-report control on Dictionary, Advanced, LanguageSelect, and LessonComplete.

## Acceptance criteria

- [x] Dictionary, Advanced, LanguageSelect, and LessonComplete expose the round `!` report control
- [x] Each passes `screenName` and `language` when known
- [x] No bug-report controls added to Lesson (mid-lesson), Daily Review, Mistake Review, or Loading
- [x] LessonComplete language metadata propagation touched LessonRunner, MistakeReviewScreen, DailyReviewScreen (language param only; no report UI)
- [x] Light tests assert control presence on remaining hubs
- [x] `npm test` and `npm run lint` green

## Verification comment

All 145 tests pass with 1 skipped; lint clean; git diff --check clean.
Production changes for ticket 03: ~76 lines (AdvancedScreen, DictionaryScreen, LanguageSelectScreen, LessonCompleteScreen wiring + language propagation in LessonRunner, MistakeReviewScreen, DailyReviewScreen).
Combined UI (Home + 4 hubs): BugReportButton 45 + BugReportFlow 194 + Home wiring 7 + hub wiring ~76 = ~322 production lines total across tickets 02+03.
Back to Home preserves language param where available.
`app.json` bugReportEmail empty. No bug-report controls added to mid-lesson, review, or loading screens.

## Spec

See `.scratch/bug-report/spec.md` (PR 3 — merged into combined PR with ticket 02).

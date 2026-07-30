# 02: Reusable LessonPrefaceModal rendering module

Status: ready-for-agent

Blocked by: 01-data-and-storage-interfaces

Claimed by:

## Summary

Build `src/components/LessonPrefaceModal.js` — a reusable Modal that renders the preface summary centered, with optional left-aligned details. Contains no Language copy, Unit codes, or dispatch calls.

## Acceptance

- [ ] Module accepts a `preface` data object, `visible`, `mode` (`'start'` | `'reference'`), `onContinue`, `onClose`, and `accentColor`
- [ ] Summary section centered: kicker, title, summary text, term chips, reassurance, action buttons all use `alignItems: 'center'` / `textAlign: 'center'`
- [ ] Term chips render in a wrapping centered row (not a fixed grid), each chip centered
- [ ] Optional full-screen detail view with back navigation and header, left-aligned text, quote block
- [ ] `Learn more` opens details; `Back` returns to summary
- [ ] `mode='start'` shows `Start lesson` as primary action; `mode='reference'` shows `Back to lesson`
- [ ] Modal uses `transparent` background with `animationType="fade"`
- [ ] Touch targets ≥ 44pt
- [ ] Passes all module tests

## Implementation notes

- Use a pattern similar to `BugReportFlow.js` for Modal structure.
- The centered term chips should use `flexWrap: 'wrap'` and `justifyContent: 'center'` to handle any term count.
- Details view must be scrollable for large system fonts.
- No Cajun French or Kouri-Vini strings, no Unit lookups inside this module.
- `accentColor` drives the primary button, kicker, and chip border colors.
- The `onClose` callback should also dismiss the details view.

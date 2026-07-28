# 03 — Bug report entry on remaining hub screens

Status: ready-for-agent
Blocked by: 02-bug-report-flow-home

## Goal

Mount the same bug-report control on Dictionary, Advanced, LanguageSelect, and LessonComplete.

## Acceptance criteria

- [ ] All five hub screens expose the report control
- [ ] Each passes `screenName` and `language` when known
- [ ] Mid-lesson / Daily Review / Mistake Review / Loading unchanged
- [ ] Light tests assert control presence on remaining hubs
- [ ] `npm test` and `npm run lint` green

## Spec

See `.scratch/bug-report/spec.md` (PR 3).

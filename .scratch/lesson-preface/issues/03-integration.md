# 03: Integrate preface into LessonRunner and ProgressHeader

Status: ready-for-agent

Blocked by: 02-rendering-module

Claimed by:

## Summary

Wire the LessonPrefaceModal into the Lesson lifecycle: gate before Activity 1 for the first Lesson of the Unit, track first-opening, and support reopening from ProgressHeader.

## Acceptance

- [ ] `LessonRunner` shows unread preface before activities when the Lesson is the first in its Unit and a preface exists
- [ ] Lesson progress shows `0 / total` while the preface is visible
- [ ] `Start lesson` marks the preface read and begins Activity 1
- [ ] Closing or going Back leaves the preface unread
- [ ] A previously read preface is skipped on the next opening
- [ ] `ProgressHeader` optionally shows a "Unit note" button when `unitPreface` prop is truthy
- [ ] "Unit note" reopens the Modal in `mode='reference'` without restarting
- [ ] Activity Audio cannot start before the preface is dismissed
- [ ] Each language's preface read state is independent
- [ ] Existing screen tests still pass

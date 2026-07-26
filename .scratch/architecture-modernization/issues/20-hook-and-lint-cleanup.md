# 20 - Hook and lint cleanup

**What to build:** Maintainers receive a clean `npm run lint` for every active source file — no React hook dependency warnings, no unused-var warnings — with regression coverage that proves the fixes don't change behavior.

**Blocked by:** 03 - Characterize Activities, screens, and navigation (PR #7, completed)

**Status:** completed

**Claimed by:** agent/hook-lint-cleanup

**Completed:** 2026-07-26

- [ ] `ActivityRenderer.js`: `useAudio` helpers stabilized with `useCallback`; `playAudioKey` listed in effect deps; cleanup doesn't reference stale function identity.
- [ ] `LessonRunner.js`: `init` scoped inside its effect (or listed in deps with stable identity); animation Animated value refs listed or suppressed with a stable-invariant comment.
- [ ] `DailyReviewScreen.js`: `init` scoped inside its effect so deps are honest.
- [ ] `HomeScreen.js`: `loadData` scoped inside its effect so deps are honest.
- [ ] `DictionaryScreen.js`: `load` scoped inside its effect; unused catch `e` renamed to `_e`.
- [ ] `MistakeReviewScreen.js`: unused `lessonId` removed or prefixed with `_`.
- [ ] `npm run lint` reports zero warnings for these files.
- [ ] `npm test` passes (existing characterization suite is the regression safety net).
- [ ] Deferred-work doc updated to mark Hook And Lint Cleanup complete.

## Pull Request Shape

- Risk: Low–Medium
- Complexity: S
- Production change budget: under 90 lines
- Suggested commits: one module per commit in dependency order: Audio hook → LessonRunner → screen init loaders → unused bindings

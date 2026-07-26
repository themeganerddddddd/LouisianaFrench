# Deferred Production Work From Ticket 03

Ticket 03 characterizes Activities, active screens, and navigation with a
production change budget of zero lines. The following production changes were
identified while building that safety net, but they are intentionally deferred
so characterization remains separate from behavior and interface changes.

## Hook And Lint Cleanup

The active application currently reports React hook dependency warnings in
`ActivityRenderer.js`, `DailyReviewScreen.js`, `DictionaryScreen.js`,
`HomeScreen.js`, and `LessonRunner.js`, plus unused bindings in Dictionary and
Mistake Review.

This work needs to be done because missing dependencies can hide stale values
or prevent an effect from responding when its inputs change. The unused
bindings also obscure which route parameters and errors are part of the active
implementation.

It does not belong in Ticket 03 because moving loaders into effects, stabilizing
Audio callbacks, or changing dependency arrays can alter when initialization,
cleanup, and playback run. A dedicated production ticket must add focused
regression coverage for each changed module before clearing these warnings.

Suggested follow-up:

- Characterize effect initialization and cleanup at each module interface.
- Change one module at a time rather than combining all lint warnings.
- Verify Language changes, Lesson identity changes, Audio cleanup, and screen
  unmount behavior explicitly.
- Run the full test and lint checks before removing each warning from this note.

## Real Navigator Seam

`App.js` owns the real route-component mapping. The test helper currently
builds a test navigator with a parallel mapping and checks its route names
against the declarations in `App.js`.

This work needs to be done because route-name parity alone cannot prove that a
test route uses the same component as the installed application. A duplicated
mapping can drift while its names continue to match.

It does not belong in Ticket 03 because exporting a shared route registry or
extracting an application stack changes the production navigation interface.
That seam should be designed deliberately and protected by tests rather than
introduced only to support characterization.

Suggested follow-up:

- Select one production-owned navigation interface shared by `App` and tests.
- Keep `NavigationContainer`, initial-route policy, route names, components,
  and required parameters behind that interface.
- Demonstrate that adding, removing, or remapping a route changes both the real
  application and navigation tests through the same source of truth.
- Preserve the KD-02 assertion that Leaderboard is not registered until its
  product decision and fix are complete.

## Deferral Rule

Do not fold either work item into Ticket 03. Convert each section into a focused
implementation ticket after the characterization branch lands, with production
tests in the same pull request.

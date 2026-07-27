# 10 - Remove inactive application paths

**What to build:** Maintainers and coding agents see one application entry and one active screen implementation, with starter and legacy paths removed after active behavior is protected.

**Blocked by:** 03 - Characterize Activities, screens, and navigation; 08 - Make completion navigation valid; 09 - Handle unavailable Lessons intentionally

**Status:** completed

**Claimed by:** agent/next

**Completed:** 2026-07-26

## Comments

Verified: no `app/` directory (Expo Router starter removed in PR #6), no root `components/` directory, single entry path `index.js` → `App.js` → `src/screens/`. LeaderboardScreen.js intentionally unregistered (see ticket 08).

KD-04 resolved: three competing paths reduced to one.

- [ ] Static imports and runtime smoke coverage confirm the active path before deletion.
- [ ] Inactive top-level legacy screens are removed.
- [ ] Inactive Expo Router starter modules and starter-only support modules are removed or explicitly retained for a proven use.
- [ ] The package entry and active navigation tests remain green.
- [ ] Deletion makes complexity vanish rather than moving it into active callers.
- [ ] KD-04 is marked resolved after verification.

## Pull Request Shape

- Risk: Low after verification
- Complexity: S
- Production change budget: deletions only, except narrow configuration cleanup
- Suggested commits: remove legacy screens; remove starter path; verify sole entry.

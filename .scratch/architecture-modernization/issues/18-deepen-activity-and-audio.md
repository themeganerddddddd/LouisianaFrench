# 18 - Deepen Activity and Audio behavior

**What to build:** Every Activity type shares consistent answer, retry, feedback, and Audio behavior while learning and Dictionary flows use one Audio implementation for bundled assets and native playback lifecycle.

**Blocked by:** 10 - Remove inactive application paths

**Status:** ready-for-agent

- [ ] Answer normalization and independently complex Activity transitions have direct behavior coverage where warranted.
- [ ] Shared retry and feedback rules do not drift between Activity types.
- [ ] Audio identity resolution, replacement, cleanup, missing assets, and playback failure have one module interface.
- [ ] Activity rendering and Dictionary use the same Audio seam without learning native playback implementation.
- [ ] A recording Audio adapter supports module and rendered tests; installed-app journeys cover native integration.
- [ ] The outer Activity rendering interface does not become wider merely to expose private implementation.

## Pull Request Shape

- Risk: Medium
- Complexity: L; split Activity state and Audio lifecycle into separate pull requests
- Production change budget: under 250 lines per pull request
- Suggested commits: characterize shared Activity rules; concentrate answer behavior; define Audio behavior tests; add shared Audio implementation; migrate callers.

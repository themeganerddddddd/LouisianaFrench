# 01 - Establish the Expo test harness

**What to build:** A maintainer can install dependencies from a clean checkout and run one deterministic behavior test through an existing module interface using Expo-supported Jest and React Native Testing Library tooling.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] A non-watch test command exits successfully from a clean checkout.
- [ ] Jest uses the Expo-supported preset and React 19-compatible rendered testing tools.
- [ ] Shared test setup can isolate native dependencies without changing production behavior.
- [ ] At least one narrow existing behavior proves the harness works.
- [ ] No private helper is exported solely to make the test possible.

## Pull Request Shape

- Risk: Low
- Complexity: S
- Production change budget: 0 lines
- Suggested commits: install tooling; add deterministic setup; prove one existing interface.

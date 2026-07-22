# 17 - Deepen the Learner Progress module

**What to build:** Screens and learning sessions record and read Learner Progress without combining raw AsyncStorage records, mastery rules, scheduling quality, XP, streaks, and completion policy themselves.

**Blocked by:** 16 - Deepen the learning session module

**Status:** ready-for-agent

- [ ] Learner Progress behavior is exercised through a focused module interface.
- [ ] AsyncStorage remains the production adapter and storage keys remain inside the implementation.
- [ ] Word mastery, Card scheduling, XP, streak, Lesson completion, and Daily Review behavior have locality.
- [ ] Clock behavior is deterministic and time-zone policy is explicit.
- [ ] Corrupt, missing, partial, and interrupted persistence scenarios have intentional outcomes.
- [ ] Catalog content and Learner Progress remain separate modules even if they later share storage technology.

## Pull Request Shape

- Risk: High
- Complexity: L; split policy concentration from caller migration
- Production change budget: under 250 lines per pull request
- Suggested commits: define progress behavior tests; concentrate progress policy; migrate learning session caller; migrate read-only screens; remove leaked persistence operations.

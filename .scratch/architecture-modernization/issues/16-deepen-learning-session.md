# 16 - Deepen the learning session module

**What to build:** Core Lessons, Daily Review, and Mistake Review use one learning session implementation for answer outcomes, XP, mistakes, Card and Word updates, and completion decisions while screens retain presentation and navigation concerns.

**Blocked by:** 11 - Resolve learning session persistence rules

**Status:** ready-for-agent

- [ ] The agreed learning session rules are captured through one module interface test surface.
- [ ] Core Lesson, Daily Review, and Mistake Review no longer reconstruct the same progression policy independently.
- [ ] Correct, wrong, retry, final wrong, and corrected-mistake scenarios have deterministic module coverage.
- [ ] Persistence failures and completion outcomes are intentional and tested.
- [ ] Screens remain covered through rendered behavior without testing private implementation.
- [ ] The change is split into green caller migrations if one pull request would exceed the production-line budget.

## Pull Request Shape

- Risk: High
- Complexity: L; use expand-migrate-contract across session types
- Production change budget: under 250 lines per pull request
- Suggested commits: define session behavior tests; add deep implementation; migrate core Lesson; migrate Daily Review; migrate Mistake Review; remove shallow orchestration.

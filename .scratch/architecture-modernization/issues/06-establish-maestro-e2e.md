# 06 - Establish iOS and Android Maestro journeys

**What to build:** Maintainers can run critical installed-app journeys reproducibly on iOS and Android, with native CI initially operating outside required pull-request checks.

**Blocked by:** 05 - Add accessible and deterministic testability

**Status:** ready-for-agent

- [ ] Deterministic test state supports first launch, both Languages, core Lesson completion, mistakes, Daily Review, Dictionary, restart persistence, and active navigation.
- [ ] Maestro flows run locally on iOS and Android without coordinate-based selectors.
- [ ] Native CI can run manually or on a schedule without exposing secrets to untrusted forks.
- [ ] Failure artifacts include logs and screenshots, plus recordings where practical.
- [ ] Promotion criteria for one required native pull-request check and both release checks are documented.
- [ ] Module and rendered CI remains the required fast merge gate while native stability is measured.

## Pull Request Shape

- Risk: Medium
- Complexity: L; platform workflow setup may be split after shared flows land
- Production change budget: under 150 lines, all with tests
- Suggested commits: add deterministic native state; add core flows; add iOS execution; add Android execution; add non-blocking workflow.

# 08 - Make completion navigation valid

**What to build:** Every action visible on Lesson completion reaches a registered, loadable destination or is intentionally absent.

**Blocked by:** 04 - Add required tests and lint CI

**Status:** ready-for-human

- [ ] A regression test demonstrates the current invalid Leaderboard route contract.
- [ ] A product decision retains and registers Leaderboard or removes the unfinished action.
- [ ] If retained, Leaderboard loads through a valid Learner Progress import.
- [ ] The active route graph has no unregistered navigation targets.
- [ ] KD-02 and KD-03 are marked resolved after verification.

After a human chooses whether Leaderboard is retained or removed, record the decision under `## Comments` and change `Status:` to `ready-for-agent`.

## Pull Request Shape

- Risk: Low to medium
- Complexity: S
- Production change budget: under 100 lines
- Suggested commits: reproduce route defect; make route contract intentional; resolve ledger entries.

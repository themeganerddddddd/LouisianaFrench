# 07 - Record a final Daily Review mistake once

**What to build:** When a learner gets the final Daily Review Activity wrong, Learner Progress records that wrong result once and completion does not reinterpret it as a correct answer.

**Blocked by:** 04 - Add required tests and lint CI

**Status:** ready-for-human

- [ ] A regression test goes red on the current final-wrong behavior.
- [ ] A human decides whether Daily Review completes after a final wrong answer and whether that Activity awards XP.
- [ ] The final Card receives one intended review result.
- [ ] Word progress does not receive both wrong and correct updates for one answer.
- [ ] XP and completion totals follow the selected wrong-answer rule.
- [ ] Correct and non-final wrong Daily Review behavior remains green.
- [ ] KD-01 is marked resolved after verification.

After the rule is recorded under `## Comments`, change `Status:` to `ready-for-agent` for implementation.

## Pull Request Shape

- Risk: Medium
- Complexity: S
- Production change budget: under 50 lines
- Suggested commits: reproduce defect; apply minimal fix; resolve ledger entry.

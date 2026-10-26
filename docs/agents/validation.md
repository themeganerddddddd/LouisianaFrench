# Validation gates

Machine-checkable gates for coordinators and implementers. Agents must run these scripts and keep the JSON verdict; prose judgment only covers what the script cannot see.

## Gate order

1. **Ticket pack** — `npm run ticket:context -- <issue> --write`  
   Writes `.agent/issue.md` and `.agent/authority.json`. Exit 0 only when the issue looks ready.
2. **Authority refresh** — `npm run validate:authority -- --issue <n>`  
   Rebuilds fingerprints for AGENTS/REVIEW/CONTEXT/lockfile/ADRs.
3. **Plan validate** (before coding) — `npm run validate:plan -- <plan.md>`  
   Requires sections: State closure, Journey ownership, Churn anatomy, Decomposition, Parent coverage, Human decisions, Fixture-first. Verdict `PASS` | `BLOCKED`.
4. **Implement** in a clean worktree (`npm run agent:worktree -- <issue>`).
5. **Drift check** (after pauses / before review) — `npm run validate:drift -- --fixed-point <sha> [--budget 250] [--expect-paths a,b]`  
   Verdict `NO_DRIFT` | `REPLAN` | `BLOCKED`.
6. **Parent ledger** (multi-child work) — `npm run validate:ledger -- --parent <n> [--children a,b]`  
   Each acceptance checkbox needs `(owner: #N)`.
7. **Local review** against `REVIEW.md` (dual-axis). Cap: one review + one fix; evidence-only commits skip full re-review.
8. **PR ready** — `npm run pr-ready`  
   Lint, test, UI evidence, template sections, production LOC guideline.

## Verdict shapes

See `.opencode/schemas/verdict.schema.json`. Legal `verdict` values: `PASS`, `BLOCKED`, `NO_DRIFT`, `REPLAN`, `REVIEW_PASS`, `REVIEW_FAIL`.

## Related

- Session facts: `docs/agents/session-facts.md`
- UI evidence: `docs/evidence/<issue>/` only (never `docs/pr-evidence/`)
- OpenCode agents: `validator.md` and `drift-detector.md` run the matching script first

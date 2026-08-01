---
description: Execute one HomeScreen redesign sub-issue through plan validation, drift checks, coding, and independent reviews.
agent: coordinator
---

Execute GitHub Issue `$1` as exactly one sub-issue of parent #49.

Use a fresh context and process no other issue. Coordinate only: do not inspect, edit, run commands, or review directly. Delegate all work to the repository-wide `general`, `explore`, `coding-specialist`, `review`, and `drift-detector` agents with the role prompts below. Do not create or invoke a HomeScreen-specific agent or skill.

## Authority packet

Give every delegated task the child issue number and body/comments, parent #49, blocker and triage state, `AGENTS.md`, `CONTEXT.md`, relevant ADRs, named design paths, current branch and HEAD, and relevant code and tests. Add the proposed or validated plan, authority fingerprint, merge-base, and diff command when available. Authority comes from the child acceptance criteria, parent spec, approved design handoff, and current repository—not from a prior agent's summary.

## Gates

1. **Frontier.** Spawn `drift-detector` in a fresh context:

   > Establish the execution baseline for HomeScreen redesign issue `$1`. Run `node .opencode/scripts/homescreen-ticket-context.mjs $1`, then independently verify its issue, parent #49, triage, blocker, design-artifact, branch, HEAD, and worktree evidence. Return the complete compact authority packet, script fingerprint, conflicts, and exactly `NO DRIFT` when it is ready or `BLOCKED` when it is not. Issue #56 may use `ready-for-human`, but open blockers or missing human authority still block it. Do not edit or plan implementation.

   Continue only on `NO DRIFT`. Stop if the argument is absent, the issue is not an open child of #49, its canonical triage label is wrong, a blocker is open, a named design artifact is unavailable, or unrelated worktree changes conflict.

2. **Plan.** Spawn `general` in a fresh context with this prompt:

   > Research and plan only; do not edit. Independently read the complete authority packet and affected module interfaces, implementations, tests, and fixtures. Return: authority and conflicts; observable behavior and exclusions; an acceptance ledger mapping every criterion to implementation and verification; the highest practical test seam, compact fixtures, and intended red signal; the smallest ordered vertical slice with files/interfaces and production-line estimate; focused and required checks plus rendered UI evidence; persistence, navigation, lifecycle, accessibility, and rollback risks; and exactly `PLAN READY` or `BLOCKED`. Do not invent missing product decisions.

3. **Validate.** Spawn `explore` in a separate fresh context with the authority packet and proposed plan:

   > Validate only; do not edit and do not trust the planner's conclusions. Re-read the issue, parent, design artifacts, domain docs, affected code, and tests. Check readiness, every acceptance criterion, design fidelity, exclusions, highest practical test seam, fixture-first ordering, compatibility, scope, and production-line estimate. Return `GO` only if every criterion has a complete implementation and verification path and no unresolved decision can invalidate the slice. Otherwise return `NO-GO` with severity-ordered gaps, exact authority citations, and the smallest plan corrections.

   Stop on `NO-GO`. On `GO`, spawn `general` with an operations-only prompt to post a child-issue comment headed `## Validated implementation plan` containing the fingerprint, acceptance ledger, exclusions, test seam and red signal, ordered slice, estimate, checks, rendered evidence, risks, and validator verdict. Then spawn `drift-detector` to refresh and return the post-comment authority fingerprint as the baseline.

4. **Drift.** Before coding, spawn `drift-detector` in a fresh context:

   > Detect drift only; do not edit. Compare the validated plan and baseline fingerprint with fresh child and parent issue state, blockers, labels, design artifacts, base commit, branch, relevant code, and worktree. Return exactly one verdict: `NO DRIFT` when authority is unchanged and the current diff is compatible; `REPLAN` when changed authority or code invalidates a plan assumption; or `BLOCKED` when readiness, missing authority, conflicting edits, or a required human decision prevents safe work. Cite every changed fingerprint or conflicting path.

   `REPLAN` returns to planning. `BLOCKED` stops. Continue only on `NO DRIFT`.

5. **Code.** Spawn `general` with an operations-only prompt to fetch current `main`, verify no unrelated work is overwritten, and create a fresh issue branch. Then spawn `coding-specialist` with the validated plan:

   > Implement only the supplied validated plan on the prepared branch. Read the full authority packet before editing. Establish reusable compact fixtures and a focused failing behavior test first; report why it fails. Implement the smallest complete vertical slice through existing module interfaces, preserve unrelated work, and keep shipped Catalog validation separate from behavior fixtures. For UI work, inspect every named design artifact and preserve its owned hierarchy, copy, dimensions, states, interaction, accessibility, and responsive behavior. Run focused checks during red-green work and all supplied checks at the end. Do not switch branches, commit, push, modify issues, or create a PR. Return changed files, production-line count, red and green evidence, checks, rendered evidence, and limitations.

6. **Review.** Spawn `drift-detector` to rerun the context script with `--allow-dirty` and repeat the drift gate. From the same merge-base diff, spawn two `review` tasks concurrently in fresh contexts. Do not give either reviewer the implementer's self-assessment.

   Specification/UI review prompt:

   > Review only; do not edit. Independently compare the complete merge-base diff with the child issue, parent #49, validated plan, design handoff, domain docs, and ADRs. Build one acceptance ledger and mark every criterion `satisfied`, `partial`, `missing`, or `unverifiable` with code, test, and rendered evidence. Check functional behavior, exclusions, hierarchy, copy, dimensions, color, states, navigation, responsive behavior, accessibility, and interaction. Report material findings in severity order with violated authority, exact file and line, impact, and smallest fix. Return `SPEC PASS` only when no material finding remains.

   Bug review prompt:

   > Review only; do not edit. Inspect the complete merge-base diff for concrete correctness defects, regressions, data loss, lifecycle faults, and tests that can pass while behavior is broken. Use the issue and parent for intended behavior, not visual taste. Challenge state transitions, Language isolation, legacy migration, persisted Card identity, navigation parameters, focus refresh, timers/listeners, async races, empty and completed Catalog states, accessibility behavior, and rollback where applicable. Report only evidenced findings with severity, exact file and line, trigger, learner impact, and smallest fix. Return `BUG PASS` only when no concrete defect remains.

7. **Repair.** If either review fails, resume the same `coding-specialist` task with all confirmed findings in one batch, rerun checks, drift validation, and both fresh reviews once. A second failed review stops for human direction.

8. **Deliver.** Spawn `general` with an operations-only prompt to run `npm test -- --runInBand`, `npm run lint`, and `npm run build`; preserve the exact outputs. After all gates pass, use that agent to commit, push, open a PR from `.github/pull_request_template.md` with `Closes #$1`, and post a child-issue comment headed `## Implementation evidence` with final fingerprint, commit SHA, behavior, acceptance result, check outputs, rendered evidence, review verdicts, limitations, and PR URL. Leave parent #49 open. Issue #56 must stop until a human records the required visual approval.

# Review policy

What reviewers must try to break in this repository. Project rules stay in `AGENTS.md`. Domain terms stay in `CONTEXT.md`.

Review with pstack's `/interrogate` (`/pstack:interrogate` in Claude Code) before you merge. Put this file's **Severity** and **Always check** lists in the intent you give it, so its adversaries try to break those invariants. Do not wait for a GitHub-hosted reviewer.

## Severity

- **BLOCKING** — A reachable break introduced by the diff: wrong lesson or review behavior; Learner Progress changed or lost; Guest study broken; tokens or emails in logs or learner-facing errors; an explainer under `docs/` that no longer matches the code; a missing acceptance criterion; a UI change without screen grabs or a video that show that behavior; an extra feature the linked issue did not ask for.
- **HARDENING** — An unspecced guarantee, style, naming, or "could be DRY." Report at most five per review. Hardening never fails the review.
- **PRE-EXISTING** — Present before the diff. Do not charge it unless the change makes it worse.

Only a verified **BLOCKING** finding blocks the merge. `/interrogate` drops findings that no run proves, so it does not report **HARDENING** items; a person may still note them.

## Do not report

- Lint, formatting, or type issues CI already enforces
- Lockfiles and generated bundles
- Test-only code that intentionally violates a production rule

## Always check

- New behavior has a test in the same change
- A UI change has grabs or a video that match the acceptance criteria; a non-UI change says so, and the diff does not change what a learner sees
- No scope beyond the linked issue
- Identity, session storage, auth, `.github/workflows`, and release config such as `app.json` need a person reading the latest commit; an agent review does not fill that slot

## Proof

A blocking finding needs the violated authority or invariant, exact file and line, a reachable trigger, concrete user impact, and reproduction or direct call-graph or state proof. Do not flag from a name alone.

## Summary and rounds

Start the summary with counts by severity. Say plainly when nothing needs fixing.

Only blocking findings trigger repair. Cap: at most one review and one fix round; after that, narrow the issue instead. On a re-review, judge the new commit; do not restate findings already posted.

Evidence-only commits (paths under `docs/evidence/**` only) do not need a new `/interrogate` run; `npm run check:ui-evidence` is enough.

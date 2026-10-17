# Review policy

Review-only calibration for local reviewers. Project rules stay in `AGENTS.md`. Domain terms stay in `CONTEXT.md`.

Reviews run locally on the branch. Do not wait for a GitHub-hosted reviewer. Draft pull requests stay draft until local reviews pass.

## Severity

- **BLOCKING** — A reachable break introduced by the diff: wrong lesson or review behavior; Learner Progress changed or lost; Guest study broken; tokens or emails in logs or learner-facing errors; an explainer under `docs/` that no longer matches the code; a missing acceptance criterion; a UI change without screen grabs or a video that show that behavior; an extra feature the linked issue did not ask for.
- **HARDENING** — An unspecced guarantee, style, naming, or "could be DRY." Report at most five per review. Hardening never fails the review.
- **PRE-EXISTING** — Present before the diff. Do not charge it unless the change makes it worse.

Only a material **BLOCKING** finding returns `REVIEW FAIL`.

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

Only blocking findings trigger repair. After two failed repairs, stop and write a narrower spec. On a re-review, judge the new commit; do not restate findings already posted.

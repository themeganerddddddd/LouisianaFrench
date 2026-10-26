# Agent Instructions

## Agent skills

Project skills (Cursor and OpenCode) live under **`.agents/skills/<name>/SKILL.md`**. That folder is the shared source of truth. Thin stubs under `.cursor/skills/` only point here. OpenCode-only agent personas stay in `.opencode/agents/`. Gate scripts stay in `.opencode/scripts/` and are invoked via `npm run …`.

Current skills:

- `clear-thinking` — Decision Brief before planning (`/clear-thinking`)
- `local-review` — dual-axis review against `REVIEW.md`
- `pr-ui-evidence` — UI evidence under `docs/evidence/<issue>/`

### Large project coordination

- Use the repository-wide `coordinator` for multi-stage or multi-ticket work where delegation conserves the primary context.
- The coordinator only sequences work and evaluates delegated gate verdicts. It delegates all investigation, implementation, repository operations, and review.
- Use `drift-detector` to compare validated authority, dependencies, base assumptions, and implementation scope before work advances.

### Issue tracker

GitHub Issues are the source of truth for specs and tickets. Do not create local planning files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical local triage roles. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. Read `CONTEXT.md` and relevant decisions under `docs/adr/` before exploring or changing code. See `docs/agents/domain.md`.

## Engineering workflow

- Establish reusable fixtures while writing tests, before broad characterization or substantial production changes. Keep shipped-data validation separate from compact behavior fixtures.
- Work from the unblocked `ready-for-agent` GitHub Issue frontier; use one fresh agent context per issue.
- Preserve characterization separately from behavior changes. A characterization test must not encode a known defect as desired behavior.
- Keep each pull request focused and reviewable. Production changes require tests in the same pull request.
- Run reviews locally against `REVIEW.md`. Draft pull requests stay draft until those reviews pass. Do not depend on a GitHub-hosted reviewer that skips drafts.
- Use `.github/pull_request_template.md` for every pull request, including drafts, and answer each section.
- Never commit or push directly to `main`. Fetch the latest `main`, create a feature branch, and deliver every change through a pull request.
- Write pull request titles and descriptions in clear B2-level English with minimal technical jargon.
- When a change affects the UI, put screen grabs and/or a short video under `docs/evidence/<issue>/`, embed them in the pull request body’s **What a learner sees** section (use `raw.githubusercontent.com` links on that branch commit), and say what was clicked and what happened. A reviewer checks that evidence after the pull request is open. Follow the `pr-ui-evidence` skill when opening or updating such pull requests. Never use `docs/pr-evidence/`.
- Before `gh pr create` or updating a draft for review, run `npm run pr-ready` (lint, test, UI evidence, template, production LOC).
- Run the repository's required checks before marking a ticket complete.

## Validation

- Follow the gate order in `docs/agents/validation.md`: ticket-context → authority → plan-validate → implement → drift-check → review → pr-ready.
- Use npm scripts: `ticket:context`, `validate:authority`, `validate:plan`, `validate:drift`, `validate:ledger`, `validate:fixture-sep`, `check:ui-evidence`, `capture:ui-evidence`, `pr-ready`, `agent:worktree`, `worktree:gc`, `test:changed`.
- Stable package ids and evidence paths: `docs/agents/session-facts.md`.
- Local review entrypoint: `.agents/skills/local-review` (loads `REVIEW.md`). Before `gh pr create`, run `npm run pr-ready`.
- Before planning large or ambiguous work, run `/clear-thinking` (`.agents/skills/clear-thinking`) for a Decision Brief.

## Code quality

### Deep modules

- Prefer deep modules: keep the interface small while the implementation absorbs complexity. Favor locality for maintainers and leverage for callers over shallow wrappers and pass-through modules.
- Use the architecture terms module, interface, implementation, depth, seam, adapter, leverage, and locality. Avoid component, service, API, or boundary when one of these terms is more precise.
- Treat the module interface as the test surface. Test private helpers through their module unless they carry independently complex behavior.
- Apply the deletion test before extracting a module: if deleting it only moves complexity elsewhere, the extraction has not earned its interface.
- One adapter is a hypothetical seam; two adapters demonstrate a real seam. Do not add speculative seams only for testability.
- Accept dependencies and return results where practical. Keep interfaces small, deepen modules rather than layering wrappers, and use `/codebase-design` or `/improve-codebase-architecture` for substantial design work.

### Pragmatic defaults

- Apply DRY to knowledge that must stay synchronized, not merely to code that looks similar.
- Follow YAGNI: do not add speculative abstractions, parameters, adapters, or extension points.
- Preserve orthogonality so one concern can change without edits across unrelated modules.
- Prefer small tracer-bullet vertical slices over broad rewrites. Improve broken windows in code you touch without expanding into unrelated cleanup.
- Name code with the domain terms in `CONTEXT.md`; reject vague names. Fail early and clearly when module invariants are violated.

### Brevity and comments

- Reduce code and prose verbosity without sacrificing readability, explicit behavior, or domain clarity.
- Write comments only when they explain a non-obvious reason, invariant, constraint, explicit design decision, or temporary known-defect marker with a ticket or ledger reference.
- Do not narrate what the code already says or leave commented-out code. Prefer clearer names and structure over explanatory comments.

### Pull request size

- Prefer fewer than 100 lines of production code per pull request and normally keep production changes under 250 lines. Tests, fixtures, documentation, generated files, and shipped data do not count toward this production-code guideline.
- A pull request may exceed 250 production lines only when the size is justified. Confer with the engineer before proceeding and record the agreed justification in the pull request.
- Split larger work into reviewable changes, such as characterization before behavior changes or one module and seam at a time.

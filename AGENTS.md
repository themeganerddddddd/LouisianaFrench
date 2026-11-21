# Agent Instructions

## Agent skills

`.agents/` is the tool-agnostic home for agent tooling. Any LLM agent (Claude Code, Cursor, OpenCode, Codex, …) should look there first:

- **Skills:** `.agents/skills/<name>/SKILL.md` (with optional `references/` and `scripts/` beside it).
- **Check scripts:** `.agents/scripts/*.mjs`, run via `npm run …` (see Validation below).

Tool-specific folders hold only what that tool needs to run: subagent personas and model ids (`.cursor/agents/`, `.opencode/agents/`) and tool config (`.opencode/opencode.json`). Do not put skills or scripts there; `.cursor/skills/` holds only thin stubs that point back to `.agents/skills/`.

**Cursor subagents** (Task / `/name`) live under **`.cursor/agents/`**, ported from `.opencode/agents/` with Cursor models (`grok-4.7-high` for reasoning-heavy roles; `composer-2.5` for implementation; `composer-2.5-fast` for quick explore/ops). OpenCode keeps its own agent files under `.opencode/agents/` (OpenCode model ids and permissions).

Current skills:

- `clear-thinking` — Decision Brief before planning (`/clear-thinking`)
- `local-review` — dual-axis review against `REVIEW.md`
- `pr-ui-evidence` — UI evidence under `docs/evidence/<issue>/`

Cursor subagents: `coding-specialist`, `explore`, `general`. See `docs/agents/skills.md`. pstack playbooks replace the old coordinator, plan, validator, drift-detector and review subagents.

### pstack

This repository uses [pstack](https://github.com/cursor/plugins/tree/main/pstack) as its engineering workflow. Start any non-trivial task with `/poteto-mode` (`/pstack:poteto-mode` in Claude Code).

- **Install:** `.claude/settings.json` adds the `cursor-plugins` marketplace and turns pstack on, but does not download it. In Claude Code, run `claude plugin install pstack@cursor-plugins --scope project` once per clone. If it says pstack is not found in `cursor-plugins`, the marketplace is not registered yet (the folder is not trusted, or this is a new machine): run `claude plugin marketplace add cursor/plugins` first. In Cursor, run `/add-plugin pstack`.
- **Models:** run `/setup-pstack` (`/pstack:setup-pstack` in Claude Code) once per machine. It writes your model choices to your home folder, not to this repository.
- **Precedence:** when a pstack skill or playbook conflicts with a rule in this file, follow pstack. Where pstack says nothing, follow this file.
- **Until the tooling is aligned:** the `PR gates` CI check enforces UI evidence, the PR template sections and production line counts on AI-generated pull requests. These are project additions to pstack.

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
- Run reviews locally against `REVIEW.md`. Open pull requests ready, not as drafts.
- Use `.github/pull_request_template.md` for every pull request: pstack's `opening-a-pr` headings, under 40 lines.
- Tag every pull request an agent opens with the `ai-generated` label (`gh pr create --label ai-generated`). The `PR gates` CI check enforces the agent rules in this file (template headings, line limits, UI evidence) only on labelled pull requests. It also adds the label itself when it finds an agent marker: the Claude Code or Cursor footer in the body, a Claude or Cursor `Co-authored-by` commit trailer, or an `agent/`, `cursor/`, `claude/`, `codex/` or `opencode/` branch. Pull requests a human opens have no label, and these rules do not apply to them; lint, test and build still run for everyone.
- Never commit or push directly to `main`. Fetch the latest `main`, create a feature branch, and deliver every change through a pull request.
- Write pull request titles as `type(scope): subject`, and titles and descriptions in clear B2-level English with minimal technical jargon.
- When a change affects the UI, put screen grabs and/or a short video under `docs/evidence/<issue>/`, embed them in the pull request body’s **Verification** section (use `raw.githubusercontent.com` links on that branch commit), and say what was clicked and what happened. A reviewer checks that evidence after the pull request is open. Follow the `pr-ui-evidence` skill when opening or updating such pull requests. Never use `docs/pr-evidence/`.
- Before `gh pr create` or updating a pull request for review, run `npm run pr-ready`. It runs lint and test, then the same agent gates as CI (`.agents/scripts/pr-gates.mjs`: UI evidence, template, production LOC).
- Run the repository's required checks before marking a ticket complete.

## Validation

- Follow the `/poteto-mode` playbook for the task. These check scripts are tools a playbook step can run: `pr-ready`, `check:ui-evidence`, `capture:ui-evidence`, `validate:fixture-sep`, `test:changed`. `validate:fixture-sep` is advisory and not yet reliable; do not rely on it as a gate.
- The agent gates warn above 100 and fail above 250 production lines added. This is a deliberate project addition to pstack; see Pull request size below. When the engineer agrees to a larger pull request, add the `large-pr-approved` label (`ALLOW_LARGE_PR=1` for a local `pr-ready`).
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

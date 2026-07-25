# Agent Instructions

## Agent skills

### Issue tracker

Specs and tickets live as committed Markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical local triage roles. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. Read `CONTEXT.md` and relevant decisions under `docs/adr/` before exploring or changing code. See `docs/agents/domain.md`.

## Engineering workflow

- Treat the module interface as the test surface. Test private helpers through their module unless they carry independently complex behavior.
- Establish reusable fixtures while writing tests, before broad characterization or substantial production changes. Keep shipped-data validation separate from compact behavior fixtures.
- Work from the unblocked ticket frontier under `.scratch/`; use one fresh agent context per ticket.
- Preserve characterization separately from behavior changes. A characterization test must not encode a known defect as desired behavior.
- Keep each pull request focused and reviewable. Production changes require tests in the same pull request.
- Run the repository's required checks before marking a ticket complete.
- Use the domain terms in `CONTEXT.md` and the architecture terms module, interface, implementation, depth, seam, adapter, leverage, and locality.

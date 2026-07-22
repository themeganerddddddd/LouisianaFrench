# Issue Tracker: Local Markdown

Specs and tickets for this repository live as committed Markdown files under `.scratch/`. GitHub pull requests deliver the work, but GitHub Issues are not the source of planning truth.

## Conventions

- One effort per directory: `.scratch/<effort-slug>/`.
- The effort spec is `.scratch/<effort-slug>/spec.md`.
- Implementation tickets are one file each at `.scratch/<effort-slug>/issues/<NN>-<slug>.md`.
- Ticket numbers start at `01` and follow dependency order.
- `Status:` records the current triage role.
- `Blocked by:` names every ticket that must finish first.
- `Claimed by:` records the agent or person currently working the ticket; omit it while unclaimed.
- `Completed:` records the completion date; omit it until every acceptance criterion and required check passes.
- Comments and investigation notes append under `## Comments`.
- Planning files are committed so agents, reviewers, and future sessions share one work graph.

## Skill Operations

When a skill says "publish to the issue tracker," create or update files under `.scratch/<effort-slug>/`.

When a skill says "fetch the relevant ticket," read the referenced ticket file and its parent spec before exploring implementation.

When implementing, choose one ticket from the frontier: `Status: ready-for-agent`, no `Claimed by:` value, and every `Blocked by` ticket has a `Completed:` date. Claim it by adding `Claimed by:` before implementation. Complete it by checking every acceptance criterion, appending verification evidence under `## Comments`, and adding `Completed: YYYY-MM-DD` only after all required checks pass.

The five triage roles remain the only `Status:` values. Claim and completion are lifecycle metadata, not triage roles.

## Wayfinding

For `/wayfinder`, use `.scratch/<effort>/map.md` and one child file per decision ticket under `.scratch/<effort>/issues/`. Record `Type`, `Status`, and `Blocked by` near the top of each child file.

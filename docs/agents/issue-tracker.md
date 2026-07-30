# Issue Tracker: GitHub Issues

GitHub Issues are the source of truth for engineering specs, decisions, and implementation tickets. Pull requests deliver the work and must link the Issue they address.

Do not create a local `.scratch/` tracker. Historical planning remains available through Git history and merged pull requests.

## Conventions

- Use one GitHub Issue for each spec or independently deliverable ticket.
- Link implementation Issues to their parent spec Issue.
- Record dependencies as `Blocked by #<issue-number>` in the Issue body.
- Put acceptance criteria and required checks in the Issue body.
- Apply exactly one canonical triage label from `docs/agents/triage-labels.md`.
- Use Issue comments for investigation notes, decisions, claims, and verification evidence.
- Assign an Issue to the person or agent working on it when possible.
- Close an implementation Issue only after its acceptance criteria and required checks pass.

## Skill Operations

When a skill says "publish to the issue tracker," create or update a GitHub Issue with `gh issue create`, `gh issue edit`, or `gh issue comment`.

When a skill says "fetch the relevant ticket," use `gh issue view` and read the linked parent spec Issue before exploring implementation.

When implementing, choose one unassigned Issue labeled `ready-for-agent` whose blocking Issues are closed. Claim it by assigning yourself or leaving a claim comment. Complete it by posting verification evidence and closing it after all required checks pass.

The five triage roles remain the only workflow labels. Assignment and open/closed state are lifecycle metadata, not triage roles.

## Wayfinding

For `/wayfinder`, create one parent GitHub Issue for the map and one linked Issue per decision. Record blocking relationships in each Issue body.

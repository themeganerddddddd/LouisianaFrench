# Shared agent skills and subagents

| Path | Who loads it |
| --- | --- |
| `.agents/skills/<name>/SKILL.md` | Cursor and OpenCode (canonical skills) |
| `.cursor/skills/<name>/SKILL.md` | Cursor only — stubs that point at `.agents/skills/` |
| `.cursor/agents/<name>.md` | Cursor subagents (Task / `/name`) |
| `.opencode/agents/*.md` | OpenCode agent personas (OpenCode models/permissions) |
| `.opencode/scripts/*.mjs` | Both — via `npm run` / `node` |

## Cursor subagents (from OpenCode ports)

| Agent | Model | Role |
| --- | --- | --- |
| `coordinator` | `grok-4.7-high` | Delegate-only orchestration |
| `plan` | `grok-4.7-high` | Read-only implementation map |
| `review` | `grok-4.7-high` | Dual-axis REVIEW.md review |
| `validator` | `grok-4.7-high` | Plan/output PASS\|BLOCKED |
| `drift-detector` | `grok-4.7-high` | NO DRIFT\|REPLAN\|BLOCKED |
| `coding-specialist` | `composer-2.5` | Test-first slice implementation |
| `explore` | `composer-2.5-fast` | Read-only reconnaissance |
| `general` | `composer-2.5-fast` | Bounded ops / leftover work |

Keep prompts aligned with `.opencode/agents/` when behavior changes; only frontmatter/models differ.

## Adding a skill

1. Create `.agents/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
2. Optional: `references/`, `scripts/` beside `SKILL.md`.
3. Mention it in `AGENTS.md` if agents should know it exists.
4. Do not duplicate the full skill under `.cursor/skills/` — a one-line stub is enough during transition.

## Adding a Cursor subagent

1. Add `.cursor/agents/<name>.md` with Cursor frontmatter: `name`, `description`, `model`, optional `readonly`.
2. Mirror the prompt body from `.opencode/agents/<name>.md` when the role is shared.
3. Prefer `grok-4.7-high` (or `grok-4.7-xhigh`) for judgment-heavy roles; `composer-2.5` for implementation; `composer-2.5-fast` for quick explore/ops.

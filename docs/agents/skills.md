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
| `coordinator` | `composer-2.5` | Delegate-only orchestration |
| `plan` | `composer-2.5` | Read-only implementation map |
| `coding-specialist` | `composer-2.5` | Test-first slice implementation |
| `review` | `composer-2.5` | Dual-axis REVIEW.md review |
| `explore` | `grok-4.7-high-fast` | Read-only reconnaissance |
| `general` | `grok-4.7-high-fast` | Bounded ops / leftover work |
| `validator` | `grok-4.7-high-fast` | Plan/output PASS\|BLOCKED |
| `drift-detector` | `grok-4.7-high-fast` | NO DRIFT\|REPLAN\|BLOCKED |

Keep prompts aligned with `.opencode/agents/` when behavior changes; only frontmatter/models differ.

## Adding a skill

1. Create `.agents/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
2. Optional: `references/`, `scripts/` beside `SKILL.md`.
3. Mention it in `AGENTS.md` if agents should know it exists.
4. Do not duplicate the full skill under `.cursor/skills/` — a one-line stub is enough during transition.

## Adding a Cursor subagent

1. Add `.cursor/agents/<name>.md` with Cursor frontmatter: `name`, `description`, `model`, optional `readonly`.
2. Mirror the prompt body from `.opencode/agents/<name>.md` when the role is shared.
3. Prefer `composer-2.5` for heavy reasoning; `grok-4.7-high-fast` (or `composer-2.5-fast`) for fast read-only gates.

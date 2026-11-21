# Shared agent skills and subagents

| Path | Who loads it |
| --- | --- |
| `.agents/skills/<name>/SKILL.md` | Every agent tool (canonical skills) |
| `.cursor/skills/<name>/SKILL.md` | Cursor only — stubs that point at `.agents/skills/` |
| `.cursor/agents/<name>.md` | Cursor subagents (Task / `/name`) |
| `.opencode/agents/*.md` | OpenCode agent personas (OpenCode models/permissions) |
| `.agents/scripts/*.mjs` | Every agent tool — via `npm run` / `node` |
| `.agents/schemas/*.json` | Every agent tool — gate verdict shape |
| `.claude/settings.json` | Claude Code — adds the `cursor-plugins` marketplace and turns pstack on (install once per clone) |

pstack itself is not copied into this repository. Claude Code installs it from the `cursor-plugins` marketplace, and Cursor users run `/add-plugin pstack`. See the pstack section in `AGENTS.md`.

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
4. Do not copy the full skill into tool-specific folders; a one-line stub under `.cursor/skills/` is enough.

## Adding a Cursor subagent

1. Add `.cursor/agents/<name>.md` with Cursor frontmatter: `name`, `description`, `model`, optional `readonly`.
2. Mirror the prompt body from `.opencode/agents/<name>.md` when the role is shared.
3. Prefer `grok-4.7-high` (or `grok-4.7-xhigh`) for judgment-heavy roles; `composer-2.5` for implementation; `composer-2.5-fast` for quick explore/ops.

# Shared agent skills

| Path | Who loads it |
| --- | --- |
| `.agents/skills/<name>/SKILL.md` | Cursor and OpenCode (canonical) |
| `.cursor/skills/<name>/SKILL.md` | Cursor only — stubs that point at `.agents/skills/` |
| `.opencode/agents/*.md` | OpenCode agent personas (not Cursor skills) |
| `.opencode/scripts/*.mjs` | Both — via `npm run` / `node` (permissions in OpenCode agents) |

## Adding a skill

1. Create `.agents/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
2. Optional: `references/`, `scripts/` beside `SKILL.md`.
3. Mention it in `AGENTS.md` if agents should know it exists.
4. Do not duplicate the full skill under `.cursor/skills/` — a one-line stub is enough during transition.

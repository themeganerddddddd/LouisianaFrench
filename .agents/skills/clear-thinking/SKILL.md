---
name: clear-thinking
description: Produce a Decision Brief before planning or implementation. Use when scoping a feature, triaging an issue, choosing between approaches, asking "is this the right work?", running a risk/pre-mortem, or before a formal design spec. Trigger with /clear-thinking. Answers whether/what/why — not file maps or task checklists.
disable-model-invocation: true
---

# Clear Thinking

Produce a **Decision Brief** that answers whether to proceed, what outcome matters, and why — before any design spec, implementation plan, or code.

## Pipeline position

```
vague idea
  → /clear-thinking  → Decision Brief
  → /decompose       → Object map + attack order (optional if problem is already small)
  → planning agent   → design spec + implementation plan
  → task contract    → implement
```

**Your job:** clear thinking (whether / what / why).  
**Not your job:** file lists, component trees, architecture diagrams, implementation task checklists, or auto-created tickets. Those belong to `/decompose`, the planning agent, and the task contract.

This repo already uses:
- Always-on agent rules: `AGENTS.md`, domain: `CONTEXT.md`, review: `REVIEW.md`
- Specs and tickets: GitHub Issues (see `docs/agents/issue-tracker.md`) — no local `.scratch/` plans
- Validation gates: `docs/agents/validation.md` and `npm run` scripts (`ticket:context`, `validate:*`, `pr-ready`)
- Triage label `ready-for-agent` means AFK-ready to **implement** (after a plan exists) — not the same as ready-for-planning
- Decision Briefs may be posted as an Issue comment or a short Issue body section; do not create planning files under `.scratch/`

## When to use

- Planning a feature or scoping an issue
- Choosing between approaches
- "Is this the right work?" or "Should we defer?"
- Risk / pre-mortem requests
- Before asking a planning agent for a design spec or implementation plan

**Skip** when the problem is already bounded, a Decision Brief exists, and the user only needs decomposition or planning.

## Hard sequence (follow in order)

Do not skip steps. Do not reorder. Read `references/techniques.md` only when you need technique reminders.

1. **Restate the work in one sentence** — observable outcome for a user. No solutions yet.
2. **Success criteria, non-goals, constraints** — measurable success; explicit exclusions; hard limits (time, risk, compatibility).
3. **Outside view** — 1–3 analogues: how similar work went elsewhere (this repo, industry, or comparable products). Note base rates, surprises, and duration skew.
4. **Options** — 2–3 real options **including "do nothing / defer"**. One line each: what it achieves and main tradeoff.
5. **Premortem on the leading option** — assume it already failed. List concrete failure modes (see `references/techniques.md`).
6. **Consider-the-opposite** — strongest argument against your recommendation. What evidence would flip the verdict?
7. **Decide** — one of: **PROCEED** | **PROCEED (shrunk)** | **DEFER** | **KILL**. Name next action and at least one stop condition.
8. **Ready-for-planning checklist** — copy the checklist below; mark each item; give verdict.
9. **Output** — write the Decision Brief using **exactly** the format in `references/output-template.md`.

## Anti-patterns (forbidden)

- Jumping to implementation details, file paths, module names, or architecture trees
- Auto-creating GitHub issues or tickets without the user asking
- Treating the brief as an implementation plan or task contract
- Empty or vague non-goals ("none", "TBD", "we'll figure it out")
- Skipping **do nothing / defer** as an option
- Recommending PROCEED without a premortem and stop condition
- Inventing user demand or metrics not stated or reasonably inferable

## Ready-for-planning checklist

Include this checklist at the end of every Decision Brief output:

- [ ] Outcome is one observable sentence
- [ ] Non-goals listed
- [ ] Approach chosen; alternatives rejected with reasons
- [ ] Critical unknowns are Decision/Explore tickets or explicitly non-blocking
- [ ] Premortem + at least one stop condition
- [ ] Now-slice named if scope was shrunk (or whole brief is the slice)
- [ ] Provisional risk class set (R0–R3 matching this repo)
- [ ] Brief is readable without chat context

**Verdict:** READY | NOT READY — \<one-line gap\>

If **NOT READY**, state what must be resolved before `/decompose` or the planning agent runs. Do not proceed to planning handoff content that assumes unresolved blockers are solved.

## Risk classes (provisional)

Set a suggested class for the planning agent and task contract:

| Class | When |
|-------|------|
| **R0** | Docs-only or tests-only |
| **R1** | Isolated pure logic or UI |
| **R2** | API route or service behavior |
| **R3** | Data model, auth, security, or migration |

See root `AGENTS.md` for mandatory checks per class.

## References

| Need | Read |
|------|------|
| Technique reminders (premortem, outside view, disconfirming evidence) | `references/techniques.md` |
| Decision Brief section layout and tables | `references/output-template.md` |

## Example trigger (Louisiana French app)

User: "We should add course completion hints so learners know what to do next."

You restate: *Learners see a clear next step when they finish a lesson module.* Then run the full sequence — options might include inline hint vs. dashboard nudge vs. defer until completion tracking exists — without naming React components or `app/` routes.

## After the brief

- **PROCEED / PROCEED (shrunk):** User or planning agent may run `/decompose` (if multi-part) then produce spec + plan.
- **DEFER / KILL:** Stop. No planning handoff except documenting why and what would reopen the decision.

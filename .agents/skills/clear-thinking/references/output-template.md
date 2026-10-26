# Decision Brief Output Template

Copy this structure exactly when producing a Decision Brief. Replace bracketed placeholders. Delete instructional comments.

---

```markdown
# Decision Brief: [Short title]

**Date:** [YYYY-MM-DD]  
**Verdict:** PROCEED | PROCEED (shrunk) | DEFER | KILL  
**Ready for planning:** READY | NOT READY — [one-line gap if NOT READY]  
**Suggested risk class:** R0 | R1 | R2 | R3

## One-sentence problem

[What is wrong or missing today, from the user's perspective — not the solution.]

## Desired outcome

[One observable sentence: what users can do or experience when this succeeds.]

## Success criteria

- [Measurable or observable criterion 1]
- [Criterion 2]

## Non-goals

- [Explicit exclusion 1]
- [Explicit exclusion 2]

## Constraints

- [Time, compatibility, policy, or resource limits]

## Chosen approach

[2–4 sentences: what we will do at a capability level — no file paths or component names.]

**Now-slice (if PROCEED shrunk):** [Name the slice included in this brief, or "Whole brief."]

## Options considered

| Option | Summary | Rejected because |
|--------|---------|------------------|
| [A — leading] | | N/A — selected |
| [B] | | |
| [C — do nothing / defer] | | |

## Why this (outside view)

| Analogue | What happened | Implication for us |
|----------|---------------|---------------------|
| [1] | | |
| [2] | | |

## Premortem (leading option)

| Failure mode | Leading indicator | Threshold / response |
|--------------|-------------------|----------------------|
| | | |
| | | |

**Stop conditions (at least one):**

- [Concrete condition that triggers DEFER, KILL, or scope shrink]

## Disconfirming checks

- [ ] [Check that could flip the recommendation — who runs it, by when if known]

## Consider-the-opposite

[Strongest argument against the recommendation. Why we still proceed / defer / kill.]

## Planning handoff

**Planner must produce:**

- Design spec under `docs/superpowers/specs/`
- Implementation plan under `docs/superpowers/plans/`

**Planner must preserve:**

- Desired outcome and non-goals above
- Chosen approach and now-slice boundaries
- Stop conditions and disconfirming checks

**Open questions for planner:**

- [Question 1]

**Do-not-plan-yet:**

- [Work that depends on unresolved Decision/Explore items]

## Tracking proposals (propose only — do not auto-create)

| Proposed ticket | Type | Purpose |
|-----------------|------|---------|
| [Optional] | Decision / Explore / Implement | [Only if blocker or explicit user request] |

## Ready for planning checklist

- [ ] Outcome is one observable sentence
- [ ] Non-goals listed
- [ ] Approach chosen; alternatives rejected with reasons
- [ ] Critical unknowns are Decision/Explore tickets or explicitly non-blocking
- [ ] Premortem + at least one stop condition
- [ ] Now-slice named if scope was shrunk (or whole brief is the slice)
- [ ] Provisional risk class set (R0–R3 matching this repo)
- [ ] Brief is readable without chat context

**Verdict:** READY | NOT READY — [one-line gap]
```

---

## Section rules

- **Verdict** and **Ready for planning** must agree. KILL/DEFER → typically NOT READY for implementation planning; may still be READY for a minimal "document decision" spec if user asks.
- **Options considered** must include do-nothing or defer.
- **Premortem** table needs at least two rows for PROCEED / PROCEED (shrunk).
- **Planning handoff** describes outputs for the **planning agent**, not a task checklist for implementers.
- **Tracking proposals:** propose titles and types only. Create issues only if the user explicitly asks.

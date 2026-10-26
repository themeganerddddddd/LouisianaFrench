# Clear Thinking Techniques

Practical reminders for the hard sequence in `SKILL.md`. Use these to improve judgment, not to pad the brief.

## Choice architecture: fixed sequence before commit

Commit to the numbered sequence **before** generating options or a recommendation. Research on structured decision protocols reduces premature closure and anchoring on the first idea.

**Do:** finish step 1 (one-sentence outcome) with zero solution words.  
**Do not:** "helpfully" sketch architecture while restating the problem.

## Anti-AI-offloading: frame independently first

Studies on AI-assisted work find a common failure mode: users (and agents) accept fluent drafts without independent problem framing. The first model output becomes the problem statement.

**Do:** write the one-sentence outcome and non-goals in your own words before listing options.  
**Do not:** let the leading option from step 4 rewrite the outcome from step 1.

If the user pasted a long spec, extract the outcome sentence; do not mirror their structure as if it were already validated.

## Outside view / reference class / planning fallacy

**Inside view:** "here is our plan, here is why it will work."  
**Outside view:** "how did similar efforts actually go?"

Kahneman and others: planners systematically underestimate time, cost, and surprise when they reason from unique details. A **reference class** of 1–3 analogues anchors expectations.

**Good analogue sources:**
- Prior work in this repo (search issues, specs, postmortems)
- Comparable features in language-learning or ed-tech products
- Internal migrations or rollouts with similar risk shape

**Record:** typical outcome, worst plausible outcome, and what surprised teams last time.

## Premortem / prospective hindsight (Klein; Mitchell, Russo, Pennington)

**Prospective hindsight:** "Imagine it is six months later and this failed badly. Why?"

Klein's premortem: assume failure is **already decided** and explain causes. This legitimates dissent and surfaces risks that polite planning meetings suppress.

**Do:** list 3–7 specific failure modes tied to the **leading option**, not generic project risks.  
**Do:** map each to a **leading indicator** (early signal) and **threshold / response** (what you do when you see it).

**Weak:** "Users might not like it."  
**Strong:** "Completion rate unchanged after 4 weeks → stop A/B and revisit outcome metric."

## Consider-the-opposite

Before locking PROCEED, articulate the best case for the runner-up or for DEFER/KILL.

**Prompts:**
- What would a skeptical staff engineer say?
- What single new fact would change the verdict?
- Are we proceeding because of evidence or because we already wrote the brief?

## Active open-mindedness / disconfirming evidence

Seek observations that **would** change your mind, then note whether those checks are cheap enough to run before planning.

**Disconfirming checks** belong in the brief as explicit tests — not as vague "we'll monitor feedback."

| Type | Example |
|------|---------|
| Metric | "If \<5% of finishers click the hint in week 2, design is wrong" |
| Feasibility | "If lesson graph API lacks completion events, defer until tracking lands" |
| Risk | "If legal flags learner email in copy, kill email channel" |

## When techniques conflict

If outside view says "usually takes 2× longer" but premortem says "failure mode is low adoption," both stay in the brief. The decision is which risk you accept — not which technique "wins."

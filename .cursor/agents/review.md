---
name: review
description: >-
  Adversarial dual-axis review against REVIEW.md (Standards and Spec). Use
  proactively before marking a draft PR ready. Read-only; findings are the
  product.
model: composer-2.5
readonly: true
---

Conduct an adversarial, read-only review. Findings are the product.

Primary policy: `REVIEW.md` (severity `BLOCKING` / `HARDENING` / `PRE-EXISTING`). Also read `AGENTS.md` and `CONTEXT.md`.

1. **Baseline.** Establish the fixed point and complete diff. Read `REVIEW.md`, `AGENTS.md`, `CONTEXT.md`, relevant ADRs, supplied Issues or specifications, and named artifacts. Record unavailable authority. Classify findings with the severity rules in `REVIEW.md`.
2. **Inspect.** Read every changed hunk and enough surrounding implementation, callers, tests, fixtures, and persisted-data paths to evaluate effects. Treat summaries as claims, not evidence.
3. **Challenge.** Check the requested axis; when it is open, check specification coverage and repository standards, including correctness, regressions, lifecycle, migration, accessibility, module depth, false-positive tests, and edge cases. Calibrate depth to validated scope and behavior changed by the diff; do not silently expand the ticket into general transactional, restart, failure-recovery, or hardening work.
4. **Classify.** Classify each candidate as `BLOCKING`, `HARDENING`, or `PRE-EXISTING`. A blocking finding must violate cited authority or be a reachable regression introduced by the diff. Hardening adds an unspecced guarantee. Pre-existing behavior is not charged to the diff unless the change makes it worse.
5. **Prove.** A blocking finding requires the violated authority or established invariant, exact file and line, reachable trigger, concrete user impact, and reproduction or direct call-graph/state proof. Label hypothetical process failures, adversarial timing, or guarantees absent from authority as hardening unless the diff newly exposes them.
6. **Branch.** If unavailable authority prevents a safe judgment, return `REVIEW BLOCKED`. Otherwise account for every acceptance criterion and modified behavior, then report blocking findings first. Keep hardening opportunities and pre-existing defects separate and non-blocking.
7. **Verdict.** Return `REVIEW FAIL` only for a material `BLOCKING` finding. Return `REVIEW PASS` when no blocking finding remains, even when hardening opportunities exist. Recommend `REPLAN` rather than a local fix when the smallest correction needs an unplanned module, interface, persisted shape, or observable guarantee.

Before narrative review, run mechanical gates when available: `npm run check:ui-evidence`, and note `npm run pr-ready` expectations. Evidence-only commits (`docs/evidence/**` only) skip full dual-axis re-review per `REVIEW.md`.

## Completion gate

- [ ] The fixed point, complete diff, authority, and review axis are recorded.
- [ ] Every acceptance criterion and modified behavior has an evidence-backed status.
- [ ] Every blocking finding has authority, reachability, impact, and proof.
- [ ] Hardening opportunities and pre-existing defects are separated from blocking findings.
- [ ] Findings, testing gaps, and open questions have exact citations.
- [ ] The review did not expand validated scope or impose new guarantees without authority.
- [ ] The repository and external systems are unchanged.

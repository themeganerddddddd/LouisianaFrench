---
name: local-review
description: >-
  Run LouisianaFrench dual-axis local review against REVIEW.md before marking a
  draft PR ready. Use when reviewing a branch, finishing agent work, or checking
  whether local review gates pass (pr-ready / validate).
---

# Local review (Louisiana Languages)

Primary policy: **`REVIEW.md`** (severity `BLOCKING` / `HARDENING` / `PRE-EXISTING`). Also read `AGENTS.md` and `CONTEXT.md`.

## Dual-axis

Review the diff since the fixed point (usually `origin/main`) on both axes:

1. **Standards** — does the change follow `REVIEW.md` and repo rules?
2. **Spec** — does the change match the linked issue / acceptance criteria?

Draft PRs stay draft until these local reviews pass.

## Commands

Prefer the repo scripts when present:

```bash
npm run pr-ready
npm run validate:drift -- --fixed-point origin/main
npm run check:ui-evidence -- --base origin/main
```

If those scripts are missing, run the dual-axis review manually per the personal `code-review` skill, calibrated to `REVIEW.md`.

## Evidence-only commits

When the new commit only touches `docs/evidence/**`, skip a full dual-axis re-review; a mechanical UI evidence check is enough (see `REVIEW.md` Summary and rounds).

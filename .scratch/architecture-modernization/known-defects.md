# Known-Defect Ledger

These behaviors are evidence-backed defects or unresolved contradictions. Characterization tests must not encode them as desired behavior. Each receives a focused regression test in its fix ticket.

## KD-01: Final Daily Review mistake is also recorded as correct

**Resolution:** fixed (PR #10, ticket 07)

## KD-02: Lesson completion links to an unregistered route

**Resolution:** intentional WIP (ticket 08)

## KD-03: Leaderboard module has an invalid storage import

**Resolution:** intentional WIP (ticket 08)

## KD-04: Three application paths compete for maintainer attention

**Resolution:** fixed (ticket 10)

- Verified: `app/` and root `components/` directories removed.
- Risk: resolved.

## KD-05: Mistake Review does not update Card or Word progress

**Resolution:** intentional (ticket 11)

## KD-06: Missing Lesson data can fail before the loading guard

**Resolution:** fixed (PR #11, ticket 09)

## KD-07: Repository Audio generation instructions and inputs disagree

**Resolution:** open

- Evidence: `scripts/generate_lessons.py` reads `cajun.csv` and `kreole.csv`, while `scripts/generate_audio_manifest.py` expects differently named CSV files not present at the root.
- Risk: the documented generation flow may not run from a clean checkout.
- Characterization rule: validate current bundled Audio identities without treating either generation script as the future contract; both are retired by the SQLite migration.

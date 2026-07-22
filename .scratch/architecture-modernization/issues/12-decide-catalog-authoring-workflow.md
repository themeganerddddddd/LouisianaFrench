# 12 - Decide Catalog authoring and release workflow

**What to build:** Maintainers receive an explicit workflow for creating, reviewing, validating, and shipping changes to the canonical bundled SQLite Catalog after CSV and generated JSON are retired.

**Blocked by:** 10 - Remove inactive application paths

**Status:** ready-for-human

- [ ] The editable source of Catalog truth is selected without contradicting SQLite's canonical role.
- [ ] The workflow for adding and changing Languages, Units, Lessons, Words, Activities, and Audio identities is defined.
- [ ] Database construction, validation, schema versioning, and release responsibilities are defined.
- [ ] Reviewers can inspect meaningful Catalog changes without relying on an opaque binary diff alone.
- [ ] Rollback and compatibility expectations for shipped Catalog versions are defined.
- [ ] Hard-to-reverse decisions are recorded in an ADR.
- [ ] Follow-up implementation acceptance criteria are updated if the decision requires it.

## Pull Request Shape

- Risk: None; decision ticket
- Complexity: M
- Production change budget: 0 lines
- Suggested commits: document authoring options and trade-offs; record the selected workflow; update SQLite ticket acceptance criteria if needed.

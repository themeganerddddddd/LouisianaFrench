# 14 - Build the bundled SQLite Catalog

**What to build:** An installed application can open a validated bundled SQLite Catalog that provides the same domain behavior as the temporary JSON adapter while Learner Progress remains untouched.

**Blocked by:** 12 - Decide Catalog authoring and release workflow; 13 - Deepen the Catalog module

**Status:** ready-for-agent

- [ ] The SQLite schema represents both Languages, Units, Lessons, Words, Activities, and Audio identities.
- [ ] A reproducible builder creates the bundled database from the approved canonical authoring workflow.
- [ ] Fresh open, schema version, Unicode, ordering, relationships, and validation tests pass.
- [ ] Initialization is idempotent and transaction failure does not expose a partial Catalog.
- [ ] The shared Catalog behavior suite passes against JSON and SQLite adapters.
- [ ] Native integration succeeds on iOS and Android.
- [ ] Learner Progress remains in AsyncStorage and survives Catalog initialization.

## Pull Request Shape

- Risk: High
- Complexity: L; split schema/builder and runtime adapter into separate pull requests
- Production change budget: under 250 lines per pull request
- Suggested commits: add SQLite support; specify schema; build database; add adapter; prove parity.

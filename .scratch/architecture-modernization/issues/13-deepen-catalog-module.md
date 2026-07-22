# 13 - Deepen the Catalog module

**What to build:** Learning callers consume Catalog behavior without knowing bundled JSON structure, whole-Catalog loading assumptions, fallback fields, or future SQLite representation.

**Blocked by:** 10 - Remove inactive application paths; TypeScript migration decision ticket `01`

**Status:** ready-for-agent

- [ ] A shared Catalog behavior suite defines the interface without specifying storage representation.
- [ ] The existing JSON implementation remains behaviorally equivalent.
- [ ] Ordering, deduplication, labels, and Activity assembly gain locality inside the Catalog module.
- [ ] Screens do not learn SQL, tables, joins, schema versions, or native database objects.
- [ ] Changes remain vertical and under the production-line budget; caller batches are split if necessary.
- [ ] No generalized adapter framework is added beyond the demonstrated JSON-to-SQLite migration need.

## Pull Request Shape

- Risk: Medium
- Complexity: L; use expand-migrate-contract tickets if caller changes exceed one reviewable pull request
- Production change budget: under 250 lines per pull request
- Suggested commits: define behavior suite; deepen JSON implementation; migrate callers in green batches.

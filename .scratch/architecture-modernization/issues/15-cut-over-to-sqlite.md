# 15 - Cut over to the SQLite Catalog

**What to build:** Learners use bundled SQLite as the sole canonical Catalog, with obsolete CSV, generated JSON, and migration-only implementation removed after native parity is proven.

**Blocked by:** 14 - Build the bundled SQLite Catalog

**Status:** ready-for-agent

- [ ] Runtime selects the SQLite Catalog implementation.
- [ ] Required CI validates the bundled database before merge.
- [ ] Module and rendered tests pass with the SQLite adapter.
- [ ] CSV source, generated JSON, obsolete generation scripts, and the JSON adapter are removed.
- [ ] Catalog maintenance and schema evolution are documented.
- [ ] KD-07 is marked resolved by removal or replacement of the inconsistent generation flow.

## Pull Request Shape

- Risk: High
- Complexity: M
- Production change budget: mostly deletions
- Suggested commits: select SQLite; add CI validation; remove legacy Catalog inputs; update maintenance docs.

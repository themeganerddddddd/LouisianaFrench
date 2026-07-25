# 02 - Localize the Catalog source

**What to build:** Catalog acquisition sits behind the smallest internal seam so behavior tests can supply compact Catalog data while production callers continue using the unchanged Catalog interface and bundled JSON behavior.

**Blocked by:** Architecture modernization ticket 02 - Characterize Catalog and Learner Progress

**Status:** ready-for-agent

- [ ] Existing Catalog exports and caller behavior remain unchanged.
- [ ] Bundled JSON acquisition and Language selection gain locality inside the Catalog implementation.
- [ ] Existing Catalog characterization passes before and after the change.
- [ ] Fixture substitution cannot leak between tests through global module state or Jest caches.
- [ ] Unknown Language behavior remains characterized rather than changed.
- [ ] No private transformation helper becomes part of the test surface.
- [ ] No SQLite implementation, generalized adapter registry, or dependency container is introduced.
- [ ] Production changes remain under 250 lines and include tests in the same pull request.

## Pull Request Shape

- Risk: Medium; internal production refactor with no intended behavior change
- Complexity: M
- Production change budget: under 150 lines
- Suggested commits: strengthen Catalog parity assertions; localize bundled Catalog acquisition; verify unchanged public behavior.

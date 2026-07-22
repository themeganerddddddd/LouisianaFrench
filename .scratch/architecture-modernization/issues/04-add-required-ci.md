# 04 - Add required tests and lint CI

**What to build:** Every pull request and push to `main` receives stable GitHub Actions test and lint checks suitable for required branch protection.

**Blocked by:** 02 - Characterize Catalog and Learner Progress; 03 - Characterize Activities, screens, and navigation

**Status:** ready-for-agent

- [ ] CI installs with `npm ci` and caches npm dependencies by lockfile.
- [ ] CI runs deterministic test and lint commands without watch mode.
- [ ] Workflow permissions are read-only unless a documented job requires more.
- [ ] Superseded runs for the same pull request or branch cancel.
- [ ] Required job names are stable and documented for branch protection.
- [ ] Failures expose sufficient logs or retained diagnostics.
- [ ] No secret is required for ordinary or fork pull requests.

## Pull Request Shape

- Risk: Low to medium
- Complexity: S
- Production change budget: 0 lines
- Suggested commits: add quality scripts; add workflow; document required checks.

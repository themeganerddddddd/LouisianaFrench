# 19 - Promote stable native journeys to merge gates

**What to build:** Agent-generated pull requests receive native regression protection at a measured, sustainable cadence after Maestro stability is demonstrated.

**Blocked by:** 06 - Establish iOS and Android Maestro journeys; 07 - Record a final Daily Review mistake once; 08 - Make completion navigation valid; 09 - Handle unavailable Lessons intentionally

**Status:** ready-for-agent

- [ ] Native workflow flake rate and duration are measured over an agreed observation window.
- [ ] At least one native platform is promoted to a required pull-request check only if it meets the stability threshold.
- [ ] Both iOS and Android remain required before release.
- [ ] Fork pull requests do not receive secrets and have a documented safe execution path.
- [ ] Failed runs retain actionable logs, screenshots, and recordings.
- [ ] Branch protection check names and rerun policy are documented.

## Pull Request Shape

- Risk: Medium; workflow policy can block merges
- Complexity: S
- Production change budget: 0 lines
- Suggested commits: document stability evidence; promote eligible check; document release gates and rerun policy.

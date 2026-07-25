# 01 - Decide the TypeScript migration strategy

**What to build:** Maintainers receive an evidence-backed, incremental TypeScript migration order that preserves green tests and determines how the upcoming SQLite Catalog work should be typed.

**Blocked by:** Architecture modernization tickets 04 - Add required tests and lint CI; 10 - Remove inactive application paths

**Status:** ready-for-human

- [ ] Current JavaScript blast radius and active module interfaces are mapped.
- [ ] The team selects before, alongside, or after SQLite ordering.
- [ ] JavaScript interoperability and strictness are selected.
- [ ] Runtime validation at SQLite and AsyncStorage seams is selected.
- [ ] The first tracer bullet and reviewable pull-request sequence are identified.
- [ ] No production source is converted in this decision ticket.

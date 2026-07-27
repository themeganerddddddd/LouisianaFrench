# Deferred: Native E2E (Maestro)

Native Maestro journeys (tickets 06, 19) are deferred indefinitely. The
application has no users yet; Jest characterization + required CI (lint,
test, build) provide sufficient merge safety at this scale. TestFlight
covers human smoke testing.

Maestro should be revisited when:

- The SQLite migration reaches ticket 15 and device-level proof is needed,
  or
- The user base grows enough that installed-app regressions hurt real
  learners, or
- A CI budget and device cloud are available.

When revisited, pick up from the accessibility labels in ticket 05 and
the EAS project config already in place.

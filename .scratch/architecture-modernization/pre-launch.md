# Pre-launch — tickets pruned

Remaining architecture modernization tickets (13-18) intentionally removed. The app is in pre-launch: move fast, deliver features, revisit structural cleanup later.

What shipped and stays in the codebase:
- Jest characterization (Activities, screens, navigation, catalog, storage)
- Required CI (lint, test, build)
- Accessibility labels on critical controls
- Clock seam + deterministic randomness
- Defect fixes (KD-01, KD-06)
- Session rules module (src/learning/sessionRules.js)
- Known-defect ledger for remaining KD items

Deferred until post-launch:
- SQLite migration (tickets 13-15)
- Learner progress deepening (17)
- Activity/audio deepening (18)
- Maestro E2E (already deferred)

# Use bundled SQLite as the canonical Catalog (backlogged)

**Status:** backlogged — do not implement until revisit criteria below are met.

## Intent (deferred)

The future Catalog may use a bundled SQLite database as both its canonical source and runtime implementation, replacing generated JSON while staying behind the Catalog seam so screens and learning modules do not learn tables, queries, joins, or schema versions. Learner Progress remains a separate module (AsyncStorage / Saved Learner Progress), not rows in that Catalog database.

## Current Catalog path (accepted for now)

Authoring stays in `cajun.csv` / `kreole.csv`. Generation produces `src/data/cajunLessons.json` and `kreoleLessons.json`. Runtime loads them once through `lessonLoader` / `createCatalog`. Audio resolves through Catalog `resolveAudio`; the bundled mp3 map stays a Catalog-internal adapter.

## Why SQLite is not warranted yet

As of the Identity / modularization line (~2026-10-28 America/Chicago):

- Size is small: about **1.1 MB** JSON total (~642 KB Louisiana French, ~465 KB Kouri-Vini); on the order of **~50 / ~42** Lessons, **~400 / ~300** Words, **~750 / ~620** Activities per Language.
- Load cost is modest: a cold require of both lesson JSON files was about **~7 ms** in a plain-Node bench. After first import, callers work on in-memory arrays.
- Access pattern is whole-language lists (`getAllWords`, `getAllActivities`, Home projection, review queue), not selective indexed queries. A SQLite adapter that still materializes those full lists would not beat in-memory JSON at this scale and would add Expo / web complexity.

Hosted MySQL or Postgres is the wrong runtime store for this Catalog: the product ships read-only curriculum offline. Server SQL already backs Identity and Saved Learner Progress; mixing Catalog there would couple lessons to network and blur those modules. A future CMS may still **export** a bundle; that is not the on-device source of truth.

## Revisit when

Pick up this ADR when at least one is true:

1. Catalog size or cold parse/load becomes a measured learner-facing hitch, or
2. Callers need selective relational queries without loading a whole Language into memory, or
3. Authoring outgrows CSV → JSON and needs stronger shipped integrity than generation tests provide.

Until then, deepen the Catalog interface (as with `resolveAudio`) and keep CSV → generated JSON.

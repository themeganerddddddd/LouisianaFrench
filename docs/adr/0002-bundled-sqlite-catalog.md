# Use bundled SQLite as the canonical Catalog

The future Catalog will use a bundled SQLite database as both its canonical source and runtime implementation, replacing CSV source files and generated JSON. SQLite will remain behind the Catalog seam so screens and learning modules do not learn tables, queries, joins, or schema versions; Learner Progress remains a separate module backed by AsyncStorage.

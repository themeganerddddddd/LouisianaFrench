# Save Learner Progress per Language per Identity

A signed-in learner should get one Language's Learner Progress back after removing the app. Saved Learner Progress is one set of rows per Identity per Language in the same Supabase project that holds the Identity, protected so a learner can read and write only their own rows. Those rows are columns for the profile, Lessons, Words, Cards, mistakes, and review days. They are not one JSON document. The lesson Catalog stays a separate bundled store. A Guest has no Saved Learner Progress. A Progress clash does not merge, and neither side replaces the other.

Export files, platform backup, and a second database were set aside. Platform backup does not follow the Identity to a new phone. A separate store would add a second set of credentials. Merging two histories was deferred because a bad merge deletes the Learner Progress this record exists to keep.

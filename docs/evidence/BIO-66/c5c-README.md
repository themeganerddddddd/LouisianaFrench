# BIO-66 C5c: Change username

Shots come from an uncommitted local harness on `emulator-5580` (`lf-api35`, Expo Go, `lfv`, Metro on this worktree). It replaced `App.js` with a Language switch, an "Open Signed in" button that dispatches the real `opened(identity)` event for an Email user named Elise, and a stub connector. The stub answers `setUsername("taken_name")` with taken, `"reserved_name"` with reserved, `"late_name"` with too soon (retry 2026-12-24), and `checkUsername("elise")` with `current`. The harness was removed before this commit. iOS was not driven.

Board numbers are my reading of the ticket: 17A change mode just opened, 17B taken, 17C reserved, 19 too soon with the date. Each is in `-lf` (Louisiana French, blue) and `-kv` (Kouri-Vini, green): `c5c-<board>-<lf|kv>.png`.

## Click path

1. Harness: tap **Louisiana French** or **Kouri-Vini**, tap **Open Signed in**, tap **Change username** (17A). The field is prefilled "Elise", the helper is the format hint, and Save username is disabled.
2. Clear the field, type `taken_name`, tap **Save username**: "That username is taken." (17B). Save stays disabled.
3. Type `reserved_name`, Save: "That username isn't available. Try another." (17C).
4. Type `late_name`, Save: "You can change your username again on December 24, 2026." (19).

## Notes from the shots

- Before Save, typing a new name shows "<name> is available." (seen in a UI dump, not saved as a shot).
- In board 19 (too soon) Save username is enabled (full colour) after the error. In 17B and 17C it is disabled. This is current behaviour and not changed here.
- The error copy is the same text in both Languages; only the accent colour differs.
- Not captured: a successful save back to Signed in, the 400 ms saving state, and the "checking" ring. The stub is instant for the other states and no shot of these was taken.

## Regression

Real `App.js`, fresh install, Metro on this branch, `.env.local` copied in temporarily and removed. Home (`c5c-regression-01`), a lesson with one correct answer (`02`) and one skip (`03`), Home with Mistakes "1 pending" (`04`), Mistake Review (`05`), Daily Review empty queue (`06`), Speech Hub (`07`), Kouri-Vini Home (`08`). No crash, blank screen or stuck control; no error lines in Metro logs. One Android BACK press from a New word activity in my first attempt left Expo Go, so I reopened with `lfv open` and redid the path; BACK from the lesson after the skip returned Home. Daily Review with a due Card and recording were not driven. The account modal is not mounted on Home (C5d).

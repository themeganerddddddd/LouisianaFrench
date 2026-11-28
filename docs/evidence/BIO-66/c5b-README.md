# BIO-66 C5b: Set new password, Password saved, Signed in

The modal is not mounted on Home (C5d does that). `SHOW_ACCOUNT_MENU_ENTRY` stays false. Shots come from an uncommitted local harness on `emulator-5580` (`lf-api35`, Expo Go, `lfv`): it replaced `App.js` with a Language switch, buttons that dispatch real machine events (`recoveryLinkOpened`, `opened(identity)`), and a stub connector. The harness was removed before this commit. iOS was not driven.

Board numbers are my reading of the ticket (the mockups could not be opened): 5A Set new password, 5B Password saved, 6A Signed in by Email with a username, 6B Signed in by Email with no username, 16A Google with a username, 16B Google with no username, 16C Sign out in progress (button locked, Close gone, stub never answers). Each is in `-lf` (blue) and `-kv` (green) files named `c5b-<board>-<lf|kv>.png`.

## Click path

1. Harness: tap **Louisiana French** or **Kouri-Vini**, then **Open 5A**. Set new password shows with no Close; heading is left-aligned (5A).
2. Tap the dimmed backdrop: the sheet stays. Press Android back: the sheet stays.
3. Type `longenough1`, tap **Save password**: Password saved (5B). Tap **Continue**: the sheet closes.
4. Tap **Open 6A**, **6B**, **16A**, **16B** and close each with Close.
5. Open 16A, tap **Sign out**: the button locks and Close disappears (16C).

"Set a username" / "Change username" are placeholders, wired in C5c. Delete account is inert until C8.

## Regression

Fresh install, Metro on this branch, no harness: Home (`c5b-regression-01`), a lesson with one correct answer and one skip (`02`, `03`), Home with Mistakes "1 pending" (`04`), Mistake Review (`05`), Daily Review empty queue (`06`), Speech Hub (`07`), Kouri-Vini Home (`08`). No crash, blank screen or stuck control. Daily Review with a due Card and recording were not driven.

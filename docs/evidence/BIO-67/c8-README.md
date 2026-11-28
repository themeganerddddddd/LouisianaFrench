# BIO-67 C8: delete account in the app

Real `HomeScreen` on `emulator-5580` (`lf-api35`, Expo Go, `lfv`, Metro on this worktree). Android only; iOS was not driven.

Uncommitted harness, all reverted before commit:

- `SHOW_ACCOUNT_MENU_ENTRY = true` to open the modal from the About menu (the flag is false in every commit).
- A stub identity connector in `HomeScreen` (signed in as `ada@example.com`, username Ada) whose `deleteAccount` waits 8 s, announces a guest and returns `{ ok: true }`. No Dev or Prod account was touched and the real `delete-account` function was never called.

Click path: About menu (pelican) → Account, Ada → Delete account → type `DELETE` → Delete account → wait → Back to lessons → About menu now shows "Sign in or create one".

Shots (`-lf` Louisiana French blue, `-kv` Kouri-Vini green):

- `c8-<lf|kv>-7A-empty`: Confirm, Delete disabled.
- `c8-<lf|kv>-7A-armed`: `DELETE` typed, Delete enabled.
- `c8-<lf|kv>-7B`: Deleting, spinner and "Deleting account…", input, Keep my account and Close locked.
- `c8-<lf|kv>-8A`: Account deleted, "You're learning as a guest now."
- `c8-<lf|kv>-8B-home-guest`: after Back to lessons, the modal is closed and Home is shown as a guest.

## Regression

Real Home, fresh install, flag false, no stub: Home (`c8-reg-01`), a lesson (`02`), Review and Mistakes (`03`, `04`: both are disabled on a fresh install, so tapping stayed on Home), Speech Hub (`05`). No error lines in Metro logs. BACK from Home leaves Expo Go; that is the platform. Daily Review and Mistake Review screens were not opened (nothing due).

## Pending

The Dev row-count check (users and profiles going to 0 for a Dev account made for the run) is pending Logan's approval and was not run.

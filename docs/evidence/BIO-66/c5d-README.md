# BIO-66 C5d: AccountModal on Home

Real `HomeScreen` on `emulator-5580` (`lf-api35`, Expo Go, `lfv`, Metro on this worktree, Dev Supabase from a temporary `.env.local`, removed). iOS was not driven.

Uncommitted local triggers, all reverted before commit:

- `SHOW_ACCOUNT_MENU_ENTRY = true` to open the modal from the About menu (the flag is false in every commit).
- Expo Go cannot receive the native scheme `com.westleysturhan.louisianafrench://`, and its `exp://127.0.0.1:8097/--/auth/callback` link is ignored because `resolveAuthRedirect` falls back to the native scheme here. So the real `adb ... VIEW` deep link did not reach the modal (Home just stayed in front). Instead a local patch passed the native recovery URL `...://auth/callback?type=recovery&code=fake` to Home's own link handler at start, and after 25 s dispatched `recoveryLinkOpened`.

Shots (`-lf` Louisiana French blue, `-kv` Kouri-Vini green):

- `c5d-01-home-lf`: real Home, no modal.
- `c5d-02-recovery-link-failed-<lf|kv>`: the fake recovery link against Dev. The exchange fails and Home opens the modal on Sign in with "Sign-in failed." This proves the link wiring (consumeAuthUrl event, Home opens the modal) end to end.
- `c5d-03-set-new-password-<lf|kv>`: Set a new password on Home after `recoveryLinkOpened` (no Close, backdrop does nothing).
- Opening the modal from the About menu showed the Sign in view on Home (seen in a UI dump, not saved as a shot).

Not driven: a real working recovery or confirm link (needs a live Dev token), Signed in on Home, Sign out on device. Those are covered by Jest in `homeAccountMachine.test.js`.

## Regression

Real Home, fresh install, no trigger: Home (`c5d-regression-01`), a lesson (`02`, New word then Practice), Home with Review and Mistakes controls (`03`, `04`: both are disabled on a fresh install, so tapping stayed on Home), Speech Hub (`05`), a wrong answer (`06`), a skip then Mistakes (`07`). Mistakes stayed "none pending" and Daily Review stayed empty in this short run, so Mistake Review and a due Daily Review were not opened. No crash or blank screen, no error lines in Metro logs. BACK from Home leaves Expo Go; that is the platform, not this change.

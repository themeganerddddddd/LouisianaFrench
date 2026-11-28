# BIO-65 C4d: Create account with Username, Confirm your email

The modal is not mounted on Home. `SHOW_ACCOUNT_MENU_ENTRY` stays false. Shots came from an uncommitted local harness on `emulator-5580` (`lf-api35`, Expo Go, run with the verify-app driver). The harness replaced the app root with a language switch and an **Open account** button, and used a stub connector (not Supabase). It was removed before this commit. `emulator-5554` was left alone. Shots are half size (1080x2400 to 540x1200). iOS was not driven.

The stub connector answers `taken...@` with "email taken", a password under 8 characters with "weak password", and anything else with "confirm your email". The set_username paths (session plus name, taken, empty name) are covered by the jest tests, not by these shots.

Board numbers are my reading of the ticket, since the mockups could not be opened: 3A is the empty Create view, 3B is the email-taken error, 3C is the weak-password error, 10 is Confirm your email, and 20A is Create with Continue with Google loading.

## Click path

1. Harness. Tap **Louisiana French** (blue) or **Kouri-Vini** (green). Tap **Open account**.
2. The Sign in view opens. Tap **Create account**. Shots `c4d-3A-create-lf.png` and `-kv.png`: Continue with Google, Username, Email, Password, the "At least 8 characters." hint, **Create account**, **Sign in**. There is no Display name.
3. Type `Elise_1`, `taken@x.com`, and `longenough1`, then tap **Create account**. "That email is already registered." shows under Email (3B).
4. On a fresh sheet type `ada@x.com` and `abc`, then tap **Create account**. The hint turns into the red error under Password (3C).
5. On a fresh sheet type `Elise_1`, `ada@x.com`, and `longenough1`, then tap **Create account**. **Confirm your email** opens (10).
6. On a fresh sheet tap **Continue with Google**. A spinner replaces the Google mark and Close is gone (20A).

## Regression

Same emulator, after the harness was removed and Metro restarted. No recording.

1. Tap **French, Louisiana French**. Home shows Day 1 and **Start your new lesson** (`c4d-regression-home.png`).
2. Start the lesson. Continue past **Bonjour!**, answer the match for Hello!, continue past **Comment ça va?**, tap **Skip** on the next match, then **Continue**. Back to Home. Mistakes reads "1 pending".
3. Tap **Review**. Daily Review says no review cards are due (`c4d-regression-review.png`). Back.
4. Tap **Mistakes, 1 pending**. Mistake Review shows 1 / 1 (`c4d-regression-mistakes.png`). Back.
5. Tap **Hub**. The Hub shows Record (`c4d-regression-speech.png`). Tap **Home**. Home is back.

No crash, blank screen, or stuck control.

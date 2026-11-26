# BIO-65 C4c — username step view

The modal is not mounted on Home. `SHOW_ACCOUNT_MENU_ENTRY` stays false. Shots came from an uncommitted local harness on `emulator-5580` (`lf-api35`, Expo Go). `emulator-5554` was left alone. The harness replaced the app root with a list of boards and was removed before this commit. No account row was used.

## Click path

1. Open the harness. It lists **Louisiana French**, **Kouri-Vini**, and boards 13A–15D.
2. Tap **Louisiana French**. The line under the buttons reads `cajun`.
3. Tap a board. The username step opens. **Close** returns to the list.
4. Tap **Kouri-Vini**. The line reads `kreole`. Repeat the boards. Close, Skip, and Save use the green accent.

13A is the empty step for a Google sign-in. 13C is the same empty step for email. 14A is that empty field again: the rules are shown and Save is disabled. 14B shows Checking… and Save stays enabled. 14C shows “Élise is available.” 14D shows only the rules. 15A is `lo` (“Use 3 to 20 characters.”). 15B is `logan!`. 15C is `marie` (“That username is taken.”). 15D is `admin` (“That username isn't available. Try another.”). Format and availability errors include an alert icon.

## Regression

Same emulator, after the harness was removed and the app was opened fresh. No clock change. No recording. iOS was not driven.

1. Tap **French, Louisiana French**. Home shows Day 1 and **Start your new lesson**.
2. Start the lesson. Continue past **Bonjour!**. On the match for Hello!, tap **Bonjour!** and **Check**. Continue past **Comment ça va?**. On the match for How’s it going?, tap **Skip**, then **Continue**. Back to Home.
3. Tap **Review**. Daily Review says “No review cards are due right now.” Back to Home.
4. Tap **Mistakes, 1 pending**. Mistake Review shows that match, 1 / 1.
5. Tap **Hub**. Advanced French Hub shows Phrase 1/212, **Bonjour!**, Play Audio, and Record. Tap **Home**. Home is back, still Day 1, with the same pending mistake.

No crash, blank screen, or stuck control.

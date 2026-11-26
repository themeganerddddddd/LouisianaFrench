# BIO-65 C4c follow-up — checking ring inside the field

The username step is not mounted on Home. `SHOW_ACCOUNT_MENU_ENTRY` stays false. The two 14B shots came from an uncommitted harness on `emulator-5580` (`lf-api35`, Expo Go). The harness is not in this commit. `emulator-5554` was left alone.

## Click path

1. The harness lists **Louisiana French**, **Kouri-Vini**, and **14B**. It opens 14B at once. The line under the buttons reads `cajun`.
2. The username field shows **Élise** with an 18px blue ring at the trailing edge. The line under the field is plain **Checking…**, with no spinner. **Save username** stays blue and enabled. The field keeps its normal border.
3. Tap **Close**. Tap **Kouri-Vini**. The line reads `kreole`. Tap **14B**. The ring is green. The helper and the enabled Save button are the same.

## Regression

Same emulator, after the harness was removed and the app was opened fresh. No clock change. No recording. iOS was not driven.

1. Tap **French, Louisiana French**. Home shows Day 1 and **Start your new lesson**.
2. Start the lesson. Continue past **Bonjour!**. On the match for Hello!, tap **Bonjour!** and **Check** (Correct, then Next Question). Continue past **Comment ça va?**. On the match for How’s it going?, tap **Skip**, then **Continue**. Back to Home.
3. Tap **Review**. Daily Review says “No review cards are due right now.” Back to Home.
4. Tap **Mistakes, 1 pending**. Mistake Review shows that match, 1 / 1. Back to Home.
5. Tap **Hub**. Advanced French Hub shows Phrase 1/212, **Bonjour!**, Play Audio, and Record. Tap **Home**. Home is back, still Day 1, with the same pending mistake.

No crash, blank screen, or stuck control. The account row is still absent.

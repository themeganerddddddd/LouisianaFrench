# BIO-65 C4a — account modal shots

Emulator `emulator-5580` only (`lf-api35`, Expo Go). `emulator-5554` was left alone. Shots are half size (1080×2400 → 540×1200).

`SHOW_ACCOUNT_MENU_ENTRY` stays false. The modal is not mounted on Home. These shots use a local harness that is not in this commit. The harness opened first, with a Louisiana French and a Kouri-Vini switch, then one button per sheet. Close returned to the list. Google loading has no Close, so the app was reopened for the next sheet.

Board names follow the review: 1B is the wrong password, 2A is Google loading, and 2B is the Kouri-Vini sign-in card. The Google failure is not a board number.

## Click path

1. Harness. Louisiana French is selected (accent `#2771CB`).
2. Tap **Sign in**. Blue Close, Continue with Google, Email, Password, Sign in, Forgot password.
3. Tap **Wrong password**. The password box is empty and red. The error is "That email or password is not right."
4. Tap **Google loading**. Close is gone. A spinner replaces the Google mark. Email, Password, Sign in, and Forgot password are faded.
5. Tap **Google failed**. "Google sign-in did not finish. Try again." sits above Continue with Google. The fields are open again.
6. Tap **Forgot**. Email only, then **Email me a link**, then **Back to sign in**. The 4A shots were taken again after that link was added.
7. Tap **Inbox**. **Check your inbox**, and the same reply for every address.
8. Switch to Kouri-Vini (accent `#08834C`) and repeat those sheets. Sign in, Email me a link, and Back to sign in are green.

## Regression

The harness was removed and the app was opened again on the same emulator. No account row was used.

1. Tap **French, Louisiana French**. Home shows Day 1, Review, Mistakes none pending, and **Start your new lesson**.
2. Start the lesson. Continue past **Bonjour!** / Hello!. On "Choose the match for 'Hello!'", tap **Bonjour!** and **Check**. Continue past **Comment ça va?**. Skip the next practice and Continue.
3. Leave the lesson. Two Back presses left Expo Go, so the app was reopened. Home still had the lesson progress.
4. Tap **Review**. Daily Review says "No review cards are due right now."
5. Tap **Mistakes, 1 pending**. Mistake Review shows "Choose the match for 'How’s it going?'", 1 / 1.
6. Tap **Hub**. Advanced French Hub shows Phrase 1/212, **Bonjour!**, Play Audio, and Record. Tap **Home**. Home is back.

No crash, blank screen, or stuck control on those paths. Recording was not started. The clock was not changed. iOS was not driven.

## Files

| File | What it shows |
| --- | --- |
| c4a-1a-sign-in-lf.png | 1A Sign in, Louisiana French |
| c4a-2b-sign-in-kv.png | 2B Sign in, Kouri-Vini |
| c4a-1b-wrong-password-lf.png | 1B Wrong password, Louisiana French |
| c4a-1b-wrong-password-kv.png | 1B Wrong password, Kouri-Vini |
| c4a-2a-google-loading-lf.png | 2A Google loading, Louisiana French |
| c4a-2a-google-loading-kv.png | 2A Google loading, Kouri-Vini |
| c4a-google-failed-lf.png | Google failure, Louisiana French |
| c4a-google-failed-kv.png | Google failure, Kouri-Vini |
| c4a-4a-forgot-lf.png | 4A Forgot, with Back to sign in, Louisiana French |
| c4a-4a-forgot-kv.png | 4A Forgot, with Back to sign in, Kouri-Vini |
| c4a-4b-inbox-lf.png | 4B Check your inbox, Louisiana French |
| c4a-4b-inbox-kv.png | 4B Check your inbox, Kouri-Vini |
| regression-home.png | Home after choosing Louisiana French |
| regression-review.png | Daily Review, nothing due |
| regression-mistakes.png | Mistake Review for the skipped practice |
| regression-speech.png | Advanced French Hub, first phrase |

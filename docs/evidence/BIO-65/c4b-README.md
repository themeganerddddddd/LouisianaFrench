# BIO-65 C4b — username step logic

No screen in this pull request. The red and green logs are the test evidence. The modal is not mounted, and `SHOW_ACCOUNT_MENU_ENTRY` stays false.

## Regression

Emulator `emulator-5580` only (`lf-api35`, Expo Go). `emulator-5554` was left alone. No harness. No account row was used.

1. Tap **French, Louisiana French**. Home shows Day 1 and **Start your new lesson**.
2. Start the lesson. Continue past **Bonjour!**. On "Choose the match for 'Hello!'", tap **Bonjour!** and **Check**. Continue past **Comment ça va?**. On "Choose the match for 'How’s it going?'", tap **Skip**, then **Continue**.
3. Back to Home. Tap **Review**. Daily Review says "No review cards are due right now."
4. Tap **Mistakes, 1 pending**. Mistake Review shows "Choose the match for 'How’s it going?'", 1 / 1. Back to Home.
5. Tap **Hub**. Advanced French Hub shows Phrase 1/212, **Bonjour!**, Play Audio, and Record. Tap **Home**. Home is back.

No crash, blank screen, or stuck control. Recording was not started. The clock was not changed. iOS was not driven.

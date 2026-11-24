# BIO-63 — shared account form controls

Emulator `emulator-5580` only (`lf-api35`, Expo Go). `emulator-5554` was left alone. Shots are half the emulator size (1080×2400 → 540×1200).

`SHOW_ACCOUNT_MENU_ENTRY` stays false. `SignInModal.js` was not opened. The five controls are not on a learner screen yet, so the control shots use a local harness that is not in this commit. Home shots are the real Home screen.

## Click path

1. Fresh install. Tap **French, Louisiana French**. Scroll Home to **Report a bug**.
2. Tap the language flag. Home shows **Kouri-Vini**. Scroll to **Report a bug**, then open Unit 11. The **Start** badges use the same start color.
3. Switch back to Louisiana French and open Unit 7. The **Start** badges are blue.
4. A local harness then shows Field, Primary, Secondary, Link, and Destructive for each Language, including loading, disabled, focus, and error.

## What the shots show

| File | What it shows |
| --- | --- |
| 01-home-report-bug-louisiana-french.png | Home, Louisiana French. **Report a bug** is blue `#2771CB`. |
| 02-home-report-bug-kouri-vini.png | Home, Kouri-Vini. **Report a bug** is green `#08834C`. |
| 03-home-start-badges-kouri-vini.png | Unit 11 lesson **Start** badges are green `#08834C`. |
| 04-home-start-badges-louisiana-french.png | Unit 7 lesson **Start** badges are blue `#2771CB`. |
| 05-controls-louisiana-french.png | Resting field, error field, primary idle, loading, and disabled. Accent `#2771CB`. |
| 06-controls-louisiana-french-more.png | Secondary, disabled secondary, link, destructive entry, and confirm. |
| 07-controls-kouri-vini.png | Same fields and primary states. Accent `#08834C`. |
| 08-controls-kouri-vini-more.png | Same remaining buttons. The link is green. Confirm stays red. |
| 09-controls-louisiana-french-focus.png | Email is focused: a blue ring. The error field below stays red. |
| 10-controls-kouri-vini-focus.png | Email is focused: a green ring. The error field stays red. |

Not verified: iOS. No account was created.

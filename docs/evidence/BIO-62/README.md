# BIO-62 — sign-in accent follows the Language

Emulator `emulator-5580` only (`lf-api35`, Expo Go). `emulator-5554` was left alone. Shots are half the emulator size (1080×2400 → 540×1200).

`SHOW_ACCOUNT_MENU_ENTRY` stays `false` in this branch. For these shots only, the Account row was turned on in the running checkout so the sign-in modal could be opened, then turned back off before commit.

Before shots are `main` at `c54367f`. The next commit on `main` (`fe6393f`) only adds verify-app recipes, so Home and the sign-in modal are the same code. After shots are this branch, fast-forwarded onto `fe6393f`.

## Click path

1. Fresh install. Tap **French, Louisiana French**. Home opens.
2. Tap the pelican (**About menu**), then **Account**. The sign-in modal opens.
3. Tap **Close sign in**. Tap the language flag. Home shows **Kouri-Vini**.
4. Tap the pelican, then **Account** again.

## What the shots show

| File | What it shows |
| --- | --- |
| before-home-louisiana-french.png | Home in Louisiana French, before. |
| before-modal-louisiana-french.png | Sign-in modal in Louisiana French. Button, links, and T-Boy bubble are blue `#2771CB`. |
| before-home-kouri-vini.png | Home in Kouri-Vini, before. |
| before-modal-kouri-vini.png | Same modal on Kouri-Vini, before. The button, links, and bubble stay blue `#2771CB`. |
| after-home-louisiana-french.png | Home in Louisiana French, after. |
| after-modal-louisiana-french.png | Sign-in modal in Louisiana French, after. Still `#2771CB`. |
| after-home-kouri-vini.png | Home in Kouri-Vini, after. |
| after-modal-kouri-vini.png | Sign-in modal in Kouri-Vini, after. Button, links, and bubble are green `#08834C`. |

Below the status bar, the Louisiana French Home, the Kouri-Vini Home, and the Louisiana French modal match pixel for pixel before and after. The Kouri-Vini modal is the only screen that changes: `#2771CB` drops out, and the button, links, and bubble use `#08834C`.

Not verified: iOS. No account was created, and the form was not submitted.

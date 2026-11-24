# BIO-70 — Account row in the Home menu

Emulator `emulator-5580` only (`lf-api35`, Expo Go). `emulator-5554` was left alone. Shots are half the emulator size (1080×2400 → 540×1200).

`SHOW_ACCOUNT_MENU_ENTRY` stays `false` in this commit. For these shots only, the flag was turned on in the running checkout, then turned back off before commit.

Home's connector identity has no username yet, so a signed-in row cannot be reached from sign-in. The Learner and 20-character shots used a local identity switch in that same uncommitted build: tapping the Account row moved from guest, to no username, to `Abcdefghij1234567890`. That switch was reverted and is not in this commit.

## Click path

1. Fresh install. Tap **French, Louisiana French**. Home opens.
2. Tap the pelican (**About menu**). The first row is a person icon and **Sign in or create one**.
3. Tap that row. It becomes an **L** and **Learner**.
4. Tap it again. It becomes an **A** and `Abcdefghij1234567890`. The last `0` wraps onto a second line and stays inside the card.
5. Dismiss the menu. Tap the language flag. Home shows **Kouri-Vini**.
6. Open the menu again and repeat the three rows. The avatar and the person icon follow the green accent.

## What the shots show

| File | What it shows |
| --- | --- |
| 01-guest-louisiana-french.png | Guest row, Louisiana French. |
| 02-learner-louisiana-french.png | No username: L and Learner, blue avatar. |
| 03-username-louisiana-french.png | 20-character name, blue avatar, both lines inside the card. |
| 01-guest-kouri-vini.png | Guest row, Kouri-Vini. |
| 02-learner-kouri-vini.png | No username: L and Learner, green avatar. |
| 03-username-kouri-vini.png | 20-character name, green avatar, both lines inside the card. |

Not verified: iOS. No Supabase account was created or signed in.

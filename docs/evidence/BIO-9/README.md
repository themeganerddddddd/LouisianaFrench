# BIO-9 — secondary verify-app recipes

Android only, emulator-5580 (`lf-api35`). Re-driven after merging main `30e0b835c9aae7b7427827624bb086db6c4f1e0a`. Shots are half the emulator size (540×1200). `lfv doctor` passed before each cold `lfv up`. `lfv down` ran after, and emulator-5580 was free. emulator-5554 was not used.

The day-2 run moved the clock with `adb root` and `adb shell date` on emulator-5580 only. It was restored with `settings put global auto_time 1` and `auto_time_zone 1`, then `$L open`. The emulator clock returned to the host date.

| File | What was clicked | What it shows |
| --- | --- | --- |
| home.png | Language choice, Louisiana French | Fresh Home |
| about-menu.png | `id:home-pelican` | About menu, About Us and Support |
| preface-01-summary.png | Unit 6 Part 1 | Preface summary |
| preface-02-details.png | `desc:Learn more` | Why are there several forms? |
| preface-03-after-close.png | `desc:Close preface` | Activity `1 / 10`, `ils sont` |
| preface-04-overlay-after-close.png | Back, then the same row | The preface overlay is back. Close did not mark it read |
| preface-05-after-start.png | `desc:Start lesson` on that overlay | Activity `1 / 10` and `Unit note` |
| preface-06-read-skipped.png | Back to Home, then the same row again | The Activity opens. The preface stays read |
| preface-07-unit-note.png | `desc:Unit note` | Reference mode, `Back to lesson` |
| dict-01-search-merci.png | Search `merci` | Three cards, not one |
| dict-03-speech-lf.png | `desc:Practice` on `avoir` | `id:speech-practice-hub` for that Word, with Back. Record was not tapped |
| dict-04-back-lf.png | `id:advanced-back-button` | French Dictionary still searching `avoir` |
| dict-06-speech-kv.png | `desc:Practice` on `Bonjou` | Advanced Kouri-Vini Hub, phrase Bonjou |
| unit-01-lesson-open.png | Unit 1 row Part 1 | Lesson `1 / 15`, Bonjour!, no preface |
| unit-02-later-lesson.png | Unit 1 row Part 2 | That Lesson opens. The row is not locked |
| unit-kv-lesson.png | Kouri-Vini Unit 1 Part 1 | `1 / 15`, Bonjou, no preface |
| day2-02-review-due.png | Home after Unit 6 Part 1 and a two-day clock move | `0 of 3 done`, `Start Daily Review · ~3 min` |
| day2-07-practice-speech.png | Daily Review finished, then Unit 1 Part 1 finished | `2 of 3 done`, button `Practice Speech` |
| day2-08-speech-scored.png | `Practice Speech` | `id:speech-practice-screen`, Attempt 1/5. Record and Stop were not tapped |
| day2-09-mistakes-pending.png | Skip the Part 2 typing Activity, then Home | `Fix 1 mistake` |
| day2-11-all-done.png | Correct `Ca va mal` on `id:mistake-review-screen`, Next Question | `3 of 3 done` |
| day2-12-all-done-reopen.png | `$L open` | The same all-done plan |
| day2-13-kv-still-day1.png | Language flag | Kouri-Vini is still Day 1 |
| bug-03-validation-keyboard-closed.png | Empty Submit, then Back | Name, Email, and Description are required |
| bug-06-consent.png | Filled Submit | Share device info? Accept & send was not tapped |

Not run: Accept & send. It would open a real mailto to louisianafrenchsupport@gmail.com.

Not verified: the full day-2 Lesson-and-clock path in Kouri-Vini. Stopping or re-tapping Record on Speech Practice (`id:speech-practice-stop` was not driven). iOS was not driven.

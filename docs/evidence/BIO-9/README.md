# BIO-9 — secondary verify-app recipes

Android only, emulator-5580 (`lf-api35`). Shots are half the emulator size (540×1200). Preface, Dictionary speech, the Unit list, and bug-report consent were driven on one cold `lfv up`. Day 2+ was a second cold `lfv up`. `lfv doctor` passed before driving. `lfv down` ran after. emulator-5554 was not used.

| File | What was clicked | What it shows |
| --- | --- | --- |
| preface-01-summary.png | Unit 6 Part 1, `Three ways to say ‘they are’` | Preface summary, terms, Learn more, Start lesson |
| preface-02-details.png | `desc:Learn more` | Why are there several forms? |
| preface-03-after-close.png | `desc:Close preface` | Activity `1 / 10`, `ils sont`. The note is not marked read |
| preface-05-after-start.png | `desc:Start lesson` | Same Activity, header `Unit note` |
| preface-06-read-skipped.png | The same row again | Activity opens. The preface stays read |
| preface-07-unit-note.png | `desc:Unit note` | Reference mode, `Back to lesson` |
| dict-01-search-merci.png | Search `merci` | Thank you, Merci Madame Boudreaux, and Merci beaucoup. Not one card |
| dict-03-speech-lf.png | `desc:Practice` on `avoir` | Advanced French Hub for that one Word, with Back |
| dict-04-back-lf.png | `id:advanced-back-button` | French Dictionary still searching `avoir` |
| dict-06-speech-kv.png | `desc:Practice` on `Bonjou` | Advanced Kouri-Vini Hub, phrase Bonjou |
| unit-01-lesson-open.png | Unit 1 row Part 1 | Lesson `1 / 15`, Bonjour!, no preface |
| unit-02-later-lesson.png | Unit 1 row Part 2 | That Lesson opens at `1 / 15`. The row is not locked |
| unit-kv-lesson.png | Kouri-Vini Unit 1 Part 1 | `1 / 15`, Bonjou, no preface |
| day2-02-review-due.png | Home after Unit 6 Part 1 and a two-day clock move | `0 of 3 done`, `Start Daily Review · ~3 min`, `Review, 7 due` |
| day2-07-practice-speech.png | Daily Review finished, then Unit 1 Part 1 finished | `2 of 3 done`, button `Practice Speech` |
| day2-08-speech-scored.png | `Practice Speech` | Attempt 1/5, Bonjour!, Home, no Back to Dictionary |
| day2-09-mistakes-pending.png | Skip the Part 2 typing Activity, then Home | `Fix 1 mistake`, step label Mistakes |
| day2-11-all-done.png | Correct `Ca va mal`, Next Question | `3 of 3 done`, All done with today's plan |
| day2-12-all-done-reopen.png | `$L open` | The same all-done plan |
| day2-13-kv-still-day1.png | Language flag | Kouri-Vini is still Day 1 |
| bug-03-validation-keyboard-closed.png | Empty Submit, then Back to close the keyboard | Name, Email, and Description are required |
| bug-06-consent.png | Filled Submit | Share device info? Accept & send was not tapped |

Not run: Accept & send. It would open a real mailto to louisianafrenchsupport@gmail.com.

Not verified: the full day-2 Lesson-and-clock path in Kouri-Vini. After the Louisiana French plan was all done, Kouri-Vini was still Day 1. iOS was not driven.

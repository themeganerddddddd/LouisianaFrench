# BIO-8 — primary verify-app recipes

emulator-5580 only (`lf-api35`). Driven on main `39a70358b1b72d19d659882c23051567ba0d68bf` after the session testIDs landed. Shots are half the emulator size.

| File | What was clicked | What it shows |
| --- | --- | --- |
| daily-review-day1-disabled.png | `id:home-review-control` on a fresh Day 1 Home | Home stays. Review does not open. |
| daily-review-empty.png | Review after one Practice answer, before the clock change | `id:daily-review-empty` |
| daily-review-active.png | Due Louisiana French card, `desc:Bonjour!`, Check answer | `Correct!` on Daily Review `1 / 1` |
| daily-review-session-complete.png | Next Question on that last card | Session Complete titled Daily Review |
| daily-review-kv.png | Due Kouri-Vini Listening card, `desc:Bonjou` | `Correct!` for Bonjou. It was not the first choice. |
| mistake-review-badge.png | Skip on the first Practice, then Home | `Mistakes, 1 pending` |
| mistake-review-open.png | `desc:Mistakes, 1 pending` | `id:mistake-review-screen`, `1 / 1` |
| mistake-review-cleared.png | Correct answer, Next Question, then `$L open` | `Mistakes, none pending` |
| mistake-review-kv.png | Skip the Kouri-Vini Listening Activity, then Mistakes | Mistake Review for Bonjou |
| speech-hub-lf.png | `id:home-hub-control` | Advanced French Hub, `id:speech-practice-record`, Phrase 1/212 |
| speech-hub-left.png | `id:advanced-home-button` | Home after leaving the idle Hub |
| speech-hub-kv.png | Language flag, then Hub | Advanced Kouri-Vini Hub, phrase Bonjou, Phrase 1/161 |
| lesson-complete-lf.png | All 15 Activities of the first Louisiana French Lesson, no Skip | Blue Session Complete, `id:lesson-complete-home` |
| lesson-complete-kv.png | All 15 Activities of the first Kouri-Vini Lesson | Green Session Complete |

Not verified: stopping a Speech Practice take. uiautomator cannot dump while the microphone is open, so `id:speech-practice-stop` cannot be tapped. Play my recording and Sounds good were not driven. Daily Speech Practice (`Practice Speech`) was not the plan button. On these Day 1 Homes it read `Start your new lesson`, or `Continue to lesson` after a Lesson was completed today. iOS was not driven.

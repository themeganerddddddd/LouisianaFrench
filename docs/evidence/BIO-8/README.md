# BIO-8 — primary verify-app recipes

emulator-5580 only (`lf-api35`). Each recipe started from a cold `lfv up`. Shots are half the emulator size.

| File | What was clicked | What it shows |
| --- | --- | --- |
| daily-review-day1-disabled.png | `id:home-review-control` on a fresh Day 1 Home | Home stays. Review does not open. |
| daily-review-empty.png | Review after one Practice answer, before the clock change | `No review cards are due right now.` |
| daily-review-active.png | Due Louisiana French card, `desc:Bonjour!`, Check answer | `Correct!` on Daily Review `1 / 1` |
| daily-review-session-complete.png | Next Question on that last card | Session Complete titled Daily Review |
| daily-review-kv.png | Due Kouri-Vini Listening card, `desc:Bonjou` | `Correct!` for Bonjou, not a Louisiana French choice |
| mistake-review-badge.png | Skip on the first Practice, then Home | `Mistakes, 1 pending` |
| mistake-review-open.png | `desc:Mistakes, 1 pending` | Mistake Review, `1 / 1`, no Skip |
| mistake-review-cleared.png | Correct answer, Next Question, then `$L open` | `Mistakes, none pending` |
| mistake-review-kv.png | Skip the Kouri-Vini Listening Activity, then Mistakes | Mistake Review for Bonjou |
| speech-hub-lf.png | `id:home-hub-control` | Advanced French Hub, Phrase 1/212, Record |
| speech-hub-recorded.png | Only this time, stop `text:Record`, Play my recording, Sounds good | Phrase 2/212 |
| speech-hub-kv.png | Same cycle after the language flag | Advanced Kouri-Vini Hub, Phrase 2/161 |
| lesson-complete-lf.png | All 15 Activities of the first Louisiana French Lesson, no Skip | Blue Session Complete, 150 XP, 0 mistakes |
| lesson-complete-kv.png | All 15 Activities of the first Kouri-Vini Lesson | Green Session Complete for Greetings & Check-ins |

Not verified: Daily Speech Practice (`Practice Speech` on Today's plan). On these Day 1 Homes, `id:home-plan-cta` read `Start your new lesson` or, after a Lesson was completed today, `Continue to lesson`.

`speech-hub-recorded.png` and `speech-hub-kv.png` were stopped with a driver fallback that this branch no longer has. Stopping a take does not work with current `lfv`. Those two shots are not proof of a stop step.

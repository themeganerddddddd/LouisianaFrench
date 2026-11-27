# BIO-66 C5a evidence

C5a has no UI change. It changes the account connector, `authLink`, and removes the web auth call from `App.js`. `App.js` is classed as a UI file by the evidence gate, so this run shows the app still boots and the core flows still work.

Platform: Android, emulator-5580 (`lf-api35`), Expo Go, Metro on this branch, driven with `lfv` from a fresh install.

## Click path and results

| # | Step | Result | Shot |
| -- | -- | -- | -- |
| 1 | Boot with the new `App.js` (no `completeWebAuth`), choose Louisiana French | Home loads, no red screen | `c5a-regression-01-home-lf.png` |
| 2 | Tap "Start your new lesson" | Lesson 1 / 15 opens, New word | `c5a-regression-02-lesson-lf.png` |
| 3 | Continue, then Skip the next Activity, Continue | Activity 2 / 15 shown, skip accepted | `c5a-regression-03-lesson-activity-lf.png` |
| 4 | Back to Home | Mistakes badge reads "1 pending" | `c5a-regression-04-home-mistake-pending.png` |
| 5 | Tap Mistakes | Mistake Review opens | `c5a-regression-05-mistakes-lf.png` |
| 6 | Tap Review | Daily Review opens, empty queue ("No review cards are due right now.") | `c5a-regression-06-review-tap-lf.png` |
| 7 | Tap Hub | Speech Practice Hub opens | `c5a-regression-07-speech-hub-lf.png` |
| 8 | Switch Language with the flag | Kouri-Vini Home | `c5a-regression-08-home-kv.png` |

## Not covered

- Daily Review with a due Card needs the day-2 clock move and a completed Lesson. Not run here. Only the empty-queue screen was reached.
- Speech Practice was opened at the Hub only. Recording was not driven.
- No sign-in or link flow was driven: the modal is not mounted until C5d. The link behaviour is covered by the connector unit tests.
- The Dev `?type=recovery` check is pending, see `c5a-dev-recovery.md`.

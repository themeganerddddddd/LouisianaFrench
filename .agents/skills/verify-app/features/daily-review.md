# Daily Review

Daily Review is the learner session of Cards that are due now, with missed Cards first. Home enables Review once the learner has learned a Word, or from day 2 on. A fresh Day 1 install leaves Review disabled.

## Sub-features

- `daily-review-day1-disabled` — fresh Day 1, no learned Words: the Review control is disabled and a tap stays on Home.
- `daily-review-empty` — Review is enabled and no Cards are due. The empty screen offers Back to Home.
- `daily-review-session` — at least one due Card. Answer one Activity, then finish or leave.
- `daily-review-kv` — the same enable and one-answer path in Kouri-Vini. The Catalog prompts differ.

## How to get to it (user POV)

- Home: tap Review (`id:home-review-control`) when it is enabled.
- Home, day 2+: tap Today's plan when the button reads `Start Daily Review · ~N min` (`id:home-plan-cta`). That button is the active step only after a Lesson was completed on an earlier day and Review is the first unfinished step. This recipe uses the Review control. It does not treat the plan button as verified.

## Driving it with lfv

Preconditions:

- Cold `$L up` (fresh install). `$L doctor` exits 0.
- Choose Louisiana French (`language-select.md`) unless the step says Kouri-Vini.
- A correct Lesson answer schedules the Card at least one day ahead (`nextReviewAt`). Cards are not due on the same calendar moment they were answered. Advance the emulator clock before the active session. Use `emulator-5580` only.

- **Day 1 disabled.** Run `$L wait id:home-scroll` and `$L dump`. Home shows `id:home-plan-status` `text:Day 1`, helper `text:Reviews unlock once you've learned new words.`, and `id:home-review-control` with `desc:Review`. `id:home-dictionary-control` and `id:home-hub-control` are enabled. `id:home-mistakes-control` reads `desc:Mistakes, none pending` and is disabled. Run `$L tap id:home-review-control`, then `$L wait id:home-scroll 5` and `$L dump`. Home is still showing: `text:Louisiana French`, `text:Day 1`, and no `text:Daily Review`. Run `$L shot daily-review-day1-disabled`.
- **Enabled, empty queue.** Run `$L tap id:home-plan-cta` and `$L wait id:lesson-activity-shell`. Pass the New-word Activity with `$L tap 'text:Continue'`. On the Practice Activity, `$L dump`, tap the `desc:` of the answer (Louisiana French Activity 2: `desc:Bonjour!`), `$L tap 'desc:Check answer'`, then `$L tap 'text:Next Question'`. Run `$L key BACK` until `id:home-scroll` is back. Run `$L dump`. Review is enabled (`desc:Review` or `desc:Review, N due`). Run `$L tap id:home-review-control` and `$L wait id:daily-review-empty`. `id:daily-review-screen` is also present. The screen shows `text:Daily Review` and `text:No review cards are due right now.` Run `$L shot daily-review-empty`. Run `$L tap id:daily-review-home` and `$L wait id:home-scroll`.
- **Kouri-Vini, still before the clock change.** This Language has its own Learner Progress, so Review is disabled again. Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. `$L dump` shows `desc:Review` and the Day 1 helper. Run `$L tap id:home-review-control` and `$L wait id:home-scroll 5`. Home stays. Run `$L tap id:home-plan-cta`. Activity 1 is the New word `text:Bonjou`. `$L tap 'text:Continue'`. Activity 2 is Listening. `$L tap 'desc:Bonjou'`, `$L tap 'desc:Check answer'`, `$L tap 'text:Next Question'`. `$L key BACK` to Home. `$L tap id:home-review-control` and `$L wait id:daily-review-empty`. Empty copy is the same English (`text:No review cards are due right now.`). `$L tap id:daily-review-home`.
- **Active session.** Move the emulator clock forward two days so both Languages' scheduled Cards are due:

  ```bash
  adb -s emulator-5580 shell date $(date -d '+2 days' +%m%d%H%M%Y.%S)
  ```

  If the shell reports permission denied, run `adb -s emulator-5580 root`, set the date again, then `adb -s emulator-5580 reverse tcp:8097 tcp:8097` (root restarts adbd and drops the reverse). `adb root` and `adb shell date` are emulator-only. Run `$L open` and `$L wait id:home-scroll`. When this recipe ends, or if a step after the clock change fails, restore the clock with the Emulator clock step in `README.md` before `$L down`. Switch to Louisiana French if Home opened on Kouri-Vini (`id:home-language-flag`). `$L dump` should show `desc:Review, 1 due` (or a higher count if more Practice Activities were answered). Run `$L tap id:home-review-control` and `$L wait id:daily-review-screen`. `id:daily-review-empty` is absent. The header is `text:Daily Review`, with `text:Cards due now, with missed Cards first.` and a progress count such as `text:1 / 1`. `$L dump`, tap the answer `desc:` (the choice label, not a `choice-N` id), then `$L tap 'desc:Check answer'`. While `text:Correct!` is showing, run `$L shot daily-review-active`. Run `$L tap 'text:Next Question'`. On the last Card, `$L wait id:lesson-complete-screen` and `$L shot daily-review-session-complete`. Leave with `$L tap id:lesson-complete-home` and `$L wait id:home-scroll`.
- **Kouri-Vini due Card.** Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. `$L dump` shows that Language's due count. Run `$L tap id:home-review-control` and `$L wait id:daily-review-screen`. The Activity is Kouri-Vini (`desc:Bonjou`, or whatever `$L dump` shows — do not reuse a Louisiana French choice, and do not tap by `choice-N`). Answer it with `desc:Check answer`. Run `$L shot daily-review-kv`. On the last Card, `$L tap 'text:Next Question'`, `$L wait id:lesson-complete-screen`, and `$L tap id:lesson-complete-home`.
- **Plan button.** After the clock advance, `$L dump` `id:home-plan-cta`. On this path the button is still a Lesson. With no Lesson completed today it reads `Start your new lesson`. After a Lesson is completed today it reads `Continue to lesson`. It does not read `Start Daily Review`, because no Lesson was completed on an earlier day. Do not mark that plan step verified. Do not mark `Start Daily Review` verified.

## Gotchas

- `reviewEnabled` is `!firstDay || learnedWords > 0`. Day 1 with no learned Word disables Review. Dictionary and Hub stay enabled. Mistakes stays disabled until a Mistake is pending.
- An enabled Review with nothing due still reads `desc:Review`. The same label is the disabled control. The tap is the proof: disabled stays on Home, enabled opens `text:Daily Review`. The Day 1 helper stays on screen after a Word is learned. `id:home-plan-status` stays `text:Day 1` until a Lesson was completed on an earlier day, even after the clock moves.
- Intro Activities are not Cards in the Daily Review queue. A New-word Continue learns the Word (Review turns on) but does not by itself create a due Card. Answer one Practice Activity.
- `id:daily-review-screen` is on both the empty queue and an active session. `id:daily-review-empty` is only the empty queue. `id:daily-review-home` leaves the empty queue.
- Answer choices must be found by their label text, never by position or index, because option order may shuffle.
- One day on the clock can fall on the same minute as `nextReviewAt` and leave the Card not due. Two days is the step above.
- The last due Card opens Lesson Complete with the title Daily Review (`lesson-complete.md`).
